/**
 * The offline app shell worker (METRO-106, ADR-0023). All logic is here with the cache, the network and the
 * clock injected, so it is tested without a browser; `sw.ts` binds it to the real worker scope. It caches the
 * app's own static files and nothing else: never `/api/*`, never another origin, and a key is always a path
 * without its query string, so a position or place text can never be stored.
 */

import { SKIP_WAITING } from "./message";

export const CACHE_PREFIX = "metro-shell-";
/** The cached page for every navigation: the app is one screen at every path (AppRoutes). */
const SHELL_KEY = "/";
const NETWORK_WAIT_MS = 3000;

export interface WorkerConfig {
  /** Derived from the content of every precached file at build time. */
  readonly version: string;
  /** Paths of the shell: "/" first, then every built and public file. */
  readonly precache: readonly string[];
  /** A worker that deletes its caches and unregisters itself (the kill switch, ADR-0023). */
  readonly kill: boolean;
}

export interface CacheLike {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
}
export interface CachesLike {
  open(name: string): Promise<CacheLike>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}
type Fetcher = (input: string | Request, init?: RequestInit) => Promise<Response>;
type Wait = (task: () => void, ms: number) => void;

export interface Deps {
  readonly caches: CachesLike;
  readonly fetch: Fetcher;
  readonly wait: Wait;
  readonly origin: string;
  readonly config: WorkerConfig;
}

export interface ClientLike {
  readonly url: string;
  navigate(url: string): Promise<unknown>;
}
export interface WorkerScope {
  readonly caches: CachesLike;
  readonly fetch: Fetcher;
  readonly location: { readonly origin: string };
  readonly registration: { unregister(): Promise<boolean> };
  readonly clients: {
    claim(): Promise<void>;
    matchAll(options: { type: "window" }): Promise<readonly ClientLike[]>;
  };
  skipWaiting(): Promise<void>;
  setTimeout: Wait;
  addEventListener(type: string, listener: (event: never) => void): void;
}
interface WaitEvent {
  waitUntil(work: Promise<unknown>): void;
}
interface FetchEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}
interface MessageEvent {
  readonly data: unknown;
}

export const cacheName = (config: WorkerConfig): string => `${CACHE_PREFIX}${config.version}`;

export type Route = "navigate" | "cache-first" | "pass";

/** What to do with a request. Anything but a same-origin GET for the shell is left to the browser untouched. */
export function route(
  request: Pick<Request, "method" | "mode" | "url">,
  origin: string,
  precache: ReadonlySet<string>,
): Route {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method !== "GET" || url.origin !== origin) return "pass";
  if (path === "/api" || path.startsWith("/api/") || path === "/sw.js") return "pass";
  if (request.mode === "navigate") return "navigate";
  return path.startsWith("/assets/") || precache.has(path) ? "cache-first" : "pass";
}

const isHtml = (response: Response): boolean =>
  (response.headers.get("content-type") ?? "").toLowerCase().startsWith("text/html");

/** Fetches one shell file for the cache; throws unless it is a plain 200 of the right kind. */
async function fetchShellFile(deps: Deps, path: string): Promise<Response> {
  // Hashed files may come from the HTTP cache; the unhashed ones must be fresh or a version could mix.
  const cache = path.startsWith("/assets/") ? "default" : "reload";
  const response = await deps.fetch(path, { cache, credentials: "same-origin" });
  if (response.status !== 200 || isHtml(response) !== (path === SHELL_KEY)) {
    throw new Error("shell file not cacheable");
  }
  return response;
}

/** Installs the shell into this version's cache. Rejecting fails the install, so the old worker stays. */
export async function installShell(deps: Deps): Promise<void> {
  const cache = await deps.caches.open(cacheName(deps.config));
  await Promise.all(
    deps.config.precache.map(async (path) => cache.put(path, await fetchShellFile(deps, path))),
  );
}

/** Deletes the caches of every other version (or all of them, for the kill switch). */
export async function dropCaches(deps: Deps, keepCurrent: boolean): Promise<void> {
  const keep = keepCurrent ? cacheName(deps.config) : null;
  const names = await deps.caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== keep)
      .map(async (name) => deps.caches.delete(name)),
  );
}

/**
 * Network first, so an online visit always gets the current page. When the network fails, answers 5xx or
 * takes more than 3 s, the page of this version is served if the cache has it. The cache is never refreshed
 * from the network here: a newer page cached under an older version's assets could not work offline.
 */
export async function navigate(deps: Deps, request: Request): Promise<Response> {
  const cache = await deps.caches.open(cacheName(deps.config));
  const shell = async (): Promise<Response | undefined> => cache.match(SHELL_KEY);
  const network = deps.fetch(request);
  const timeout = new Promise<null>((resolve) => {
    deps.wait(() => {
      resolve(null);
    }, NETWORK_WAIT_MS);
  });
  try {
    const first = await Promise.race([network, timeout]);
    if (first === null) return (await shell()) ?? (await network);
    return first.status >= 500 ? ((await shell()) ?? first) : first;
  } catch (error) {
    const cached = await shell();
    if (cached === undefined) throw error;
    return cached;
  }
}

/** Cache first for hashed and precached files; a miss under /assets/ is stored when it is a plain 200. */
export async function cacheFirst(deps: Deps, request: Request): Promise<Response> {
  const cache = await deps.caches.open(cacheName(deps.config));
  const key = new URL(request.url).pathname;
  const hit = await cache.match(key);
  if (hit !== undefined) return hit;
  const response = await deps.fetch(request);
  if (key.startsWith("/assets/") && response.status === 200 && !isHtml(response)) {
    await cache.put(key, response.clone());
  }
  return response;
}

/** The kill switch: no caches, no registration, and open pages reload without a worker. */
async function retire(scope: WorkerScope, deps: Deps): Promise<void> {
  await dropCaches(deps, false);
  await scope.registration.unregister();
  const pages = await scope.clients.matchAll({ type: "window" });
  await Promise.all(pages.map(async (page) => page.navigate(page.url)));
}

/** Binds the logic to a worker scope. The kill-switch worker has no fetch handler at all. */
export function attach(scope: WorkerScope, config: WorkerConfig): void {
  const deps: Deps = {
    caches: scope.caches,
    // Called as a method of the scope: a detached `fetch` throws "Illegal invocation" in a browser.
    fetch: async (input, init) => scope.fetch(input, init),
    wait: (task, ms) => {
      scope.setTimeout(task, ms);
    },
    origin: scope.location.origin,
    config,
  };
  const shell = new Set(config.precache);
  scope.addEventListener("install", (event: WaitEvent) => {
    event.waitUntil(config.kill ? scope.skipWaiting() : installShell(deps));
  });
  scope.addEventListener("activate", (event: WaitEvent) => {
    event.waitUntil(
      config.kill
        ? retire(scope, deps)
        : Promise.all([dropCaches(deps, true), scope.clients.claim()]),
    );
  });
  if (config.kill) return;
  scope.addEventListener("fetch", (event: FetchEvent) => {
    const kind = route(event.request, deps.origin, shell);
    if (kind === "navigate") event.respondWith(navigate(deps, event.request));
    else if (kind === "cache-first") event.respondWith(cacheFirst(deps, event.request));
  });
  // Only the page's "update now" press may end the wait, and only with exactly this message.
  scope.addEventListener("message", (event: MessageEvent) => {
    const data = event.data;
    if (typeof data === "object" && data !== null && "type" in data && data.type === SKIP_WAITING) {
      void scope.skipWaiting();
    }
  });
}

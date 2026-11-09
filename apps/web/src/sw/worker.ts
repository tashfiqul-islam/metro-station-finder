/**
 * The offline app shell worker (METRO-106, ADR-0024). All logic is here with the cache, the network and the
 * clock injected, so it is tested without a browser; `sw.ts` binds it to the real worker scope. It caches the
 * app's own static files and nothing else: never `/api/*`, never another origin, and a key is always a path
 * without its query string, so a position or place text can never be stored.
 */

import { SKIP_WAITING } from "./message";

export const CACHE_PREFIX = "metro-shell-";
/** The cached page for every navigation to a page path: the app is one screen at every path (AppRoutes). */
const SHELL_KEY = "/";
/** Written into every cache: when its install finished, so the newest older cache can be kept. */
const META_KEY = "/__shell-meta";
const NETWORK_WAIT_MS = 3000;

export interface WorkerConfig {
  /** Derived from the content of every precached file and of this worker's own bytes at build time. */
  readonly version: string;
  /** Paths of the shell: "/" first, then every built and public file. */
  readonly precache: readonly string[];
  /** A worker that deletes its caches and unregisters itself (the kill switch, ADR-0024). */
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
  readonly now: () => number;
  /** True when the person asked the browser to save data: the shell is not precached then. */
  readonly saveData: () => boolean;
  readonly origin: string;
  readonly config: WorkerConfig;
}

export interface WorkerScope {
  readonly caches: CachesLike;
  readonly fetch: Fetcher;
  readonly location: { readonly origin: string };
  readonly navigator?: { readonly connection?: { readonly saveData?: boolean } };
  readonly registration: { unregister(): Promise<boolean> };
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  setTimeout: Wait;
  addEventListener(type: string, listener: (event: never) => void): void;
}
interface WaitEvent {
  waitUntil(work: Promise<unknown>): void;
}
/** The install event where the Service Worker static routing API exists (Chromium; other engines may lack it). */
interface InstallEvent extends WaitEvent {
  addRoutes?(rules: unknown): Promise<void>;
}
interface FetchEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}
interface MessageEvent {
  readonly data: unknown;
}

export const cacheName = (config: WorkerConfig): string => `${CACHE_PREFIX}${config.version}`;

export type Route = "navigate" | "network-first" | "cache-first" | "pass";

/** A path the single-page app answers (no file extension). `/licenses.txt` and `/robots.txt` are not pages. */
export const isPagePath = (path: string): boolean => !/\.[A-Za-z0-9]+$/u.test(path);

/**
 * What to do with a request. Anything but a same-origin GET for the shell is left to the browser untouched.
 * Unhashed precached files are network first (a stale copy next to a newer page could mix versions); hashed
 * files under /assets/ are cache first.
 */
export function route(
  request: Pick<Request, "method" | "mode" | "url">,
  origin: string,
  precache: ReadonlySet<string>,
): Route {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method !== "GET" || url.origin !== origin) return "pass";
  if (path === "/api" || path.startsWith("/api/") || path === "/sw.js") return "pass";
  if (request.mode === "navigate" && isPagePath(path)) return "navigate";
  if (path.startsWith("/assets/")) return "cache-first";
  return precache.has(path) ? "network-first" : "pass";
}

const isHtml = (response: Response): boolean =>
  (response.headers.get("content-type") ?? "").toLowerCase().startsWith("text/html");

/** Fetches one shell file for the cache; throws unless it is a plain 200 of the right kind. */
async function fetchShellFile(deps: Deps, path: string): Promise<Response> {
  // Hashed files may come from the HTTP cache; the unhashed ones must be fresh or a version could mix.
  const cache = path.startsWith("/assets/") ? "default" : "reload";
  const response = await deps.fetch(path, { cache, credentials: "same-origin" });
  // A redirected response cannot answer a navigation (Chrome refuses it), so it must not be stored as the shell.
  if (response.status !== 200 || response.redirected || isHtml(response) !== (path === SHELL_KEY)) {
    throw new Error("shell file not cacheable");
  }
  return response;
}

/** Names of the shell caches that exist now, this version's first. Never creates one. */
async function shellCaches(deps: Deps): Promise<string[]> {
  const current = cacheName(deps.config);
  const names = (await deps.caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX));
  return [...names.filter((name) => name === current), ...names.filter((name) => name !== current)];
}

/** First hit for a key in this version's cache, then in the kept older one. An evicted cache is not recreated. */
async function lookup(deps: Deps, key: string): Promise<Response | undefined> {
  const names = await shellCaches(deps);
  const hits = await Promise.all(
    names.map(async (name) => (await deps.caches.open(name)).match(key)),
  );
  return hits.find((hit) => hit !== undefined);
}

/**
 * Installs the shell into this version's cache. Rejecting fails the install, so the old worker stays. With
 * Data Saver on nothing is fetched: the app still works online, and offline use waits for the next visit
 * without it.
 */
export async function installShell(deps: Deps): Promise<void> {
  if (deps.saveData()) return;
  const name = cacheName(deps.config);
  // A cache that was already there belongs to a worker that may be live: a failed install must not delete it.
  const existed = (await deps.caches.keys()).includes(name);
  const cache = await deps.caches.open(name);
  // Every file settles before the verdict, so no put is still running when a failed cache is deleted.
  const results = await Promise.allSettled([
    ...deps.config.precache.map(async (path) => cache.put(path, await fetchShellFile(deps, path))),
    cache.put(META_KEY, new Response(String(deps.now()))),
  ]);
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure !== undefined) {
    // A half-filled cache would be served as this version if the same worker installed again.
    if (!existed) await deps.caches.delete(name);
    throw failure.reason instanceof Error ? failure.reason : new Error("shell file not cacheable");
  }
}

/** When a cache was installed; 0 when it cannot tell (no marker, not a number). */
async function installedAt(deps: Deps, name: string): Promise<number> {
  const marker = await (await deps.caches.open(name)).match(META_KEY);
  const value = marker === undefined ? 0 : Number(await marker.text());
  return Number.isFinite(value) ? value : 0;
}

/**
 * Activation: keeps this version's cache and the newest older one (a tab still running the older page needs
 * its lazy files), deletes the rest. The kill switch deletes every shell cache.
 */
export async function dropCaches(deps: Deps, kill: boolean): Promise<void> {
  const others = (await shellCaches(deps)).filter((name) => name !== cacheName(deps.config));
  let keep: string | null = null;
  if (!kill && others.length > 0) {
    const stamped = await Promise.all(
      others.map(async (name) => ({ name, at: await installedAt(deps, name) })),
    );
    keep = stamped.reduce((best, item) => (item.at > best.at ? item : best)).name;
  }
  await Promise.all(
    [...others, ...(kill ? [cacheName(deps.config)] : [])]
      .filter((name) => name !== keep)
      .map(async (name) => deps.caches.delete(name)),
  );
}

/**
 * Network first, so an online visit gets the current file. When the network fails, answers 5xx or takes more
 * than 3 s, the copy of this version (or of the kept older one) is served if there is one; so a slow network
 * can show the cached page. Nothing is written here: a newer file stored under older assets could not work
 * offline.
 */
export async function networkFirst(deps: Deps, request: Request, key: string): Promise<Response> {
  const network = deps.fetch(request);
  const timeout = new Promise<null>((resolve) => {
    deps.wait(() => {
      resolve(null);
    }, NETWORK_WAIT_MS);
  });
  try {
    const first = await Promise.race([network, timeout]);
    if (first === null) return (await lookup(deps, key)) ?? (await network);
    return first.status >= 500 ? ((await lookup(deps, key)) ?? first) : first;
  } catch (error) {
    const cached = await lookup(deps, key);
    if (cached === undefined) throw error;
    return cached;
  }
}

/** A response worth keeping: a plain, unredirected 200 from this origin that is not an HTML fallback. */
const storable = (response: Response): boolean =>
  response.status === 200 && response.type === "basic" && !response.redirected && !isHtml(response);

/** Cache first for hashed files; a miss under /assets/ is stored if it is storable. Storing never fails the answer. */
export async function cacheFirst(deps: Deps, request: Request): Promise<Response> {
  const key = new URL(request.url).pathname;
  const hit = await lookup(deps, key);
  if (hit !== undefined) return hit;
  const response = await deps.fetch(request);
  if (key.startsWith("/assets/") && storable(response)) {
    try {
      const [current] = await shellCaches(deps);
      if (current === cacheName(deps.config)) {
        await (await deps.caches.open(current)).put(key, response.clone());
      }
    } catch {
      // Full storage (QuotaExceededError) or a cache that went away: the network answer is still good.
    }
  }
  return response;
}

/**
 * Sends `/api/*` straight to the network, with no fetch event and so no worker start, where the browser has the
 * static routing API. The worker leaves those requests alone anyway (`route`), but each one still woke it: the
 * web-vitals beacon sent on a person's first input reached a worker Chromium was stopping for a takeover, which
 * restarted it, and the waiting worker then stayed waiting (Repo-verified, docs/evidence/metro-125.md). A browser
 * without the API, or a refused rule, keeps the old behaviour: the fetch handler passes the request through.
 */
async function routeApiToNetwork(event: InstallEvent): Promise<void> {
  try {
    await event.addRoutes?.({ condition: { urlPattern: "/api/*" }, source: "network" });
  } catch {
    // Unsupported or refused: the install must not fail over an optimisation.
  }
}

/**
 * The kill switch: no caches, no registration. Open pages are not reloaded: every page registers `/sw.js` again
 * after load, so a reload would loop for as long as the kill build is deployed.
 */
async function retire(scope: WorkerScope, deps: Deps): Promise<void> {
  await dropCaches(deps, true);
  await scope.registration.unregister();
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
    now: () => Date.now(),
    saveData: () => scope.navigator?.connection?.saveData === true,
    origin: scope.location.origin,
    config,
  };
  const shell = new Set(config.precache);
  scope.addEventListener("install", (event: InstallEvent) => {
    event.waitUntil(
      config.kill
        ? scope.skipWaiting()
        : Promise.all([installShell(deps), routeApiToNetwork(event)]),
    );
  });
  scope.addEventListener("activate", (event: WaitEvent) => {
    event.waitUntil(
      config.kill
        ? retire(scope, deps)
        : Promise.all([dropCaches(deps, false), scope.clients.claim()]),
    );
  });
  if (config.kill) return;
  scope.addEventListener("fetch", (event: FetchEvent) => {
    const kind = route(event.request, deps.origin, shell);
    const path = new URL(event.request.url).pathname;
    if (kind === "navigate") event.respondWith(networkFirst(deps, event.request, SHELL_KEY));
    else if (kind === "network-first") event.respondWith(networkFirst(deps, event.request, path));
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

import { readFileSync, readdirSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join } from "node:path";

import type { BrowserContext, Locator, Page } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { installMapsStub, plainSearch } from "./maps-stub";

/**
 * METRO-106 (ADR-0023): the offline app shell, in the real build. The first group runs against the same
 * server as every journey (Worker, `_headers`, the enforced CSP); the update group runs against a small
 * static server over the same `dist/client` so a second "deploy" can be swapped in. No Google request is
 * made: `installMapsStub` answers or aborts them, and the worker never intercepts another origin.
 */
test.use({ serviceWorkers: "allow" });

/**
 * Playwright's route stubs are not applied to a page that a worker controls in every browser (WebKit let the
 * real Maps script through during development of this spec), so nothing here may provoke a request to another
 * origin, and every test fails if one is seen.
 */
const leftTheMachine = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const seen: string[] = [];
  leftTheMachine.set(page, seen);
  page.on("request", (request) => {
    if (!/^(http:\/\/127\.0\.0\.1:|data:|blob:|about:)/u.test(request.url()))
      seen.push(request.url());
  });
});
test.afterEach(({ page }) => {
  expect(leftTheMachine.get(page), "requests to other origins").toEqual([]);
});

const MAP_NAME = "Schematic map of MRT Line 6";
const CACHE_PREFIX = "metro-shell-";
const DIST = "apps/web/dist/client";

/**
 * Playwright's `setOffline` makes Firefox fail every navigation with NS_ERROR_OFFLINE before the worker can
 * answer it (Repo-verified: `page.reload()` and `page.goto()` both throw it with a controlled page). So the
 * tests that need that exact mechanism skip Firefox, and the static-server group below covers Firefox by
 * stopping the server instead: the same worker code path, a refused connection instead of an offline flag.
 */
const FIREFOX_OFFLINE =
  "Firefox: setOffline fails navigations with NS_ERROR_OFFLINE; see the static-server group";

const combo = (page: Page): Locator => page.getByRole("combobox", { name: "Or pick a station" });

async function open(page: Page, base = ""): Promise<void> {
  await installMapsStub(page);
  await page.goto(`${base}/`);
  await expect(page.getByRole("application", { name: MAP_NAME, exact: true })).toBeVisible();
  await expect(combo(page)).toBeVisible();
}

/** Registration waits for load and idle: wait until a worker controls the page and its cache holds the page. */
async function shellReady(page: Page, versions = 1): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          async ({ prefix, count }) => {
            const registration = await navigator.serviceWorker.getRegistration();
            if (
              (registration?.active ?? null) === null ||
              navigator.serviceWorker.controller === null
            ) {
              return "no controller";
            }
            const names = (await caches.keys()).filter((name) => name.startsWith(prefix));
            if (names.length !== count) return `caches: ${names.length}`;
            const cache = await caches.open(names[0] ?? "");
            return (await cache.match("/")) === undefined ? "no page" : "ready";
          },
          { prefix: CACHE_PREFIX, count: versions },
        ),
      { timeout: 20_000 },
    )
    .toBe("ready");
}

const cacheNames = (page: Page): Promise<string[]> =>
  page.evaluate(
    async (prefix) => (await caches.keys()).filter((name) => name.startsWith(prefix)).toSorted(),
    CACHE_PREFIX,
  );

/** After the network is gone and the page reloaded: picker, map, fares, line list, notice and no outside request. */
async function offlineJourney(page: Page, reportsOffline: boolean): Promise<void> {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.reload();
  await expect(page.getByRole("application", { name: MAP_NAME, exact: true })).toBeVisible();
  await expect(combo(page)).toBeVisible();
  // Picker, result with fares, and the highlight on the schematic map.
  await combo(page).fill("karwan");
  await combo(page).press("Enter");
  const result = page.getByRole("article");
  await expect(result.getByRole("heading", { level: 2, name: "Karwan Bazar" })).toBeFocused();
  await expect(result).toContainText("৳20");
  await expect(result).toContainText("৳80");
  await expect(page.locator("svg.map .map__pin--hl")).toHaveCount(1);
  // The line list: every station.
  await combo(page).fill("Sadarghat");
  await page.getByRole("button", { name: "Browse all 16 stations" }).click();
  await expect(page.getByRole("listbox", { name: "Stations" }).getByRole("option")).toHaveCount(16);
  await page.keyboard.press("Escape");
  // Place search is replaced by the notice; no field, so no place text can be typed or sent. Only where the
  // browser itself reports being offline (a stopped server does not change `navigator.onLine`).
  if (reportsOffline) {
    await expect(page.locator(".notice[data-size='sm']")).toContainText("No internet connection");
    await expect(plainSearch(page)).toHaveCount(0);
  }
  // Nothing left the page for the API or Google: the page's own files came from the worker's cache.
  const origin = new URL(page.url()).origin;
  expect(requests.filter((url) => !url.startsWith(`${origin}/`))).toEqual([]);
  // With the browser's offline flag the telemetry beacon is skipped (METRO-106). A stopped server leaves the
  // flag untouched, so there the beacon may be attempted; nothing else of the API may be.
  const apiRequests = requests.filter((url) => url.startsWith(`${origin}/api/`));
  expect(
    reportsOffline ? apiRequests : apiRequests.filter((url) => !url.endsWith("/api/vitals")),
  ).toEqual([]);
}

test.describe("offline shell on the real server", () => {
  test("METRO-106 the first visit asks for no worker before load, and the worker comes after", async ({
    page,
    context,
    browserName,
  }) => {
    let loaded = false;
    const before: string[] = [];
    const after: string[] = [];
    page.on("load", () => {
      loaded = true;
    });
    // The worker script is requested by the browser for the context, not as a request of the page.
    context.on("request", (request) => {
      (loaded ? after : before).push(new URL(request.url()).pathname);
    });
    await open(page);
    expect(before).not.toContain("/sw.js");
    await shellReady(page);
    // Firefox does not report the worker script request to Playwright at all (Repo-verified: the list holds
    // only the page's own chunks), so this half of the check is Chromium and WebKit only.
    if (browserName !== "firefox") expect(after).toContain("/sw.js");
    // Control: the check can see requests at all.
    expect(before).toContain("/");
  });

  test("METRO-106 sw.js is served as a script that is checked on every update, with the app's CSP", async ({
    request,
  }) => {
    const response = await request.get("/sw.js");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/javascript/u);
    const cacheControl = response.headers()["cache-control"] ?? "";
    expect(cacheControl).not.toContain("immutable");
    expect(cacheControl).not.toMatch(/max-age=[1-9]/u);
    expect(response.headers()["content-security-policy"]).toContain("script-src 'self'");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(await response.text()).toContain("metro-shell-");
    // The hashed files stay immutable; only the worker is exempt.
    const html = await (await request.get("/")).text();
    const script = /src="(\/assets\/[^"]+\.js)"/u.exec(html)?.[1] ?? "";
    expect((await request.get(script)).headers()["cache-control"]).toContain("immutable");
  });

  test("METRO-106 with the network off the app reloads from the cache and the picker, map, fares and line list work", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName === "firefox", FIREFOX_OFFLINE);
    await open(page);
    await shellReady(page);
    await context.setOffline(true);
    await offlineJourney(page, true);
  });

  test("METRO-106 a deep link with a query string opens the cached shell offline and the query is never stored", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName === "firefox", FIREFOX_OFFLINE);
    await open(page);
    await shellReady(page);
    await context.setOffline(true);
    await page.goto("/some/path?lat=23.7&q=secret");
    await expect(combo(page)).toBeVisible();
    const keys = await page.evaluate(async (prefix) => {
      const names = (await caches.keys()).filter((name) => name.startsWith(prefix));
      const found: string[] = [];
      for (const name of names) {
        for (const request of await (await caches.open(name)).keys()) found.push(request.url);
      }
      return found;
    }, CACHE_PREFIX);
    expect(keys.length).toBeGreaterThan(10);
    expect(keys.filter((key) => new URL(key).search !== "" || new URL(key).hash !== "")).toEqual(
      [],
    );
    expect(keys.filter((key) => /secret|some\/path/u.test(key))).toEqual([]);
  });

  // The probes below post to the API and read an unknown API path: the 4xx answers are the point.
  test.describe("API probes", () => {
    test.use({
      allowedConsoleError: /Failed to load resource: the server responded with a status of 4\d\d/u,
    });
    test("METRO-106 the API and Google are never cached or answered by the worker", async ({
      page,
    }) => {
      await open(page);
      await shellReady(page);
      // Posts to the API and reads an unknown API path through the page. No Google request is provoked on
      // purpose: under a controlling worker WebKit does not apply Playwright route stubs to the page's
      // requests (Repo-verified: the real Maps script was fetched), so a test must never ask for one.
      const results = await page.evaluate(async () => {
        const api = await fetch("/api/vitals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });
        const apiGet = await fetch("/api/other");
        return [api.status, apiGet.status];
      });
      expect(results.every((status) => status >= 400)).toBe(true);
      const cached = await page.evaluate(async (prefix) => {
        const found: string[] = [];
        for (const name of (await caches.keys()).filter((key) => key.startsWith(prefix))) {
          for (const request of await (await caches.open(name)).keys()) found.push(request.url);
        }
        return found;
      }, CACHE_PREFIX);
      expect(cached.length).toBeGreaterThan(10);
      expect(cached.filter((url) => /\/api\/|google|gstatic/iu.test(url))).toEqual([]);
      // Every key is an own-origin path.
      const origin = new URL(page.url()).origin;
      expect(cached.filter((url) => !url.startsWith(`${origin}/`))).toEqual([]);
      // Control: the worker does answer own-origin shell files from the cache.
      const served = await page.evaluate(async () => {
        const response = await fetch("/theme-boot.js");
        return response.ok;
      });
      expect(served).toBe(true);
    });
  });
});

/** A static server over `dist/client` whose files can be swapped for a second "deploy". */
interface Deploy {
  readonly files: Map<string, Buffer>;
  /** Paths answered with 404 (a file the new deploy no longer has). */
  readonly gone: Set<string>;
}

function readDist(): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  for (const entry of readdirSync(DIST, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath, entry.name);
    const path = `/${full.slice(DIST.length + 1).replaceAll("\\", "/")}`;
    if (!path.startsWith("/.vite/")) files.set(path, readFileSync(full));
  }
  return files;
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
};

/** Same cache policy as production for the one file that matters here: the worker is never cached. */
/** `down` makes the server drop every connection: a network that is gone, for a browser whose offline flag cannot be used. */
interface Holder {
  current: Deploy;
  down: boolean;
}

function serve(deploy: Holder): Promise<{ server: Server; base: string }> {
  const server = createServer((request, response) => {
    if (deploy.down) {
      request.socket.destroy();
      return;
    }
    const path = new URL(request.url ?? "/", "http://x").pathname;
    const { files, gone } = deploy.current;
    const navigation = request.headers["sec-fetch-mode"] === "navigate";
    const key = path === "/" || (navigation && !files.has(path)) ? "/index.html" : path;
    const body = gone.has(path) ? undefined : files.get(key);
    // The web-vitals beacon: the real Worker answers it, this static server just takes it.
    if (request.method === "POST" && path === "/api/vitals") {
      response.writeHead(204).end();
      return;
    }
    if (body === undefined) {
      response.writeHead(404, { "content-type": "text/plain" }).end("missing");
      return;
    }
    response
      .writeHead(200, {
        "content-type": TYPES[extname(key)] ?? "application/octet-stream",
        "cache-control": key === "/sw.js" ? "no-cache" : "public, max-age=0, must-revalidate",
      })
      .end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

const V2_MARKER = "deploy-v2";

/** A second deploy: new page marker, a new worker version, optionally without some of the v1 files. */
function second(first: Deploy, options: { gone?: string[]; broken?: string[] } = {}): Deploy {
  const files = new Map(first.files);
  const html = (first.files.get("/index.html") ?? Buffer.alloc(0)).toString("utf8");
  files.set(
    "/index.html",
    Buffer.from(html.replace("</head>", `<meta name="build" content="${V2_MARKER}"></head>`)),
  );
  const worker = (first.files.get("/sw.js") ?? Buffer.alloc(0)).toString("utf8");
  let next = worker.replace(/(version:\s*[`"'])([0-9a-f]{12})/u, "$1ffffffffffff");
  for (const path of options.gone ?? []) {
    next = next.replace(new RegExp(`[\`"']${path.replaceAll(".", "\\.")}[\`"'],?`, "u"), "");
  }
  for (const path of options.broken ?? [])
    next = next.replace(/(precache:\s*\[)/u, `$1\`${path}\`,`);
  files.set("/sw.js", Buffer.from(next));
  return { files, gone: new Set(options.gone) };
}

const updateRegion = (page: Page): Locator =>
  page.locator(".toast-region").getByRole("status").filter({ hasText: "A new version is ready." });

async function checkForUpdate(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });
}

async function versionMarker(page: Page): Promise<string | null> {
  return page.evaluate(
    () => document.querySelector('meta[name="build"]')?.getAttribute("content") ?? null,
  );
}

test.describe("update flow", () => {
  let deploy: Holder;
  let first: Deploy;
  let host: { server: Server; base: string };

  test.beforeEach(async () => {
    first = { files: readDist(), gone: new Set() };
    deploy = { current: first, down: false };
    host = await serve(deploy);
  });
  test.afterEach(async () => {
    host.server.closeAllConnections();
    await new Promise((resolve) => host.server.close(resolve));
  });

  /** The network goes away: the offline flag where the browser honours it for navigations, else the server. */
  async function goOffline(context: BrowserContext, browserName: string): Promise<void> {
    if (browserName === "firefox") deploy.down = true;
    else await context.setOffline(true);
  }

  async function installed(page: Page): Promise<string> {
    await open(page, host.base);
    await shellReady(page);
    expect(await versionMarker(page)).toBeNull();
    const [name] = await cacheNames(page);
    return name ?? "";
  }

  test("METRO-106 every browser: with the network gone the cached app reloads and the picker, map, fares and line list work", async ({
    page,
    context,
    browserName,
  }) => {
    await installed(page);
    await goOffline(context, browserName);
    await offlineJourney(page, browserName !== "firefox");
  });

  test("METRO-106 a new deploy waits behind a prompt; Reload by keyboard swaps it in, deletes the old cache and still works offline", async ({
    page,
    context,
    browserName,
  }) => {
    const v1 = await installed(page);
    deploy.current = second(first);
    await checkForUpdate(page);
    // The new worker installed and waits; the page runs on the version it loaded, and its cache is untouched.
    await expect(updateRegion(page)).toBeVisible();
    expect(await versionMarker(page)).toBeNull();
    expect(await cacheNames(page)).toHaveLength(2);
    expect(await cacheNames(page)).toContain(v1);
    // The prompt is announced from a region that was mounted empty, and it passes axe.
    expect(
      await axeBuilder(page)
        .analyze()
        .then((results) => results.violations),
    ).toEqual([]);
    // Real keyboard: Tab reaches Reload then Dismiss, each with a visible focus ring, and Shift+Tab comes back.
    const focused = (): Promise<string> =>
      page.evaluate(
        () =>
          document.activeElement?.getAttribute("aria-label") ??
          document.activeElement?.textContent ??
          "",
      );
    // Start on the control just before the prompt in the tab order (the prompt is the last thing in the page),
    // so the walk does not pass the place search: its first focus would ask for the Maps script.
    await page.evaluate(() => {
      const controls = [
        ...document.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ].filter((element) => element.getClientRects().length > 0);
      const at = controls.findIndex((element) => element.classList.contains("toast__action"));
      controls[at - 1]?.focus();
    });
    expect(
      await page.evaluate(() => document.activeElement?.closest(".toast-region") === null),
    ).toBe(true);
    await page.keyboard.press("Tab");
    const reached = await focused();
    expect(reached).toBe("Reload");
    const ring = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement ?? document.body);
      return {
        visible: document.activeElement?.matches(":focus-visible") === true,
        outline: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0,
      };
    });
    expect(ring).toEqual({ visible: true, outline: true });
    await page.keyboard.press("Tab");
    expect(await focused()).toBe("Dismiss");
    await page.keyboard.press("Shift+Tab");
    expect(await focused()).toBe("Reload");
    await Promise.all([page.waitForEvent("load"), page.keyboard.press("Enter")]);
    await expect(page.getByRole("application", { name: MAP_NAME, exact: true })).toBeVisible();
    expect(await versionMarker(page)).toBe(V2_MARKER);
    await expect(updateRegion(page)).toHaveCount(0);
    await expect.poll(() => cacheNames(page)).toHaveLength(1);
    expect(await cacheNames(page)).not.toContain(v1);
    // And the new version works with the network off.
    await goOffline(context, browserName);
    await page.reload();
    expect(await versionMarker(page)).toBe(V2_MARKER);
    await combo(page).fill("motijheel");
    await combo(page).press("Enter");
    await expect(page.getByRole("article")).toContainText("Motijheel");
  });

  test("METRO-106 Dismiss keeps the page on v1, returns focus to the panel, and leaves the new worker waiting for the next visit", async ({
    page,
  }) => {
    const v1 = await installed(page);
    deploy.current = second(first);
    await checkForUpdate(page);
    await expect(updateRegion(page)).toBeVisible();
    await updateRegion(page).getByRole("button", { name: "Dismiss" }).focus();
    await page.keyboard.press("Enter");
    await expect(updateRegion(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.className)).toContain("panel__scroll");
    expect(await versionMarker(page)).toBeNull();
    // Still v1 and still working: the picker answers from the page.
    await combo(page).fill("uttara");
    await combo(page).press("Enter");
    await expect(page.getByRole("article")).toContainText("Uttara");
    // Dismissing does not apply the update: the new worker still waits, behind the old one, and v1 keeps its cache.
    // That it takes over on the next visit, once no page uses v1, is the browser's own rule (ADR-0023).
    expect(await cacheNames(page)).toContain(v1);
    expect(await cacheNames(page)).toHaveLength(2);
    const states = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return [registration?.waiting?.state ?? "none", registration?.active?.state ?? "none"];
    });
    expect(states).toEqual(["installed", "activated"]);
  });

  test("METRO-106 a file the new deploy removed is still served to the open v1 page from its cache", async ({
    page,
  }) => {
    await installed(page);
    const vitals = [...first.files.keys()].find((path) =>
      /^\/assets\/web-vitals-.*\.js$/u.test(path),
    );
    expect(vitals).toBeDefined();
    const removed = vitals ?? "";
    deploy.current = second(first, { gone: [removed] });
    await checkForUpdate(page);
    await expect(updateRegion(page)).toBeVisible();
    // The network now answers 404 for it; the old worker still holds it.
    const status = await page.evaluate(async (path) => (await fetch(path)).status, removed);
    expect(status).toBe(200);
  });

  test("METRO-106 a new worker that cannot install leaves v1 working, offers nothing, and keeps its cache", async ({
    page,
    context,
    browserName,
  }) => {
    const v1 = await installed(page);
    deploy.current = second(first, { broken: ["/assets/never-built.js"] });
    await checkForUpdate(page);
    // The install fails (404 in the list), so the new worker never waits and there is no prompt.
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return [
            registration?.installing?.state ?? "none",
            registration?.waiting?.state ?? "none",
          ];
        }),
      )
      .toEqual(["none", "none"]);
    await expect(updateRegion(page)).toHaveCount(0);
    expect(await cacheNames(page)).toContain(v1);
    await goOffline(context, browserName);
    await page.reload();
    expect(await versionMarker(page)).toBeNull();
    await expect(combo(page)).toBeVisible();
  });
});

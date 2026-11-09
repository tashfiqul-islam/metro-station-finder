import { describe, expect, test, vi } from "vitest";

import {
  CACHE_PREFIX,
  attach,
  cacheFirst,
  cacheName,
  dropCaches,
  installShell,
  isPagePath,
  networkFirst,
  route,
  type CacheLike,
  type CachesLike,
  type Deps,
  type WorkerConfig,
  type WorkerScope,
} from "./worker";

const ORIGIN = "https://metro.test";
const urlOf = (input: string | Request): string => (typeof input === "string" ? input : input.url);
const config: WorkerConfig = {
  version: "v1",
  precache: ["/", "/assets/app-1.js", "/theme-boot.js"],
  kill: false,
};
const META = "/__shell-meta";

type FakeCaches = CachesLike & { stores: Map<string, Map<string, Response>> };

function fakeCaches(options: { putFails?: boolean } = {}): FakeCaches {
  const stores = new Map<string, Map<string, Response>>();
  return {
    stores,
    open: (name) => {
      const store = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, store);
      const cache: CacheLike = {
        match: (key) => Promise.resolve(store.get(key)?.clone()),
        put: (key, response) => {
          if (options.putFails === true && key.startsWith("/assets/")) {
            return Promise.reject(new DOMException("full", "QuotaExceededError"));
          }
          store.set(key, response);
          return Promise.resolve();
        },
      };
      return Promise.resolve(cache);
    },
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (name) => Promise.resolve(stores.delete(name)),
  };
}

/** A same-origin response as a browser hands it to a worker: `type` is "basic". */
function basic(response: Response, redirected = false): Response {
  Object.defineProperty(response, "type", { value: "basic" });
  Object.defineProperty(response, "redirected", { value: redirected });
  return response;
}
const page = (body = "<html></html>", status = 200): Response =>
  basic(new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } }));
const script = (body = "x", status = 200): Response =>
  basic(new Response(body, { status, headers: { "content-type": "text/javascript" } }));

function depsWith(
  fetcher: Deps["fetch"],
  caches: CachesLike = fakeCaches(),
  wait: Deps["wait"] = () => {},
  override: Partial<Deps> = {},
): Deps {
  return {
    caches,
    fetch: fetcher,
    wait,
    now: () => 1000,
    saveData: () => false,
    origin: ORIGIN,
    config,
    ...override,
  };
}

function request(path: string, init: { method?: string; mode?: RequestMode } = {}) {
  return { method: init.method ?? "GET", mode: init.mode ?? "no-cors", url: `${ORIGIN}${path}` };
}

async function withShell(): Promise<FakeCaches> {
  const caches = fakeCaches();
  await (await caches.open(cacheName(config))).put("/", page("<html>cached</html>"));
  return caches;
}

const waitEvent = () => {
  const work: Promise<unknown>[] = [];
  return { event: { waitUntil: (p: Promise<unknown>) => work.push(p) }, work };
};

const installFetcher = (input: string | Request): Promise<Response> =>
  Promise.resolve(input === "/" ? page() : script());
const noNetwork = (): Promise<Response> => Promise.reject(new TypeError("offline"));
const keysOf = (caches: FakeCaches, name = cacheName(config)): string[] => [
  ...(caches.stores.get(name)?.keys() ?? []),
];

describe("route", () => {
  const shell = new Set(config.precache);

  test("a page navigation is network first, hashed assets are cache first, unhashed shell files are network first", () => {
    expect(route(request("/", { mode: "navigate" }), ORIGIN, shell)).toBe("navigate");
    expect(route(request("/anything?lat=1", { mode: "navigate" }), ORIGIN, shell)).toBe("navigate");
    expect(route(request("/assets/other-2.js"), ORIGIN, shell)).toBe("cache-first");
    expect(route(request("/theme-boot.js"), ORIGIN, shell)).toBe("network-first");
  });

  test("a navigation to a file path is not answered with the page", () => {
    expect(route(request("/licenses.txt", { mode: "navigate" }), ORIGIN, shell)).toBe("pass");
    expect(route(request("/robots.txt", { mode: "navigate" }), ORIGIN, shell)).toBe("pass");
    expect(route(request("/theme-boot.js", { mode: "navigate" }), ORIGIN, shell)).toBe(
      "network-first",
    );
    expect(isPagePath("/")).toBe(true);
    expect(isPagePath("/some/path")).toBe(true);
    expect(isPagePath("/a.b/c")).toBe(true);
    expect(isPagePath("/data.json")).toBe(false);
  });

  test("the API, the worker itself, other origins and other methods are never touched", () => {
    expect(route(request("/api/vitals"), ORIGIN, shell)).toBe("pass");
    expect(route(request("/api"), ORIGIN, shell)).toBe("pass");
    expect(route(request("/api/x", { mode: "navigate" }), ORIGIN, shell)).toBe("pass");
    expect(route(request("/sw.js"), ORIGIN, shell)).toBe("pass");
    expect(route(request("/sw.js/", { mode: "navigate" }), ORIGIN, shell)).toBe("navigate");
    expect(route(request("/assets/app-1.js", { method: "POST" }), ORIGIN, shell)).toBe("pass");
    for (const url of [
      "https://maps.googleapis.com/maps/api/js",
      "https://places.googleapis.com/v1/places:searchText",
      "https://routes.googleapis.com/x",
      "https://maps.gstatic.com/mapfiles/a",
      "https://evil.test/assets/app-1.js",
    ]) {
      expect(route({ method: "GET", mode: "cors", url }, ORIGIN, shell)).toBe("pass");
    }
  });

  test("an unknown same-origin file is left to the network", () => {
    expect(route(request("/licenses.txt"), ORIGIN, shell)).toBe("pass");
  });
});

describe("installShell", () => {
  test("stores every shell file under its path and a marker in this version's cache", async () => {
    const caches = fakeCaches();
    const fetcher = vi.fn((input: string | Request, _init?: RequestInit) =>
      Promise.resolve(input === "/" ? page() : script(urlOf(input))),
    );
    await installShell(depsWith(fetcher, caches));
    expect(new Set(keysOf(caches))).toEqual(new Set([...config.precache, META]));
    expect(await caches.stores.get(cacheName(config))?.get(META)?.text()).toBe("1000");
    const modes = new Map(fetcher.mock.calls.map(([path, init]) => [urlOf(path), init?.cache]));
    expect(modes.get("/assets/app-1.js")).toBe("default");
    expect(modes.get("/")).toBe("reload");
    expect(modes.get("/theme-boot.js")).toBe("reload");
  });

  test("Data Saver: nothing is fetched or stored and the install still succeeds", async () => {
    const caches = fakeCaches();
    const fetcher = vi.fn(noNetwork);
    await installShell(depsWith(fetcher, caches, undefined, { saveData: () => true }));
    expect(fetcher).not.toHaveBeenCalled();
    expect(caches.stores.size).toBe(0);
  });

  test.each([
    ["a 404", () => script("x", 404)],
    ["an HTML answer where a script is expected (the SPA fallback)", () => page()],
    [
      "a redirected answer (a navigation cannot be answered from one)",
      () => Object.defineProperty(script(), "redirected", { value: true }),
    ],
  ])("fails the install on %s so the old worker stays", async (_name, answer) => {
    const fetcher = (input: string | Request): Promise<Response> =>
      Promise.resolve(input === "/assets/app-1.js" ? answer() : installFetcher(input));
    await expect(installShell(depsWith(fetcher))).rejects.toThrow("shell file not cacheable");
  });

  test("fails when the page itself is not HTML", async () => {
    await expect(installShell(depsWith(() => Promise.resolve(script())))).rejects.toThrow(
      "shell file not cacheable",
    );
  });

  test("fails when the network is down", async () => {
    await expect(
      installShell(depsWith(() => Promise.reject(new TypeError("down")))),
    ).rejects.toThrow("down");
  });
});

const failingAsset = (input: string | Request): Promise<Response> =>
  urlOf(input) === "/assets/app-1.js" ? Promise.resolve(script("x", 404)) : installFetcher(input);
const rejectsWithText = (): Promise<Response> => Promise.reject("down");

async function aged(): Promise<FakeCaches> {
  const caches = fakeCaches();
  const stamp = async (name: string, at: string | null): Promise<void> => {
    const cache = await caches.open(name);
    if (at !== null) await cache.put(META, new Response(at));
  };
  await stamp(`${CACHE_PREFIX}v0`, "10");
  await stamp(`${CACHE_PREFIX}vprev`, "500");
  await stamp(`${CACHE_PREFIX}v1`, "900");
  await stamp(`${CACHE_PREFIX}nomark`, null);
  await stamp(`${CACHE_PREFIX}garbled`, "not a number");
  await stamp("other-app", null);
  return caches;
}

describe("a failed install and the live cache", () => {
  test("a version whose install failed leaves no cache behind, the others untouched", async () => {
    const caches = fakeCaches();
    await caches.open(`${CACHE_PREFIX}older`);
    await expect(installShell(depsWith(failingAsset, caches))).rejects.toThrow(
      "shell file not cacheable",
    );
    expect([...caches.stores.keys()]).toEqual([`${CACHE_PREFIX}older`]);
  });

  test("the SAME version failing to install again leaves the live cache of that name whole", async () => {
    const caches = fakeCaches();
    await installShell(depsWith(installFetcher, caches));
    const before = keysOf(caches);
    await expect(installShell(depsWith(failingAsset, caches))).rejects.toThrow(
      "shell file not cacheable",
    );
    expect(caches.stores.has(cacheName(config))).toBe(true);
    expect(new Set(keysOf(caches))).toEqual(new Set(before));
  });

  test("a rejection that is not an Error still fails the install with a fixed message", async () => {
    const caches = fakeCaches();
    await expect(installShell(depsWith(rejectsWithText, caches))).rejects.toThrow(
      "shell file not cacheable",
    );
    expect(caches.stores.size).toBe(0);
  });
});

describe("dropCaches", () => {
  test("an update keeps this version and the newest older one, and drops the rest and no foreign cache", async () => {
    const caches = await aged();
    await dropCaches(depsWith(noNetwork, caches), false);
    expect(new Set(caches.stores.keys())).toEqual(
      new Set([`${CACHE_PREFIX}v1`, `${CACHE_PREFIX}vprev`, "other-app"]),
    );
  });

  test("with no older cache there is nothing to keep or drop", async () => {
    const caches = fakeCaches();
    await caches.open(cacheName(config));
    await dropCaches(depsWith(noNetwork, caches), false);
    expect([...caches.stores.keys()]).toEqual([cacheName(config)]);
  });

  test("the kill switch deletes every shell cache, this version's too, and leaves foreign ones", async () => {
    const caches = await aged();
    await dropCaches(depsWith(noNetwork, caches), true);
    expect([...caches.stores.keys()]).toEqual(["other-app"]);
  });
});

describe("networkFirst", () => {
  const nav = new Request(`${ORIGIN}/?lat=1&lng=2`);

  test("serves the network answer when there is one and never writes it to the cache", async () => {
    const caches = await withShell();
    const response = await networkFirst(
      depsWith(() => Promise.resolve(page("<html>fresh</html>")), caches),
      nav,
      "/",
    );
    expect(await response.text()).toBe("<html>fresh</html>");
    expect(await caches.stores.get(cacheName(config))?.get("/")?.text()).toBe(
      "<html>cached</html>",
    );
  });

  test("falls back to the cached copy when the network fails", async () => {
    const caches = await withShell();
    const response = await networkFirst(depsWith(noNetwork, caches), nav, "/");
    expect(await response.text()).toBe("<html>cached</html>");
  });

  test("falls back to the kept older cache when this version's has no copy", async () => {
    const caches = fakeCaches();
    await caches.open(cacheName(config));
    await (await caches.open(`${CACHE_PREFIX}prev`)).put("/", page("<html>previous</html>"));
    const response = await networkFirst(depsWith(noNetwork, caches), nav, "/");
    expect(await response.text()).toBe("<html>previous</html>");
  });

  test("rethrows the network failure when nothing is cached, and does not create a cache", async () => {
    const caches = fakeCaches();
    await expect(networkFirst(depsWith(noNetwork, caches), nav, "/")).rejects.toThrow("offline");
    expect(caches.stores.size).toBe(0);
  });

  test("falls back on a 5xx, and passes a 5xx through when nothing is cached", async () => {
    const caches = await withShell();
    const cached = await networkFirst(
      depsWith(() => Promise.resolve(page("e", 503)), caches),
      nav,
      "/",
    );
    expect(await cached.text()).toBe("<html>cached</html>");
    const bare = await networkFirst(
      depsWith(() => Promise.resolve(page("e", 503))),
      nav,
      "/",
    );
    expect(bare.status).toBe(503);
  });

  test("a network that does not answer in 3 s gives way to the cached copy", async () => {
    const caches = await withShell();
    const timers: { task: () => void; ms: number }[] = [];
    const pending = networkFirst(
      depsWith(
        () => new Promise<Response>(() => {}),
        caches,
        (task, ms) => {
          timers.push({ task, ms });
        },
      ),
      nav,
      "/",
    );
    await vi.waitFor(() => {
      expect(timers.map((timer) => timer.ms)).toEqual([3000]);
    });
    timers[0]?.task();
    expect(await (await pending).text()).toBe("<html>cached</html>");
  });

  test("a slow network with nothing cached is still waited for", async () => {
    const lateAnswers: ((response: Response) => void)[] = [];
    const network = new Promise<Response>((resolve) => {
      lateAnswers.push(resolve);
    });
    const tasks: (() => void)[] = [];
    const pending = networkFirst(
      depsWith(
        () => network,
        fakeCaches(),
        (task) => {
          tasks.push(task);
        },
      ),
      nav,
      "/",
    );
    await vi.waitFor(() => {
      expect(tasks).toHaveLength(1);
    });
    tasks[0]?.();
    lateAnswers[0]?.(page("<html>late</html>"));
    expect(await (await pending).text()).toBe("<html>late</html>");
  });
});

async function withCurrent(): Promise<FakeCaches> {
  const caches = fakeCaches();
  await caches.open(cacheName(config));
  return caches;
}

describe("cacheFirst", () => {
  const asset = new Request(`${ORIGIN}/assets/app-2.js?v=1`);

  test("a hit never touches the network", async () => {
    const caches = fakeCaches();
    await (await caches.open(cacheName(config))).put("/assets/app-2.js", script("cached"));
    const fetcher = vi.fn(noNetwork);
    const response = await cacheFirst(depsWith(fetcher, caches), asset);
    expect(await response.text()).toBe("cached");
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("a file only the kept older cache holds is still served (an old tab's lazy chunk)", async () => {
    const caches = await withCurrent();
    await (await caches.open(`${CACHE_PREFIX}prev`)).put("/assets/app-2.js", script("older"));
    const response = await cacheFirst(depsWith(noNetwork, caches), asset);
    expect(await response.text()).toBe("older");
  });

  test("a miss is fetched and stored under the path without the query string", async () => {
    const caches = await withCurrent();
    const response = await cacheFirst(
      depsWith(() => Promise.resolve(script("net")), caches),
      asset,
    );
    expect(await response.text()).toBe("net");
    expect(keysOf(caches)).toEqual(["/assets/app-2.js"]);
  });

  test("a failed, partial, HTML, redirected or non-basic answer is returned but not stored", async () => {
    const opaque = new Response("x", {
      status: 200,
      headers: { "content-type": "text/javascript" },
    });
    Object.defineProperty(opaque, "type", { value: "opaque" });
    for (const answer of [
      script("x", 404),
      script("x", 206),
      page(),
      basic(new Response("x", { headers: { "content-type": "text/javascript" } }), true),
      opaque,
    ]) {
      const caches = await withCurrent();
      await cacheFirst(
        depsWith(() => Promise.resolve(answer), caches),
        asset,
      );
      expect(keysOf(caches)).toEqual([]);
    }
  });

  test("a file outside /assets/ is fetched but not stored", async () => {
    const caches = await withCurrent();
    await cacheFirst(
      depsWith(() => Promise.resolve(script()), caches),
      new Request(`${ORIGIN}/theme-boot.js`),
    );
    expect(keysOf(caches)).toEqual([]);
  });

  test("a full cache (put rejects) still returns the network answer", async () => {
    const caches = fakeCaches({ putFails: true });
    await caches.open(cacheName(config));
    const response = await cacheFirst(
      depsWith(() => Promise.resolve(script("net")), caches),
      asset,
    );
    expect(await response.text()).toBe("net");
    expect(keysOf(caches)).toEqual([]);
  });

  test("an evicted cache is not recreated by a fetch", async () => {
    const caches = fakeCaches();
    const response = await cacheFirst(
      depsWith(() => Promise.resolve(script("net")), caches),
      asset,
    );
    expect(await response.text()).toBe("net");
    expect(caches.stores.size).toBe(0);
  });

  test("when only an older cache exists a fetched file is not written into it", async () => {
    const caches = fakeCaches();
    await caches.open(`${CACHE_PREFIX}prev`);
    await cacheFirst(
      depsWith(() => Promise.resolve(script("net")), caches),
      asset,
    );
    expect(keysOf(caches, `${CACHE_PREFIX}prev`)).toEqual([]);
    expect(caches.stores.has(cacheName(config))).toBe(false);
  });

  test("a network failure on a miss is not hidden", async () => {
    await expect(cacheFirst(depsWith(noNetwork), asset)).rejects.toThrow("offline");
  });
});

describe("attach", () => {
  type Listener = (event: never) => void;

  function fakeScope(fetcher: Deps["fetch"] = () => Promise.resolve(script()), saveData?: boolean) {
    const listeners = new Map<string, Listener>();
    const caches = fakeCaches();
    const calls = {
      skipWaiting: 0,
      claim: 0,
      unregister: 0,
      timers: [] as { task: () => void; ms: number }[],
    };
    const scope: WorkerScope = {
      caches,
      // Like a real worker scope: `fetch` must be called as its method, or the browser throws.
      fetch(this: unknown, input, init) {
        if (this !== scope) throw new TypeError("Illegal invocation");
        return fetcher(input, init);
      },
      location: { origin: ORIGIN },
      ...(saveData === undefined ? {} : { navigator: { connection: { saveData } } }),
      registration: {
        unregister: () => {
          calls.unregister += 1;
          return Promise.resolve(true);
        },
      },
      clients: {
        claim: () => {
          calls.claim += 1;
          return Promise.resolve();
        },
      },
      skipWaiting: () => {
        calls.skipWaiting += 1;
        return Promise.resolve();
      },
      setTimeout: (task, ms) => {
        calls.timers.push({ task, ms });
      },
      addEventListener: (type, listener) => {
        listeners.set(type, listener);
      },
    };
    const fire = (type: string, event: object): void => {
      const listener = listeners.get(type);
      if (listener !== undefined) Reflect.apply(listener, undefined, [event]);
    };
    return { scope, caches, calls, listeners, fire };
  }

  test("install precaches and does not skip waiting, activate keeps this and the newest older cache and claims", async () => {
    const { scope, caches, calls, fire } = fakeScope(installFetcher);
    await (await caches.open(`${CACHE_PREFIX}old`)).put(META, new Response("5"));
    await (await caches.open(`${CACHE_PREFIX}older`)).put(META, new Response("1"));
    attach(scope, config);
    const install = waitEvent();
    fire("install", install.event);
    await Promise.all(install.work);
    expect(calls.skipWaiting).toBe(0);
    expect(caches.stores.get(cacheName(config))?.size).toBe(config.precache.length + 1);
    const activate = waitEvent();
    fire("activate", activate.event);
    await Promise.all(activate.work);
    expect(new Set(caches.stores.keys())).toEqual(
      new Set([cacheName(config), `${CACHE_PREFIX}old`]),
    );
    expect(calls.claim).toBe(1);
  });

  test("install sends /api/* straight to the network where the browser can route, and an install without the API or with a refused rule still succeeds", async () => {
    const rules: unknown[] = [];
    const { scope, caches, fire } = fakeScope(installFetcher);
    attach(scope, config);
    const routed = waitEvent();
    fire("install", {
      ...routed.event,
      addRoutes: (rule: unknown) => {
        rules.push(rule);
        return Promise.resolve();
      },
    });
    await Promise.all(routed.work);
    expect(rules).toEqual([{ condition: { urlPattern: "/api/*" }, source: "network" }]);
    expect(caches.stores.get(cacheName(config))?.size).toBe(config.precache.length + 1);
    // A refused rule (a TypeError thrown at once, or a rejected promise) never fails the install.
    for (const refuse of [
      (): Promise<void> => {
        throw new TypeError("invalid rule");
      },
      (): Promise<void> => Promise.reject(new TypeError("invalid rule")),
    ]) {
      const refused = waitEvent();
      fire("install", { ...refused.event, addRoutes: refuse });
      await expect(Promise.all(refused.work)).resolves.toBeDefined();
    }
  });

  test("the kill switch registers no routes", async () => {
    const { scope, fire } = fakeScope();
    attach(scope, { ...config, kill: true });
    const rules: unknown[] = [];
    const install = waitEvent();
    fire("install", {
      ...install.event,
      addRoutes: (rule: unknown) => {
        rules.push(rule);
        return Promise.resolve();
      },
    });
    await Promise.all(install.work);
    expect(rules).toEqual([]);
  });

  test("Data Saver in the worker scope skips the precache", async () => {
    const { scope, caches, fire } = fakeScope(noNetwork, true);
    attach(scope, config);
    const install = waitEvent();
    fire("install", install.event);
    await Promise.all(install.work);
    expect(caches.stores.size).toBe(0);
  });

  test("fetch events: pages and unhashed shell files are answered, the API, Google and plain files are not", async () => {
    const { scope, caches, fire } = fakeScope(() => Promise.resolve(page("net")), false);
    await (await caches.open(cacheName(config))).put("/theme-boot.js", script("boot"));
    attach(scope, config);
    const answers: Promise<Response>[] = [];
    const send = (url: string, mode: RequestMode): void => {
      fire("fetch", {
        request: { method: "GET", mode, url },
        respondWith: (answer: Promise<Response>) => answers.push(answer),
      });
    };
    send(`${ORIGIN}/`, "navigate");
    send(`${ORIGIN}/theme-boot.js`, "no-cors");
    send(`${ORIGIN}/assets/app-1.js`, "no-cors");
    send(`${ORIGIN}/api/vitals`, "cors");
    send(`${ORIGIN}/licenses.txt`, "navigate");
    send("https://maps.googleapis.com/maps/api/js", "no-cors");
    expect(answers).toHaveLength(3);
    const [pageAnswer, bootAnswer, assetAnswer] = await Promise.all(answers);
    expect(await pageAnswer?.text()).toBe("net");
    expect(await bootAnswer?.text()).toBe("net");
    expect(assetAnswer?.status).toBe(200);
  });

  test("the wait for the network is scheduled on the worker's own timer", async () => {
    const { scope, calls, fire } = fakeScope(() => new Promise<Response>(() => {}));
    attach(scope, config);
    fire("fetch", {
      request: { method: "GET", mode: "navigate", url: `${ORIGIN}/` },
      respondWith: () => {},
    });
    await vi.waitFor(() => {
      expect(calls.timers.map((timer) => timer.ms)).toEqual([3000]);
    });
    calls.timers[0]?.task();
  });

  test("only the exact skip-waiting message ends the wait", () => {
    const { scope, calls, fire } = fakeScope();
    attach(scope, config);
    for (const data of [null, "skip-waiting", {}, { type: "other" }, { type: 1 }, 7]) {
      fire("message", { data });
    }
    expect(calls.skipWaiting).toBe(0);
    fire("message", { data: { type: "skip-waiting" } });
    expect(calls.skipWaiting).toBe(1);
  });

  test("the kill switch skips waiting, deletes every cache and unregisters, without reloading pages, and has no fetch or message handler", async () => {
    const { scope, caches, calls, listeners, fire } = fakeScope();
    await caches.open(`${CACHE_PREFIX}v1`);
    await caches.open(cacheName({ ...config, kill: true }));
    await caches.open("other-app");
    attach(scope, { ...config, kill: true });
    expect(new Set(listeners.keys())).toEqual(new Set(["activate", "install"]));
    const install = waitEvent();
    fire("install", install.event);
    await Promise.all(install.work);
    expect(calls.skipWaiting).toBe(1);
    const activate = waitEvent();
    fire("activate", activate.event);
    await Promise.all(activate.work);
    expect([...caches.stores.keys()]).toEqual(["other-app"]);
    expect(calls.unregister).toBe(1);
  });

  test("a listener for an unrelated event type is simply absent", () => {
    const { scope, listeners, fire } = fakeScope();
    attach(scope, config);
    expect(listeners.has("push")).toBe(false);
    fire("push", {});
  });
});

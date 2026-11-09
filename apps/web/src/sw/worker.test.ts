import { describe, expect, test, vi } from "vitest";

import {
  CACHE_PREFIX,
  attach,
  cacheFirst,
  cacheName,
  dropCaches,
  navigate,
  installShell,
  route,
  type CacheLike,
  type CachesLike,
  type ClientLike,
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

function fakeCaches(): CachesLike & { stores: Map<string, Map<string, Response>> } {
  const stores = new Map<string, Map<string, Response>>();
  return {
    stores,
    open: (name) => {
      const store = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, store);
      const cache: CacheLike = {
        match: (key) => Promise.resolve(store.get(key)?.clone()),
        put: (key, response) => {
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

const page = (body = "<html></html>", status = 200): Response =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
const script = (body = "x", status = 200): Response =>
  new Response(body, { status, headers: { "content-type": "text/javascript" } });

function depsWith(
  fetcher: Deps["fetch"],
  caches: CachesLike = fakeCaches(),
  wait: Deps["wait"] = () => {},
  override: Partial<WorkerConfig> = {},
): Deps {
  return { caches, fetch: fetcher, wait, origin: ORIGIN, config: { ...config, ...override } };
}

function request(path: string, init: { method?: string; mode?: RequestMode } = {}) {
  return { method: init.method ?? "GET", mode: init.mode ?? "no-cors", url: `${ORIGIN}${path}` };
}

async function seeded(): Promise<ReturnType<typeof fakeCaches>> {
  const caches = fakeCaches();
  for (const name of [`${CACHE_PREFIX}old`, `${CACHE_PREFIX}v1`, "other-app"]) {
    await caches.open(name);
  }
  return caches;
}

async function withShell(): Promise<ReturnType<typeof fakeCaches>> {
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
describe("route", () => {
  const shell = new Set(config.precache);

  test("a navigation is network first, the shell files and hashed assets are cache first", () => {
    expect(route(request("/", { mode: "navigate" }), ORIGIN, shell)).toBe("navigate");
    expect(route(request("/anything?lat=1", { mode: "navigate" }), ORIGIN, shell)).toBe("navigate");
    expect(route(request("/assets/other-2.js"), ORIGIN, shell)).toBe("cache-first");
    expect(route(request("/theme-boot.js"), ORIGIN, shell)).toBe("cache-first");
  });

  test("the API, the worker itself, other origins and other methods are never touched", () => {
    expect(route(request("/api/vitals"), ORIGIN, shell)).toBe("pass");
    expect(route(request("/api"), ORIGIN, shell)).toBe("pass");
    expect(route(request("/api/x", { mode: "navigate" }), ORIGIN, shell)).toBe("pass");
    expect(route(request("/sw.js"), ORIGIN, shell)).toBe("pass");
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
  test("stores every shell file under its path in this version's cache", async () => {
    const caches = fakeCaches();
    const fetcher = vi.fn((input: string | Request) =>
      Promise.resolve(input === "/" ? page() : script(urlOf(input))),
    );
    await installShell(depsWith(fetcher, caches));
    expect(new Set(caches.stores.get(cacheName(config))?.keys())).toEqual(
      new Set(["/", "/assets/app-1.js", "/theme-boot.js"]),
    );
    const modes = new Map(fetcher.mock.calls.map(([path, init]) => [urlOf(path), init?.cache]));
    expect(modes.get("/assets/app-1.js")).toBe("default");
    expect(modes.get("/")).toBe("reload");
    expect(modes.get("/theme-boot.js")).toBe("reload");
  });

  test.each([
    ["a 404", () => script("x", 404)],
    ["an HTML answer where a script is expected (the SPA fallback)", () => page()],
  ])("fails the install on %s so the old worker stays", async (_name, answer) => {
    const fetcher = (input: string | Request): Promise<Response> =>
      Promise.resolve(input === "/assets/app-1.js" ? answer() : input === "/" ? page() : script());
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

describe("dropCaches", () => {
  test("deletes the other versions and keeps the current and foreign caches", async () => {
    const caches = await seeded();
    await dropCaches(
      depsWith(() => Promise.reject(new Error("unused")), caches),
      true,
    );
    expect(new Set(caches.stores.keys())).toEqual(new Set([`${CACHE_PREFIX}v1`, "other-app"]));
  });

  test("the kill switch deletes every shell cache and still leaves foreign ones", async () => {
    const caches = await seeded();
    await dropCaches(
      depsWith(() => Promise.reject(new Error("unused")), caches),
      false,
    );
    expect([...caches.stores.keys()]).toEqual(["other-app"]);
  });
});

describe("navigate", () => {
  const nav = new Request(`${ORIGIN}/?lat=1&lng=2`);

  test("serves the network answer when there is one and never writes it to the cache", async () => {
    const caches = await withShell();
    const answer = page("<html>fresh</html>");
    const response = await navigate(
      depsWith(() => Promise.resolve(answer), caches),
      nav,
    );
    expect(await response.text()).toBe("<html>fresh</html>");
    const stored = await caches.stores.get(cacheName(config))?.get("/")?.text();
    expect(stored).toBe("<html>cached</html>");
  });

  test("falls back to the cached shell when the network fails", async () => {
    const caches = await withShell();
    const response = await navigate(
      depsWith(() => Promise.reject(new TypeError("offline")), caches),
      nav,
    );
    expect(await response.text()).toBe("<html>cached</html>");
  });

  test("rethrows the network failure when there is no cached shell", async () => {
    await expect(
      navigate(
        depsWith(() => Promise.reject(new TypeError("offline"))),
        nav,
      ),
    ).rejects.toThrow("offline");
  });

  test("falls back to the cached shell on a 5xx, and passes a 5xx through when nothing is cached", async () => {
    const caches = await withShell();
    const cached = await navigate(
      depsWith(() => Promise.resolve(page("e", 503)), caches),
      nav,
    );
    expect(await cached.text()).toBe("<html>cached</html>");
    const bare = await navigate(
      depsWith(() => Promise.resolve(page("e", 503))),
      nav,
    );
    expect(bare.status).toBe(503);
  });

  test("a network that does not answer in 3 s gives way to the cached shell", async () => {
    const caches = await withShell();
    const never = new Promise<Response>(() => {});
    const timers: { task: () => void; ms: number }[] = [];
    const wait: Deps["wait"] = (task, ms) => {
      timers.push({ task, ms });
    };
    const pending = navigate(
      depsWith(() => never, caches, wait),
      nav,
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
    const pending = navigate(
      depsWith(
        () => network,
        fakeCaches(),
        (task) => {
          tasks.push(task);
        },
      ),
      nav,
    );
    await vi.waitFor(() => {
      expect(tasks).toHaveLength(1);
    });
    tasks[0]?.();
    lateAnswers[0]?.(page("<html>late</html>"));
    expect(await (await pending).text()).toBe("<html>late</html>");
  });
});

describe("cacheFirst", () => {
  const asset = new Request(`${ORIGIN}/assets/app-2.js?v=1`);

  test("a hit never touches the network", async () => {
    const caches = fakeCaches();
    await (await caches.open(cacheName(config))).put("/assets/app-2.js", script("cached"));
    const fetcher = vi.fn(() => Promise.reject(new Error("no network")));
    const response = await cacheFirst(depsWith(fetcher, caches), asset);
    expect(await response.text()).toBe("cached");
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("a miss is fetched and stored under the path without the query string", async () => {
    const caches = fakeCaches();
    const response = await cacheFirst(
      depsWith(() => Promise.resolve(script("net")), caches),
      asset,
    );
    expect(await response.text()).toBe("net");
    expect([...(caches.stores.get(cacheName(config))?.keys() ?? [])]).toEqual(["/assets/app-2.js"]);
  });

  test("a failed, partial or HTML answer is returned but not stored", async () => {
    for (const answer of [script("x", 404), script("x", 206), page()]) {
      const caches = fakeCaches();
      await cacheFirst(
        depsWith(() => Promise.resolve(answer), caches),
        asset,
      );
      expect([...(caches.stores.get(cacheName(config))?.keys() ?? [])]).toEqual([]);
    }
  });

  test("a precached unhashed file that is somehow missing is fetched but not stored", async () => {
    const caches = fakeCaches();
    await cacheFirst(
      depsWith(() => Promise.resolve(script()), caches),
      new Request(`${ORIGIN}/theme-boot.js`),
    );
    expect([...(caches.stores.get(cacheName(config))?.keys() ?? [])]).toEqual([]);
  });

  test("a network failure on a miss is not hidden", async () => {
    await expect(
      cacheFirst(
        depsWith(() => Promise.reject(new TypeError("offline"))),
        asset,
      ),
    ).rejects.toThrow("offline");
  });
});

describe("attach", () => {
  type Listener = (event: never) => void;

  function fakeScope(fetcher: Deps["fetch"] = () => Promise.resolve(script())) {
    const listeners = new Map<string, Listener>();
    const caches = fakeCaches();
    const calls = {
      skipWaiting: 0,
      claim: 0,
      unregister: 0,
      navigated: [] as string[],
      timers: [] as { task: () => void; ms: number }[],
    };
    const clients: ClientLike[] = [
      {
        url: `${ORIGIN}/`,
        navigate: (url) => {
          calls.navigated.push(url);
          return Promise.resolve();
        },
      },
    ];
    const scope: WorkerScope = {
      caches,
      // Like a real worker scope: `fetch` must be called as its method, or the browser throws.
      fetch(this: unknown, input, init) {
        if (this !== scope) throw new TypeError("Illegal invocation");
        return fetcher(input, init);
      },
      location: { origin: ORIGIN },
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
        matchAll: () => Promise.resolve(clients),
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

  test("install precaches and does not skip waiting, activate drops old versions and claims", async () => {
    const { scope, caches, calls, fire } = fakeScope(installFetcher);
    await caches.open(`${CACHE_PREFIX}old`);
    attach(scope, config);
    const install = waitEvent();
    fire("install", install.event);
    await Promise.all(install.work);
    expect(calls.skipWaiting).toBe(0);
    expect(caches.stores.get(cacheName(config))?.size).toBe(3);
    const activate = waitEvent();
    fire("activate", activate.event);
    await Promise.all(activate.work);
    expect([...caches.stores.keys()]).toEqual([cacheName(config)]);
    expect(calls.claim).toBe(1);
  });

  test("fetch events: navigation and shell files are answered, the API and Google are not", async () => {
    const { scope, caches, fire } = fakeScope(() => Promise.resolve(page("net")));
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
    send(`${ORIGIN}/api/vitals`, "cors");
    send("https://maps.googleapis.com/maps/api/js", "no-cors");
    expect(answers).toHaveLength(2);
    // The first answer is the network race: let its 3 s timer be recorded but never fired.
    expect(await (await answers[0]).text()).toBe("net");
    expect(await (await answers[1]).text()).toBe("boot");
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

  test("the kill switch skips waiting, deletes every cache, unregisters, reloads pages and has no fetch or message handler", async () => {
    const { scope, caches, calls, listeners, fire } = fakeScope();
    await caches.open(`${CACHE_PREFIX}v1`);
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
    expect(calls.navigated).toEqual([`${ORIGIN}/`]);
  });

  test("a listener for an unrelated event type is simply absent", () => {
    const { scope, listeners, fire } = fakeScope();
    attach(scope, config);
    expect(listeners.has("push")).toBe(false);
    fire("push", {});
  });
});

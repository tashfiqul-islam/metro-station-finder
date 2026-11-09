import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  registerWorker,
  swCopy,
  type ContainerLike,
  type Env,
  type RegistrationLike,
  type WorkerLike,
} from "./register";

class FakeWorker implements WorkerLike {
  state = "installing";
  readonly messages: unknown[] = [];
  private readonly listeners: (() => void)[] = [];
  postMessage(message: unknown, _transfer: Transferable[]): void {
    this.messages.push(message);
  }
  addEventListener(_type: "statechange", listener: () => void): void {
    this.listeners.push(listener);
  }
  become(state: string): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}

class FakeRegistration implements RegistrationLike {
  active: unknown = {};
  waiting: WorkerLike | null = null;
  installing: WorkerLike | null = null;
  updates = 0;
  private foundListener: () => void = () => {};
  addEventListener(_type: "updatefound", listener: () => void): void {
    this.foundListener = listener;
  }
  update(): Promise<unknown> {
    this.updates += 1;
    return Promise.resolve();
  }
  found(worker: WorkerLike): void {
    this.installing = worker;
    this.foundListener();
  }
}

class FakeContainer implements ContainerLike {
  controller: unknown = {};
  readonly registration = new FakeRegistration();
  registered: [string, { scope: string; updateViaCache: "none" }][] = [];
  private changeListeners: (() => void)[] = [];
  register(script: string, options: { scope: string; updateViaCache: "none" }) {
    this.registered.push([script, options]);
    return Promise.resolve(this.registration);
  }
  addEventListener(_type: "controllerchange", listener: () => void): void {
    this.changeListeners.push(listener);
  }
  takeOver(): void {
    for (const listener of this.changeListeners) listener();
  }
}

interface Setup {
  container: FakeContainer;
  env: Env;
  timers: { task: () => void; ms: number }[];
  reloads: number[];
  online: { value: boolean };
  onlineTasks: (() => void)[];
}

function setup(): Setup {
  const container = new FakeContainer();
  const timers: Setup["timers"] = [];
  const reloads: number[] = [];
  const online = { value: true };
  const onlineTasks: (() => void)[] = [];
  const env: Env = {
    container,
    document,
    reload: () => reloads.push(1),
    later: (task, ms) => timers.push({ task, ms }),
    online: () => online.value,
    whenOnline: (task) => onlineTasks.push(task),
  };
  return { container, env, timers, reloads, online, onlineTasks };
}

beforeEach(() => {
  document.body.innerHTML =
    '<main><div class="panel__scroll" tabindex="-1"></div></main><section class="toast-region" aria-label="Notifications"></section>';
});
afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

const show = (state: "visible" | "hidden"): void => {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
};
const fire = (timers: Setup["timers"], ms: number): void => {
  for (const timer of timers.filter((item) => item.ms === ms)) timer.task();
};
const region = (): Element | null => document.querySelector(".toast-region [role=status]");
const action = (): HTMLButtonElement | null | undefined =>
  region()?.querySelector<HTMLButtonElement>("button.toast__action");
const close = (): HTMLButtonElement | null | undefined =>
  region()?.querySelector<HTMLButtonElement>("button[aria-label=Dismiss]");

test("METRO-106 registers /sw.js with root scope and no HTTP caching of the worker, and mounts an empty status region", async () => {
  const { container, env } = setup();
  await registerWorker(container, env);
  expect(container.registered).toEqual([["/sw.js", { scope: "/", updateViaCache: "none" }]]);
  expect(region()?.childElementCount).toBe(0);
  expect(document.querySelectorAll("[role=status]")).toHaveLength(1);
});

test("METRO-106 the region falls back to the body when the shell has no toast region", async () => {
  document.body.innerHTML = "";
  const { container, env } = setup();
  await registerWorker(container, env);
  expect(document.body.querySelector(":scope > [role=status]")).not.toBeNull();
});

test("METRO-106 the first install (no active worker when found) offers nothing", async () => {
  const { container, env, timers } = setup();
  container.registration.active = null;
  await registerWorker(container, env);
  const worker = new FakeWorker();
  container.registration.found(worker);
  worker.become("installed");
  expect(timers).toEqual([]);
  expect(region()?.childElementCount).toBe(0);
});

test("METRO-106 a first install whose 'installed' event arrives after the page was claimed offers nothing (WebKit order)", async () => {
  const { container, env, timers } = setup();
  container.registration.active = null;
  container.controller = null;
  await registerWorker(container, env);
  const worker = new FakeWorker();
  container.registration.found(worker);
  // The claim makes a controller appear (a change from none) before the page hears the worker is installed.
  container.controller = {};
  container.takeOver();
  worker.become("installed");
  expect(timers).toEqual([]);
  expect(region()?.childElementCount).toBe(0);
});

test("METRO-106 an update that installs while a worker is active fills the prompt after the region was mounted empty", async () => {
  const { container, env, timers } = setup();
  await registerWorker(container, env);
  const worker = new FakeWorker();
  container.registration.found(worker);
  worker.become("installing");
  expect(timers).toEqual([]);
  worker.become("installed");
  worker.become("installed"); // a second state event offers only once
  expect(timers.map((timer) => timer.ms)).toEqual([100]);
  expect(region()?.childElementCount).toBe(0);
  fire(timers, 100);
  expect(region()?.textContent).toContain(swCopy.ready);
  expect(region()?.querySelectorAll("button")).toHaveLength(2);
  expect(close()).not.toBeNull();
});

test("METRO-106 a worker already waiting at registration is offered too", async () => {
  const { container, env, timers } = setup();
  container.registration.waiting = new FakeWorker();
  await registerWorker(container, env);
  fire(timers, 100);
  expect(region()?.textContent).toContain(swCopy.ready);
});

test("METRO-106 Reload messages the registration's waiting worker, moves focus to Dismiss at once, says Updating, and the page reloads once the worker has taken over", async () => {
  const { container, env, timers, reloads } = setup();
  const waiting = new FakeWorker();
  container.registration.waiting = waiting;
  await registerWorker(container, env);
  fire(timers, 100);
  // A takeover that nobody asked for in a page that had no controller does not reload.
  action()?.focus();
  expect(document.activeElement).toBe(action());
  action()?.click();
  expect(waiting.messages).toEqual([{ type: "skip-waiting" }]);
  // Focus is not left on a button that just disappeared, and the polite status says what is going on.
  expect(action()?.hidden).toBe(true);
  expect(document.activeElement).toBe(close());
  expect(region()?.textContent).toContain(swCopy.updating);
  expect(reloads).toEqual([]);
  container.takeOver();
  expect(reloads).toEqual([1]);
});

test("METRO-106 when the new worker never takes over, the status says so in fixed words and focus stays on Dismiss", async () => {
  const { container, env, timers } = setup();
  container.registration.waiting = new FakeWorker();
  await registerWorker(container, env);
  fire(timers, 100);
  action()?.click();
  fire(timers, 5000);
  expect(region()?.textContent).toContain(swCopy.failed);
  expect(region()?.textContent).not.toContain(swCopy.updating);
  expect(document.activeElement).toBe(close());
});

test("METRO-106 Reload tells the waiting worker the registration holds now, not a stale reference to an older one (WebKit)", async () => {
  const { container, env, timers } = setup();
  const stale = new FakeWorker();
  const current = new FakeWorker();
  container.registration.waiting = stale;
  await registerWorker(container, env);
  container.registration.waiting = current;
  fire(timers, 100);
  action()?.click();
  expect(current.messages).toEqual([{ type: "skip-waiting" }]);
  expect(stale.messages).toEqual([]);
});

test("METRO-106 Reload after another tab already applied the update only reloads, and tells no worker", async () => {
  const { container, env, timers, reloads } = setup();
  const waiting = new FakeWorker();
  container.registration.waiting = waiting;
  await registerWorker(container, env);
  fire(timers, 100);
  container.registration.waiting = null; // another tab pressed Reload: the worker is active now
  action()?.click();
  expect(reloads).toEqual([1]);
  expect(waiting.messages).toEqual([]);
});

test("METRO-106 a tab that did not press Reload hears the takeover and is offered the reload instead of running old pages under a new worker", async () => {
  const { container, env, timers, reloads } = setup();
  await registerWorker(container, env);
  container.takeOver(); // another tab applied the update
  expect(reloads).toEqual([]);
  expect(timers.map((timer) => timer.ms)).toEqual([100]);
  fire(timers, 100);
  expect(region()?.textContent).toContain(swCopy.ready);
  action()?.click();
  expect(reloads).toEqual([1]);
  // Offered once: a second takeover does not stack another prompt.
  container.takeOver();
  expect(region()?.querySelectorAll(".toast")).toHaveLength(1);
});

test("METRO-106 a page that was uncontrolled when it loaded does not treat its first claim as an update, but a later takeover is one", async () => {
  const { container, env, timers } = setup();
  container.controller = null;
  await registerWorker(container, env);
  container.controller = {};
  container.takeOver(); // the first install claims the page
  expect(timers).toEqual([]);
  container.takeOver(); // a later takeover by another tab's update
  expect(timers.map((timer) => timer.ms)).toEqual([100]);
});

test("METRO-106 Dismiss removes the prompt and returns focus to the panel; the worker still waits", async () => {
  const { container, env, timers } = setup();
  const waiting = new FakeWorker();
  container.registration.waiting = waiting;
  await registerWorker(container, env);
  fire(timers, 100);
  close()?.focus();
  close()?.click();
  expect(region()?.childElementCount).toBe(0);
  expect(document.activeElement).toBe(document.querySelector(".panel__scroll"));
  expect(waiting.messages).toEqual([]);
});

test("METRO-106 Dismiss without focus inside the prompt leaves focus alone", async () => {
  const { container, env, timers } = setup();
  container.registration.waiting = new FakeWorker();
  await registerWorker(container, env);
  fire(timers, 100);
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  close()?.click();
  expect(document.activeElement).toBe(outside);
});

test("METRO-106 a shown page asks for a newer worker only while online", async () => {
  const { container, env, online } = setup();
  await registerWorker(container, env);
  show("hidden");
  expect(container.registration.updates).toBe(0);
  show("visible");
  expect(container.registration.updates).toBe(1);
  online.value = false;
  show("visible");
  expect(container.registration.updates).toBe(1);
  // A failed check is silent.
  online.value = true;
  container.registration.update = () => Promise.reject(new Error("blocked"));
  show("visible");
  Reflect.deleteProperty(document, "visibilityState");
});

test("METRO-106 without service worker support nothing happens", async () => {
  vi.stubGlobal("navigator", {});
  await registerWorker();
  expect(document.querySelector("[role=status]")).toBeNull();
});

test("METRO-106 with the browser's own container the defaults register, reload and read the connection", async () => {
  const container = new FakeContainer();
  vi.stubGlobal("navigator", { serviceWorker: container, onLine: true });
  const waiting = new FakeWorker();
  container.registration.waiting = waiting;
  vi.useFakeTimers();
  try {
    await registerWorker();
    await vi.advanceTimersByTimeAsync(100);
    expect(region()?.textContent).toContain(swCopy.ready);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(container.registration.updates).toBe(1);
    Reflect.deleteProperty(document, "visibilityState");
    // The default reload is location.reload(); the takeover path is covered above with a fake.
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    action()?.click();
    container.takeOver();
    expect(reload).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(5000);
    expect(region()?.textContent).toContain(swCopy.failed);
  } finally {
    vi.useRealTimers();
  }
});

test("METRO-106 offline, nothing is registered now; the registration runs once, when the connection returns", async () => {
  const { container, env, online, onlineTasks } = setup();
  online.value = false;
  await registerWorker(container, env);
  expect(container.registered).toEqual([]);
  expect(document.querySelector("[role=status]")).toBeNull();
  expect(onlineTasks).toHaveLength(1);
  online.value = true;
  onlineTasks[0]?.();
  await vi.waitFor(() => {
    expect(container.registered).toHaveLength(1);
  });
  expect(document.querySelectorAll("[role=status]")).toHaveLength(1);
});

test("METRO-106 the default online hook listens for the window's online event once", async () => {
  const container = new FakeContainer();
  vi.stubGlobal("navigator", { serviceWorker: container, onLine: false });
  await registerWorker();
  expect(container.registered).toEqual([]);
  vi.stubGlobal("navigator", { serviceWorker: container, onLine: true });
  window.dispatchEvent(new Event("online"));
  await vi.waitFor(() => {
    expect(container.registered).toHaveLength(1);
  });
  window.dispatchEvent(new Event("online"));
  expect(container.registered).toHaveLength(1);
});

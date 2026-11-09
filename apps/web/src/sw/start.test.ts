import { expect, test, vi } from "vitest";

import { startServiceWorker } from "./start";

test("METRO-106 nothing is scheduled, let alone loaded, unless enabled (dev server, unit tests)", () => {
  const schedule = vi.fn();
  const load = vi.fn();
  startServiceWorker(false, schedule, load);
  expect(schedule).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
});

test("METRO-106 the registration chunk loads only when the scheduler runs the task, then registers", async () => {
  const registerWorker = vi.fn(() => Promise.resolve());
  const load = vi.fn(() => Promise.resolve({ registerWorker }));
  const tasks: (() => void)[] = [];
  startServiceWorker(
    true,
    (run) => {
      tasks.push(run);
    },
    load,
  );
  expect(load).not.toHaveBeenCalled();
  tasks[0]?.();
  await vi.waitFor(() => {
    expect(registerWorker).toHaveBeenCalledOnce();
  });
});

test("METRO-106 a chunk that cannot load, or a registration that fails, is dropped without a log", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const tasks: (() => void)[] = [];
  const schedule = (run: () => void): void => {
    tasks.push(run);
  };
  startServiceWorker(true, schedule, () => Promise.reject(new Error("offline key=abc")));
  startServiceWorker(true, schedule, () =>
    Promise.resolve({ registerWorker: () => Promise.reject(new Error("blocked at 23.7,90.4")) }),
  );
  for (const run of tasks) run();
  await new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
  expect(log).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
  log.mockRestore();
  warn.mockRestore();
});

test("METRO-106 the default loader imports the real registration module, which does nothing without worker support", async () => {
  // happy-dom has no navigator.serviceWorker: registration returns quietly and mounts nothing.
  const tasks: (() => void)[] = [];
  startServiceWorker(true, (run) => {
    tasks.push(run);
  });
  tasks[0]?.();
  await vi.waitFor(() => {
    expect(document.querySelector("[role=status]")).toBeNull();
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
  expect(document.querySelector("[role=status]")).toBeNull();
});

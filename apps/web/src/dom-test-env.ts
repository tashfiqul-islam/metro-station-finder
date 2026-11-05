import { GlobalRegistrator } from "@happy-dom/global-registrator";

/**
 * One happy-dom registration per test process, switched on only while a component test file runs.
 *
 * Bun runs all test files in one process and caches modules. React, the scheduler and Testing
 * Library bind to the globals that exist when they are first imported, so unregistering a DOM
 * after one file and registering a new one for the next left a stale React (measured: `findBy*`
 * timed out after 1 s in whichever file ran second). So the DOM is registered once and kept.
 *
 * But registering replaces 36 of Bun's globals (measured: fetch, Request, Response, Headers, URL,
 * AbortController, AbortSignal, timers, Event classes, ...) and adds about 500 more (window,
 * document, ...). Left on, every non-DOM test in the process would run against happy-dom's
 * networking. The first import therefore snapshots the globals before and after registering, and
 * `restoreBunGlobals` / `enableDomGlobals` swap between the two snapshots. DOM test files call
 * `enableDomGlobals()` in `beforeAll`, `restoreBunGlobals()` in `afterAll`, and also `restoreBunGlobals()`
 * once their top-level imports are done (the imports must run with the DOM on).
 */
type Snapshot = ReadonlyMap<string | symbol, PropertyDescriptor>;

function snapshot(): Map<string | symbol, PropertyDescriptor> {
  const result = new Map<string | symbol, PropertyDescriptor>();
  for (const key of Reflect.ownKeys(globalThis)) {
    const descriptor = Reflect.getOwnPropertyDescriptor(globalThis, key);
    if (descriptor) result.set(key, descriptor);
  }
  return result;
}

function apply(target: Snapshot, other: Snapshot): void {
  for (const key of other.keys()) if (!target.has(key)) Reflect.deleteProperty(globalThis, key);
  for (const [key, descriptor] of target) {
    const current = Reflect.getOwnPropertyDescriptor(globalThis, key);
    const same = current?.value === descriptor.value && current?.get === descriptor.get;
    if (!same) Reflect.defineProperty(globalThis, key, descriptor);
  }
}

const bun: Snapshot = snapshot();
GlobalRegistrator.register();
const dom: Snapshot = snapshot();

export function enableDomGlobals(): void {
  apply(dom, bun);
}

export function restoreBunGlobals(): void {
  apply(bun, dom);
}

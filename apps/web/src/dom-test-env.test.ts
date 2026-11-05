import { restoreBunGlobals, enableDomGlobals } from "./dom-test-env";

/** Globals happy-dom replaces and non-DOM tests rely on (measured: 36 keys are replaced). */
const NATIVE_KEYS = [
  "fetch",
  "Request",
  "Response",
  "Headers",
  "FormData",
  "URL",
  "AbortController",
  "AbortSignal",
  "Blob",
  "File",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "queueMicrotask",
  "Event",
  "EventTarget",
  "TransformStream",
  "WritableStream",
] as const;

const isNative = (key: string): boolean =>
  /\[native code\]/u.test(Function.prototype.toString.call(Reflect.get(globalThis, key)));

test("METRO-58 Bun's own globals are in place outside the DOM component tests", () => {
  restoreBunGlobals();
  for (const key of NATIVE_KEYS) expect(isNative(key), key).toBe(true);
  expect(Reflect.has(globalThis, "document")).toBe(false);
  expect(Reflect.has(globalThis, "window")).toBe(false);
});

test("METRO-58 the DOM globals can be switched on and off again without leaking", () => {
  restoreBunGlobals();
  const bunFetch = globalThis.fetch;
  enableDomGlobals();
  try {
    expect(Reflect.has(globalThis, "document")).toBe(true);
    expect(globalThis.fetch).not.toBe(bunFetch);
  } finally {
    restoreBunGlobals();
  }
  expect(globalThis.fetch).toBe(bunFetch);
  expect(Reflect.has(globalThis, "document")).toBe(false);
});

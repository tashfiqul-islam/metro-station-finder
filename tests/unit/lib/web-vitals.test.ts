import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const onCLS = vi.fn();
const onFCP = vi.fn();
const onINP = vi.fn();
const onLCP = vi.fn();
const onTTFB = vi.fn();

vi.mock("web-vitals", () => ({
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
}));

describe("reportWebVitals", () => {
  const originalWindow = globalThis.window;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    vi.resetModules();
    onCLS.mockReset();
    onFCP.mockReset();
    onINP.mockReset();
    onLCP.mockReset();
    onTTFB.mockReset();
    console.log = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      globalThis.window = originalWindow;
    }
  });

  it("returns early when window is undefined", async () => {
    Reflect.deleteProperty(globalThis, "window");
    const { reportWebVitals } = await import("@/lib/web-vitals");

    reportWebVitals();

    expect(onCLS).not.toHaveBeenCalled();
    expect(onFCP).not.toHaveBeenCalled();
    expect(onINP).not.toHaveBeenCalled();
    expect(onLCP).not.toHaveBeenCalled();
    expect(onTTFB).not.toHaveBeenCalled();
  });

  it("registers all five web vital observers when window exists", async () => {
    globalThis.window = {} as Window & typeof globalThis;
    const { reportWebVitals } = await import("@/lib/web-vitals");

    reportWebVitals();

    expect(onCLS).toHaveBeenCalledTimes(1);
    expect(onFCP).toHaveBeenCalledTimes(1);
    expect(onINP).toHaveBeenCalledTimes(1);
    expect(onLCP).toHaveBeenCalledTimes(1);
    expect(onTTFB).toHaveBeenCalledTimes(1);
  });

  it("logs metrics in dev mode through the registered callback", async () => {
    globalThis.window = {} as Window & typeof globalThis;
    const { reportWebVitals } = await import("@/lib/web-vitals");

    reportWebVitals();

    const callback = onCLS.mock.calls[0]?.[0] as ((metric: unknown) => void) | undefined;
    if (!callback) {
      throw new Error("Expected web vitals callback");
    }

    Reflect.apply(callback, undefined, [{ name: "CLS", value: 0.01 }]);

    expect(console.log).toHaveBeenCalledWith("[Web Vitals]", { name: "CLS", value: 0.01 });
  });
});

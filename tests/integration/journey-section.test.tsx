import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clamp,
  getDotPositions,
  getScrollProgress,
  JourneySection,
  measureTimelineState,
  measureTimelineStateOrNull,
  TimelineDot,
} from "@/pages/home/sections/journey-section";

let resizeCallback: ResizeObserverCallback | null = null;
let rafCallbacks: FrameRequestCallback[] = [];

beforeEach(() => {
  rafCallbacks = [];
  resizeCallback = null;

  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      constructor(...args: [ResizeObserverCallback]) {
        const [observerCallback] = args;
        resizeCallback = observerCallback;
      }

      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );

  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((...args: [FrameRequestCallback]) => {
      const [frameCallback] = args;
      rafCallbacks.push(frameCallback);
      return rafCallbacks.length;
    }),
  );

  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const flushAnimationFrames = () => {
  while (rafCallbacks.length > 0) {
    const queue = [...rafCallbacks];
    rafCallbacks = [];
    for (const callback of queue) {
      Reflect.apply(callback, undefined, [0]);
    }
  }
};

describe("JourneySection", () => {
  it("clamps values to the requested range", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it("returns full progress when timeline distance is non-positive", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 100,
    });

    const element = document.createElement("div");
    element.getBoundingClientRect = () =>
      ({
        bottom: 10,
        height: -70,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 10,
        width: 0,
        x: 0,
        y: 10,
      }) as DOMRect;

    expect(getScrollProgress(element)).toBe(1);
  });

  it("falls back to documentElement height and then 1 when innerHeight is unavailable", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 200,
    });

    const element = document.createElement("div");
    element.getBoundingClientRect = () =>
      ({
        bottom: 50,
        height: 100,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 50,
        width: 0,
        x: 0,
        y: 50,
      }) as DOMRect;

    expect(getScrollProgress(element)).toBeGreaterThan(0);

    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 0,
    });

    expect(getScrollProgress(element)).toBe(0);
  });

  it("maps missing dots to zero positions", () => {
    const containerRect = {
      top: 100,
    } as DOMRect;
    const dot = document.createElement("div");
    dot.getBoundingClientRect = () =>
      ({
        bottom: 170,
        height: 40,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 130,
        width: 40,
        x: 0,
        y: 130,
      }) as DOMRect;

    expect(getDotPositions(containerRect, [null, dot])).toEqual([0, 50]);
  });

  it("returns null measurement when the timeline element is missing", () => {
    expect(measureTimelineStateOrNull(null, [])).toBeNull();
  });

  it("measures a timeline element through the nullable helper when it exists", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });

    const element = document.createElement("div") as HTMLDivElement;
    element.getBoundingClientRect = () =>
      ({
        bottom: 900,
        height: 800,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 100,
        width: 0,
        x: 0,
        y: 100,
      }) as DOMRect;

    expect(measureTimelineStateOrNull(element, [])).toEqual(
      expect.objectContaining({ height: 800, positions: [], progress: expect.any(Number) }),
    );
  });

  it("adds the current-dot class when fill opacity is active", () => {
    const { container } = render(
      <TimelineDot
        accentSolid="oklch(0.64 0.2 145)"
        current
        fillOpacity={0.1}
        fillScale={1}
        registerDot={() => {}}
      />,
    );

    expect(container.querySelector(".journey-stop-current")).not.toBeNull();
  });

  it("measures a timeline element directly", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });

    const element = document.createElement("div") as HTMLDivElement;
    element.getBoundingClientRect = () =>
      ({
        bottom: 900,
        height: 800,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 100,
        width: 0,
        x: 0,
        y: 100,
      }) as DOMRect;

    const dot = document.createElement("div") as HTMLDivElement;
    dot.getBoundingClientRect = () =>
      ({
        bottom: 190,
        height: 40,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 150,
        width: 40,
        x: 0,
        y: 150,
      }) as DOMRect;

    expect(measureTimelineState(element, [dot]).positions).toEqual([70]);
  });

  it("renders without crashing", () => {
    render(<JourneySection />);
    expect(document.body.firstChild).toBeDefined();
  });

  it('has "The journey" heading', () => {
    render(<JourneySection />);
    expect(screen.getByText("The journey")).toBeDefined();
  });

  it("renders all 4 version badges", () => {
    render(<JourneySection />);
    expect(screen.getByText("v0.1.0")).toBeDefined();
    expect(screen.getByText("v0.2.0")).toBeDefined();
    expect(screen.getByText("prerelease")).toBeDefined();
    expect(screen.getByText("v1.0.0")).toBeDefined();
  });

  it('has "Current baseline" text for the current stop', () => {
    render(<JourneySection />);
    expect(screen.getByText("Current baseline")).toBeDefined();
  });

  it("current stop renders the Live baseline badge", () => {
    render(<JourneySection />);
    expect(screen.getByText("Live baseline")).toBeDefined();
  });

  it("renders the center timeline rail for desktop layout", () => {
    const { container } = render(<JourneySection />);
    expect(container.querySelector("[data-timeline-ref]")).not.toBeNull();
    expect(container.querySelector('[class*="md:left-1/2"]')).not.toBeNull();
  });

  it("renders desktop timeline dots between left and right cards", () => {
    const { container } = render(<JourneySection />);
    expect(container.querySelectorAll(".md\\:w-16").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".timeline-circle-glow").length).toBeGreaterThan(0);
  });

  it("measures the timeline and updates the rail fill on scroll", () => {
    const { container } = render(<JourneySection />);

    const timeline = container.querySelector("[data-timeline-ref]") as HTMLDivElement | null;
    expect(timeline).not.toBeNull();

    if (!timeline) {
      throw new Error("Missing timeline container");
    }

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });

    timeline.getBoundingClientRect = () =>
      ({
        bottom: 600,
        height: 800,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: -200,
        width: 0,
        x: 0,
        y: -200,
      }) as DOMRect;

    const dotWrappers = [...container.querySelectorAll(".rounded-full.bg-background")];
    for (const [index, dot] of dotWrappers.entries()) {
      (dot as HTMLDivElement).getBoundingClientRect = () =>
        ({
          bottom: 190 + index * 120,
          height: 40,
          left: 0,
          right: 0,
          toJSON: () => ({}),
          top: 150 + index * 120,
          width: 40,
          x: 0,
          y: 150 + index * 120,
        }) as DOMRect;
    }

    act(() => {
      resizeCallback?.([], {} as ResizeObserver);
      flushAnimationFrames();
    });

    const fillLine = container.querySelector('[class*="will-change-"]') as HTMLDivElement | null;
    expect(fillLine).not.toBeNull();
    expect(fillLine?.style.height).not.toBe("0px");
    expect(fillLine?.style.opacity).not.toBe("0");

    act(() => {
      window.dispatchEvent(new Event("scroll"));
      flushAnimationFrames();
    });

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("keeps the rail fill hidden when scroll progress is zero", () => {
    const { container } = render(<JourneySection />);

    const timeline = container.querySelector("[data-timeline-ref]") as HTMLDivElement | null;
    if (!timeline) {
      throw new Error("Missing timeline container");
    }

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1000,
    });

    timeline.getBoundingClientRect = () =>
      ({
        bottom: 1700,
        height: 800,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 1200,
        width: 0,
        x: 0,
        y: 1200,
      }) as DOMRect;

    act(() => {
      resizeCallback?.([], {} as ResizeObserver);
      flushAnimationFrames();
    });

    const fillLine = container.querySelector('[class*="will-change-"]') as HTMLDivElement | null;
    expect(fillLine?.style.height).toBe("0px");
    expect(fillLine?.style.opacity).toBe("0");
  });
});

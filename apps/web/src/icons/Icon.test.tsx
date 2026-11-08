import { cleanup, render } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { Icon } from "./Icon";
import * as data from "./icon-data";
import type { IconShapes } from "./icon-data";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

/** `import * as` also lists the type-only exports as nothing, so every entry here is an icon. */
const icons = Object.entries<IconShapes>(data);

test("METRO-105 the handoff icon set has 31 icons, each with at least one shape", () => {
  expect(icons).toHaveLength(31);
  for (const [name, shapes] of icons) expect(shapes.length, name).toBeGreaterThan(0);
});

test("METRO-105 every icon renders a hidden, unfocusable currentColor SVG by default", () => {
  for (const [name, shapes] of icons) {
    const { container } = render(<Icon icon={shapes} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden"), name).toBe("true");
    expect(svg?.getAttribute("role"), name).toBeNull();
    expect(svg?.getAttribute("focusable"), name).toBe("false");
    expect(svg?.getAttribute("stroke"), name).toBe("currentColor");
    expect(svg?.getAttribute("width"), name).toBe("20");
    expect(svg?.childElementCount, name).toBe(shapes.length);
    expect(svg?.hasAttribute("style"), name).toBe(false);
    cleanup();
  }
});

test("METRO-105 a label makes the icon an image with that name and size can change", () => {
  const { container } = render(<Icon icon={data.search} size={16} label="Search" />);
  const svg = container.querySelector("svg");
  expect(svg?.getAttribute("role")).toBe("img");
  expect(svg?.getAttribute("aria-label")).toBe("Search");
  expect(svg?.getAttribute("aria-hidden")).toBeNull();
  expect(svg?.getAttribute("height")).toBe("16");
});

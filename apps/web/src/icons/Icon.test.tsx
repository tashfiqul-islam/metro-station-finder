import { cleanup, render } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { Icon } from "./Icon";
import type { IconShapes } from "./Icon";
import { search } from "./shapes/search";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

/** Every module in `shapes/`: one icon each, so a new file is checked without editing this test. */
const modules = import.meta.glob<Record<string, IconShapes>>("./shapes/*.ts", { eager: true });
const icons = Object.entries(modules).flatMap(([file, exports]) =>
  Object.entries(exports).map(([name, shapes]) => ({ file, name, shapes })),
);

test("METRO-105 the handoff icon set has 31 icons, one module each, with at least one shape", () => {
  expect(Object.keys(modules)).toHaveLength(31);
  expect(icons).toHaveLength(31);
  for (const { file, name, shapes } of icons) {
    // The file name is the export name in kebab case: `locate-off.ts` exports `locateOff`.
    const kebab = name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
    expect(file, name).toBe(`./shapes/${kebab}.ts`);
    expect(shapes.length, name).toBeGreaterThan(0);
  }
});

test("METRO-105 every icon renders a hidden, unfocusable currentColor SVG by default", () => {
  for (const { name, shapes } of icons) {
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
  const { container } = render(<Icon icon={search} size={16} label="Search" />);
  const svg = container.querySelector("svg");
  expect(svg?.getAttribute("role")).toBe("img");
  expect(svg?.getAttribute("aria-label")).toBe("Search");
  expect(svg?.getAttribute("aria-hidden")).toBeNull();
  expect(svg?.getAttribute("height")).toBe("16");
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { Brand } from "./Brand";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-105 the brand is one Home link whose name holds the whole visible wordmark", () => {
  const { container } = render(<Brand />);
  const link = screen.getByRole("link", { name: "Metro Station Finder, home" });
  expect(link.getAttribute("href")).toBe("/");
  expect(container.querySelectorAll("a")).toHaveLength(1);
  // WCAG 2.5.3 Label in Name: the accessible name contains the visible text, on phones and from 768 px.
  const visible = container.querySelector(".brand__name")?.textContent ?? "";
  // A real space between the words, so axe's label-content-name-mismatch reads "Metro Station Finder".
  expect(visible).toBe("Metro Station Finder");
  expect(link.getAttribute("aria-label")).toContain("Metro Station Finder");
});

test("METRO-105 the mark is decorative inline SVG with the intro animation hooks and no inline style", () => {
  const { container } = render(<Brand />);
  const svg = container.querySelector("svg.mark");
  expect(svg?.getAttribute("aria-hidden")).toBe("true");
  expect(svg?.getAttribute("focusable")).toBe("false");
  expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
  expect(container.querySelectorAll(".mark-anim-line")).toHaveLength(1);
  expect(container.querySelectorAll(".mark-anim-station")).toHaveLength(1);
  expect(container.querySelectorAll(".mark-anim-ping")).toHaveLength(2);
  expect(container.querySelector("#brand-mark-g")).not.toBeNull();
  expect(container.querySelector("#brand-mark-k")).not.toBeNull();
  expect(container.querySelectorAll("[style]")).toHaveLength(0);
  // Colours come from classes (tokens in brand.css), never from literals in the markup.
  expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}"|rgb\(/iu);
});

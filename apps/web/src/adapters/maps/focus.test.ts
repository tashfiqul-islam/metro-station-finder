import { afterEach, expect, test } from "vitest";

import { focusElement, focusSearchControl } from "./focus";

afterEach(() => {
  document.body.replaceChildren();
});

function mountHost(mode: "open" | "none"): { host: HTMLElement; inner: HTMLInputElement | null } {
  const host = document.createElement("gmp-place-autocomplete");
  host.tabIndex = 0;
  let inner: HTMLInputElement | null = null;
  if (mode === "open") {
    inner = document.createElement("input");
    inner.value = "Motijheel";
    host.attachShadow({ mode: "open" }).append(inner);
  }
  document.body.append(host);
  return { host, inner };
}

test("METRO-114 focusing the plain input puts the caret at the end of the typed text", () => {
  const input = document.createElement("input");
  input.value = "Moti";
  document.body.append(input);
  focusElement(input);
  expect(document.activeElement).toBe(input);
  expect(input.selectionStart).toBe(4);
  expect(input.selectionEnd).toBe(4);
});

test("METRO-114 focusing a widget host reaches its inner input when the shadow root is readable", () => {
  const { host, inner } = mountHost("open");
  focusElement(host);
  expect(host.shadowRoot?.activeElement).toBe(inner);
  expect(inner?.selectionStart).toBe(9);
});

test("METRO-114 with an unreadable shadow root only the host is focused (what is verified is the host)", () => {
  const { host } = mountHost("none");
  focusElement(host);
  expect(document.activeElement).toBe(host);
});

test("METRO-114 focusSearchControl prefers the visible plain input and skips a hidden one", () => {
  const root = document.createElement("div");
  const plain = document.createElement("input");
  const { host } = mountHost("none");
  root.append(plain);
  document.body.append(root);
  expect(focusSearchControl(root)).toBe(true);
  expect(document.activeElement).toBe(plain);
  plain.hidden = true;
  root.append(host);
  expect(focusSearchControl(root)).toBe(true);
  expect(document.activeElement).toBe(host);
});

test("METRO-114 focusSearchControl reports when there is nothing to focus", () => {
  expect(focusSearchControl(null)).toBe(false);
  expect(focusSearchControl(document.createElement("div"))).toBe(false);
});

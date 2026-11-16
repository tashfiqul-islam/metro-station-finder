import { act, cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

import { usePathname } from "./navigation";

function Path() {
  return <p>{usePathname()}</p>;
}

const goTo = (path: string): void => {
  window.history.replaceState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
beforeEach(() => {
  window.history.replaceState(null, "", "/");
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-159 usePathname reads the pathname", () => {
  window.history.replaceState(null, "", "/start");
  render(<Path />);
  expect(screen.getByText("/start")).toBeTruthy();
});

test("METRO-159 Back and Forward (popstate) update the pathname, and an unmounted component stops listening", () => {
  const view = render(<Path />);
  act(() => {
    goTo("/b");
  });
  expect(screen.getByText("/b")).toBeTruthy();
  const remove = vi.spyOn(window, "removeEventListener");
  view.unmount();
  expect(remove).toHaveBeenCalledWith("popstate", expect.any(Function));
  remove.mockRestore();
});

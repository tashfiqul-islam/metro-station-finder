import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { AppRoutes } from "./AppRoutes";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-88 /nearest renders the nearest-station slice with the real adapter and no key", () => {
  render(<AppRoutes pathname="/nearest" />);
  expect(screen.getByRole("heading", { level: 1, name: "Nearest Metro station" })).toBeTruthy();
  // No build-time key in tests: the visible "maps unavailable" state, and nothing loads from Google.
  expect(screen.getByRole("alert").textContent).toContain("Place search is unavailable");
});

test("METRO-88 every other path renders the scaffold page until it is retired", () => {
  // The scaffold page fetches its status; keep that request pending so no network is touched.
  const realFetch = globalThis.fetch;
  globalThis.fetch = Object.assign(() => new Promise<Response>(() => {}), { preconnect: () => {} });
  try {
    for (const pathname of ["/", "/deep/link", "/nearest/extra"]) {
      render(<AppRoutes pathname={pathname} />);
      expect(screen.getByRole("heading", { level: 1, name: "Metro scaffold" })).toBeTruthy();
      cleanup();
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("METRO-88 /nearest/ with a trailing slash renders the slice too", () => {
  render(<AppRoutes pathname="/nearest/" />);
  expect(screen.getByRole("heading", { level: 1, name: "Nearest Metro station" })).toBeTruthy();
});

import { cleanup, renderHook } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { useMapView } from "./use-map-view";
import { FIT } from "./view";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-126 a view whose svg was never attached wires no wheel listener and starts at the fit view", () => {
  const { result, unmount } = renderHook(() => useMapView());
  expect(result.current.svg.current).toBeNull();
  expect(result.current.view).toEqual(FIT);
  // The effect had nothing to clean up: unmounting is quiet.
  expect(() => {
    unmount();
  }).not.toThrow();
});

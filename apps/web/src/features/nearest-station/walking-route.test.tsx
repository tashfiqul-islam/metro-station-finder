import { baselineDataset, walkingDistanceMeters } from "@metro/core";
import type { Coordinate } from "@metro/core";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";

import type { MapsState, RouteService, WalkingRoute } from "../../adapters/maps/context";
import { useWalkingRoute } from "./walking-route";

const [station] = baselineDataset.stations;
if (station === undefined) throw new Error("The baseline dataset has no station");
const origin: Coordinate = { lat: 23.87, lng: 90.367 };
const answer: WalkingRoute = { distance: walkingDistanceMeters(1200), durationSeconds: 840 };

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);

function state(service: RouteService | null): MapsState {
  return { status: "ready", routes: service, load: vi.fn() };
}

test("METRO-126 a new service object for the same result attaches to the one request and never asks twice", async () => {
  const walk = vi.fn<RouteService["walk"]>(() => Promise.resolve(answer));
  const { result, rerender } = renderHook(
    ({ maps }: { maps: MapsState }) => useWalkingRoute(maps, origin, station),
    { initialProps: { maps: state({ walk }) } },
  );
  await waitFor(() => expect(result.current).toEqual({ phase: "success", route: answer }));
  // The provider publishes a different service object (same result key): the effect runs again.
  act(() => rerender({ maps: state({ walk }) }));
  expect(walk).toHaveBeenCalledTimes(1);
  expect(result.current).toEqual({ phase: "success", route: answer });
});

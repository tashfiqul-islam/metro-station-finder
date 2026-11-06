import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { createRouteService, useRouteService } from "./routes";
import type { RouteApi, RouteResponse } from "./routes";

const library = vi.hoisted(() => ({ routes: null as unknown }));

vi.mock("@vis.gl/react-google-maps", () => ({ useMapsLibrary: () => library.routes }));

const origin = { lat: 23.8, lng: 90.4 };
const destination = { lat: 23.7, lng: 90.41 };

function fakeApi(result: RouteResponse) {
  const calls = vi.fn<RouteApi["computeRoutes"]>(() => Promise.resolve(result));
  return { api: { computeRoutes: calls }, calls };
}

afterEach(() => {
  cleanup();
  library.routes = null;
});

test("METRO-88 asks for WALKING with only distance and duration and returns plain values", async () => {
  const { api, calls } = fakeApi({ routes: [{ distanceMeters: 1234, durationMillis: 900_400 }] });
  const route = await createRouteService(api).walk(origin, destination);
  expect(route).toEqual({ distance: 1234, durationSeconds: 900 });
  expect(calls).toHaveBeenCalledTimes(1);
  expect(calls).toHaveBeenCalledWith({
    origin,
    destination,
    travelMode: "WALKING",
    fields: ["distanceMeters", "durationMillis"],
  });
});

test("METRO-88 one request per pair: repeats and StrictMode re-runs share the result", async () => {
  const { api, calls } = fakeApi({ routes: [{ distanceMeters: 10, durationMillis: 1000 }] });
  const first = createRouteService(api);
  const second = createRouteService(api);
  const [a, b, c] = await Promise.all([
    first.walk(origin, destination),
    first.walk(origin, destination),
    second.walk(origin, destination),
  ]);
  expect(a).toBe(b);
  expect(b).toBe(c);
  expect(calls).toHaveBeenCalledTimes(1);
  await first.walk(destination, origin);
  expect(calls).toHaveBeenCalledTimes(2);
});

test("METRO-88 an empty or incomplete result is a failure with no usable message", async () => {
  for (const result of [
    { routes: [] },
    { routes: undefined },
    { routes: [{ distanceMeters: 5 }] },
    { routes: [{ durationMillis: 5 }] },
  ]) {
    const { api } = fakeApi(result);
    await expect(createRouteService(api).walk(origin, destination)).rejects.toThrow(
      "No walking route",
    );
  }
});

test("METRO-88 a rejected request is not cached and not retried by itself", async () => {
  const calls = vi
    .fn<RouteApi["computeRoutes"]>()
    .mockRejectedValueOnce(new Error("secret https://example.test?lat=23.8"))
    .mockResolvedValueOnce({ routes: [{ distanceMeters: 7, durationMillis: 7000 }] });
  const service = createRouteService({ computeRoutes: calls });
  await expect(service.walk(origin, destination)).rejects.toThrow("secret");
  expect(calls).toHaveBeenCalledTimes(1);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await expect(service.walk(origin, destination)).resolves.toEqual({
    distance: 7,
    durationSeconds: 7,
  });
  expect(calls).toHaveBeenCalledTimes(2);
});

test("METRO-88 a negative distance from the provider is a failure, not a value", async () => {
  const { api } = fakeApi({ routes: [{ distanceMeters: -1, durationMillis: 1000 }] });
  await expect(createRouteService(api).walk(origin, destination)).rejects.toThrow(
    "Walking distance must be",
  );
});

function Probe() {
  return <p>{useRouteService() === null ? "waiting" : "ready"}</p>;
}

test("METRO-88 the hook is null until the routes library is loaded, then a service", () => {
  render(<Probe />);
  expect(screen.getByText("waiting")).toBeTruthy();
  cleanup();
  library.routes = { Route: fakeApi({ routes: [] }).api };
  render(<Probe />);
  expect(screen.getByText("ready")).toBeTruthy();
});

import { expect, test } from "vitest";

import { matchRoute, routes } from "./routes";
import type { RouteTable } from "./routes";

const load = () => Promise.resolve({ default: () => null });
const table: RouteTable = [
  { path: "/", load },
  { path: "/line", load },
];

test("METRO-159 the app's route table has Nearby only, at the root", () => {
  expect(routes.map(({ path }) => path)).toEqual(["/"]);
});

test("METRO-159 a path picks its own route, with or without a trailing slash", () => {
  expect(matchRoute(table, "/line")).toBe(table[1]);
  expect(matchRoute(table, "/line/")).toBe(table[1]);
  expect(matchRoute(table, "/")).toBe(table[0]);
});

test("METRO-159 an unknown path keeps the first route, as before the table", () => {
  expect(matchRoute(table, "/stations/nowhere")).toBe(table[0]);
  expect(matchRoute(table, "/line/extra")).toBe(table[0]);
});

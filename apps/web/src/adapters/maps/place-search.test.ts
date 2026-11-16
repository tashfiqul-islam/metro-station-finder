import { baselineDataset } from "@metro/core";
import { expect, test, vi } from "vitest";
import type { Mock } from "vitest";

import {
  createPlaceSearch,
  lineBounds,
  MAX_PLACES,
  PLACE_FIELDS,
  REGION_CODES,
} from "./place-search";
import type { PlacesApi, PredictionLike, SuggestionLike, SuggestRequest } from "./place-search";

class FakeToken {
  static made = 0;
  readonly id: number;
  constructor() {
    FakeToken.made += 1;
    this.id = FakeToken.made;
  }
}

interface FakePlace {
  fetchFields: Mock<(request: { fields: string[] }) => Promise<unknown>>;
  location: { lat(): number; lng(): number } | null | undefined;
}

function text(value: string, matches: [number, number][] = []) {
  return {
    text: value,
    matches: matches.map(([startOffset, endOffset]) => ({ startOffset, endOffset })),
  };
}

function prediction(
  id: string,
  name: string,
  target: FakePlace,
  extra: Partial<PredictionLike> = {},
): SuggestionLike {
  return {
    placePrediction: {
      placeId: id,
      text: text(`${name}, Dhaka`),
      mainText: text(name, [[0, 3]]),
      secondaryText: text("Dhaka"),
      toPlace: () => target,
      ...extra,
    },
  };
}

function fakeApi(suggestions: SuggestionLike[]) {
  const requests: SuggestRequest[] = [];
  const fetchAutocompleteSuggestions = vi.fn((request: SuggestRequest) => {
    requests.push(request);
    return Promise.resolve({ suggestions });
  });
  const api: PlacesApi = {
    AutocompleteSessionToken: FakeToken,
    AutocompleteSuggestion: { fetchAutocompleteSuggestions },
  };
  return { api, requests, fetchAutocompleteSuggestions };
}

function place(lat: number, lng: number): FakePlace {
  return {
    fetchFields: vi.fn(() => Promise.resolve({})),
    location: { lat: () => lat, lng: () => lng },
  };
}

test("METRO-163 the request carries the input, the region, the box around the line and the session token", async () => {
  FakeToken.made = 0;
  const { api, requests } = fakeApi([]);
  const search = createPlaceSearch(api);
  await search.suggest("gul");
  const [request] = requests;
  expect(request?.input).toBe("gul");
  expect(request?.includedRegionCodes).toEqual(["bd"]);
  expect(REGION_CODES).toEqual(["bd"]);
  expect(request?.locationRestriction).toEqual(lineBounds(baselineDataset.stations));
  expect(request?.sessionToken).toBeInstanceOf(FakeToken);
});

test("METRO-163 the box encloses every station with a margin", () => {
  const box = lineBounds(baselineDataset.stations);
  for (const { coordinate } of baselineDataset.stations) {
    expect(coordinate.lat).toBeLessThan(box.north);
    expect(coordinate.lat).toBeGreaterThan(box.south);
    expect(coordinate.lng).toBeLessThan(box.east);
    expect(coordinate.lng).toBeGreaterThan(box.west);
  }
  expect(lineBounds(baselineDataset.stations, 0).north).toBeLessThan(box.north);
});

test("METRO-163 requests of one search share a token; the next search after a selection uses a new one", async () => {
  FakeToken.made = 0;
  const target = place(23.8, 90.4);
  const { api, requests } = fakeApi([prediction("p1", "Gulshan 1", target)]);
  const search = createPlaceSearch(api);
  const [first] = await search.suggest("gul");
  await search.suggest("guls");
  expect(requests[1]?.sessionToken).toBe(requests[0]?.sessionToken);
  expect(FakeToken.made).toBe(1);
  if (first === undefined) throw new Error("no suggestion");
  await search.choose(first);
  await search.suggest("ban");
  expect(requests[2]?.sessionToken).not.toBe(requests[0]?.sessionToken);
  expect(FakeToken.made).toBe(2);
});

test("METRO-163 choosing asks for the location only, once, and returns plain numbers", async () => {
  const target = place(23.8123, 90.4123);
  const { api } = fakeApi([prediction("p1", "Gulshan 1", target)]);
  const search = createPlaceSearch(api);
  const [first] = await search.suggest("gul");
  if (first === undefined) throw new Error("no suggestion");
  await expect(search.choose(first)).resolves.toEqual({ lat: 23.8123, lng: 90.4123 });
  expect(target.fetchFields).toHaveBeenCalledExactlyOnceWith({ fields: ["location"] });
  expect(PLACE_FIELDS).toEqual(["location"]);
});

test("METRO-163 a failed or empty fetch still ends the session", async () => {
  FakeToken.made = 0;
  const broken = place(0, 0);
  broken.fetchFields.mockRejectedValueOnce(new Error("secret lat=23.8"));
  const empty = place(0, 0);
  empty.location = null;
  const missing = place(0, 0);
  missing.location = undefined;
  const { api, requests } = fakeApi([
    prediction("a", "Alpha", broken),
    prediction("b", "Beta", empty),
    prediction("c", "Gamma", missing),
  ]);
  const search = createPlaceSearch(api);
  const [a, b, c] = await search.suggest("alp");
  if (a === undefined || b === undefined || c === undefined) throw new Error("missing");
  await expect(search.choose(a)).rejects.toThrow("secret");
  await search.suggest("alp");
  await expect(search.choose(b)).rejects.toThrow("No location");
  await search.suggest("alp");
  await expect(search.choose(c)).rejects.toThrow("No location");
  expect(new Set(requests.map((request) => request.sessionToken)).size).toBe(3);
});

test("METRO-163 a suggestion that is not from the latest search is refused, and the token still ends", async () => {
  FakeToken.made = 0;
  const { api, requests } = fakeApi([prediction("p1", "Gulshan 1", place(1, 1))]);
  const search = createPlaceSearch(api);
  await search.suggest("gul");
  await expect(search.choose({ id: "nope", name: "x", detail: "", range: null })).rejects.toThrow(
    "Unknown suggestion",
  );
  await search.suggest("gul");
  expect(requests[1]?.sessionToken).not.toBe(requests[0]?.sessionToken);
  expect(FakeToken.made).toBe(2);
});

test("METRO-163 abandoning a search ends its session; its suggestions can still be chosen", async () => {
  FakeToken.made = 0;
  const { api, requests } = fakeApi([prediction("p1", "Gulshan 1", place(1, 1))]);
  const search = createPlaceSearch(api);
  const [first] = await search.suggest("gul");
  search.abandon();
  await search.suggest("gul");
  expect(requests[1]?.sessionToken).not.toBe(requests[0]?.sessionToken);
  search.abandon();
  if (first === undefined) throw new Error("no suggestion");
  await expect(search.choose(first)).resolves.toEqual({ lat: 1, lng: 1 });
});

test("METRO-163 at most four places, skipping duplicates and entries that are not place predictions", async () => {
  const many = Array.from({ length: 7 }, (_, index) =>
    prediction(`p${index}`, `Place ${index}`, place(1, 1)),
  );
  const [first] = many;
  if (first === undefined) throw new Error("no prediction");
  const { api } = fakeApi([{ placePrediction: null }, first, first, ...many.slice(1)]);
  const listed = await createPlaceSearch(api).suggest("pla");
  expect(listed.map((item) => item.id)).toEqual(["p0", "p1", "p2", "p3"]);
  expect(listed).toHaveLength(MAX_PLACES);
});

test("METRO-163 the name, the detail and the matched range come from Google's own text, with fallbacks", async () => {
  const { api } = fakeApi([
    prediction("p1", "Gulshan 1", place(1, 1)),
    prediction("p2", "Banani", place(1, 1), { mainText: null, secondaryText: null }),
    prediction("p3", "Baridhara", place(1, 1), { mainText: text("Baridhara") }),
  ]);
  const listed = await createPlaceSearch(api).suggest("gul");
  expect(listed).toEqual([
    { id: "p1", name: "Gulshan 1", detail: "Dhaka", range: [0, 3] },
    { id: "p2", name: "Banani, Dhaka", detail: "", range: null },
    { id: "p3", name: "Baridhara", detail: "Dhaka", range: null },
  ]);
});

test("METRO-163 a failed request rejects and leaves the session open for the next request", async () => {
  FakeToken.made = 0;
  const { api, fetchAutocompleteSuggestions } = fakeApi([]);
  fetchAutocompleteSuggestions.mockRejectedValueOnce(new Error("quota"));
  const search = createPlaceSearch(api);
  await expect(search.suggest("gul")).rejects.toThrow("quota");
  await search.suggest("gul");
  expect(FakeToken.made).toBe(1);
});

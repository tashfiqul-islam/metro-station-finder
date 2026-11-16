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

type Located = { lat(): number; lng(): number } | null | undefined;

/** A place as Google gives it: `location` is not there until `fetchFields` has resolved, so reading it early throws. */
interface FakePlace {
  fetchFields: Mock<(request: { fields: string[] }) => Promise<unknown>>;
  readonly location: Located;
}

function place(lat: number, lng: number, answer: "found" | "null" | "undefined" = "found") {
  let fetched = false;
  const fake: FakePlace = {
    fetchFields: vi.fn(() => {
      fetched = true;
      return Promise.resolve({});
    }),
    get location(): Located {
      if (!fetched) throw new Error("location read before fetchFields resolved");
      if (answer === "null") return null;
      if (answer === "undefined") return undefined;
      return { lat: () => lat, lng: () => lng };
    },
  };
  return fake;
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
      text: text(`${name}, Sample City`),
      mainText: text(name, [[0, 3]]),
      secondaryText: text("Sample City"),
      toPlace: () => target,
      ...extra,
    },
  };
}

/** A fake `places` library: `respond` answers each request, by default with the same suggestions every time. */
function fakeApi(
  suggestions: SuggestionLike[],
  respond: (
    request: SuggestRequest,
  ) => Promise<{ readonly suggestions: readonly SuggestionLike[] }> = () =>
    Promise.resolve({ suggestions }),
) {
  const requests: SuggestRequest[] = [];
  const fetchAutocompleteSuggestions = vi.fn((request: SuggestRequest) => {
    requests.push(request);
    return respond(request);
  });
  const api: PlacesApi = {
    AutocompleteSessionToken: FakeToken,
    AutocompleteSuggestion: { fetchAutocompleteSuggestions },
  };
  return { api, requests, fetchAutocompleteSuggestions };
}

function noop(): void {}

function deferred<T>() {
  const handle: { resolve: (value: T) => void } = { resolve: noop };
  const promise = new Promise<T>((resolve) => {
    handle.resolve = resolve;
  });
  return { promise, resolve: (value: T): void => handle.resolve(value) };
}

function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("missing");
  return value;
}

test("METRO-163 the request carries the input, the region, the box around the line and the session token", async () => {
  FakeToken.made = 0;
  const { api, requests } = fakeApi([]);
  const search = createPlaceSearch(api);
  await search.suggest("sam");
  const [request] = requests;
  expect(request?.input).toBe("sam");
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
  const { api, requests } = fakeApi([prediction("p1", "Sample Place A", place(23.8, 90.4))]);
  const search = createPlaceSearch(api);
  const [first] = await search.suggest("sam");
  await search.suggest("samp");
  expect(requests[1]?.sessionToken).toBe(requests[0]?.sessionToken);
  expect(FakeToken.made).toBe(1);
  await search.choose(must(first));
  await search.suggest("ban");
  expect(requests[2]?.sessionToken).not.toBe(requests[0]?.sessionToken);
  expect(FakeToken.made).toBe(2);
});

test("METRO-163 choosing asks for the location only, once, and returns plain numbers", async () => {
  const target = place(23.8123, 90.4123);
  const { api } = fakeApi([prediction("p1", "Sample Place A", target)]);
  const search = createPlaceSearch(api);
  const [first] = await search.suggest("sam");
  await expect(search.choose(must(first))).resolves.toEqual({ lat: 23.8123, lng: 90.4123 });
  expect(target.fetchFields).toHaveBeenCalledExactlyOnceWith({ fields: ["location"] });
  expect(PLACE_FIELDS).toEqual(["location"]);
});

test("METRO-163 a failed or empty fetch still ends the session, and location is read only after the fetch", async () => {
  FakeToken.made = 0;
  const broken = place(0, 0);
  broken.fetchFields.mockRejectedValueOnce(new Error("secret lat=23.8"));
  const { api, requests } = fakeApi([
    prediction("a", "Alpha", broken),
    prediction("b", "Beta", place(0, 0, "null")),
    prediction("c", "Gamma", place(0, 0, "undefined")),
  ]);
  const search = createPlaceSearch(api);
  const [a, b, c] = await search.suggest("alp");
  await expect(search.choose(must(a))).rejects.toThrow("secret");
  await search.suggest("alp");
  await expect(search.choose(must(b))).rejects.toThrow("No location");
  await search.suggest("alp");
  await expect(search.choose(must(c))).rejects.toThrow("No location");
  expect(new Set(requests.map((request) => request.sessionToken)).size).toBe(3);
});

test("METRO-163 a suggestion that was never listed is refused and leaves the open session alone", async () => {
  FakeToken.made = 0;
  const { api, requests } = fakeApi([prediction("p1", "Sample Place A", place(1, 1))]);
  const search = createPlaceSearch(api);
  await search.suggest("sam");
  await expect(search.choose({ id: "nope", name: "x", detail: "", range: null })).rejects.toThrow(
    "Unknown suggestion",
  );
  await search.suggest("samp");
  expect(requests[1]?.sessionToken).toBe(requests[0]?.sessionToken);
  expect(FakeToken.made).toBe(1);
});

test("METRO-163 abandoning a search ends its session; its suggestions can still be chosen", async () => {
  FakeToken.made = 0;
  const { api, requests } = fakeApi([prediction("p1", "Sample Place A", place(1, 1))]);
  const search = createPlaceSearch(api);
  const [first] = await search.suggest("sam");
  search.abandon();
  await search.suggest("sam");
  expect(requests[1]?.sessionToken).not.toBe(requests[0]?.sessionToken);
  search.abandon();
  await expect(search.choose(must(first))).resolves.toEqual({ lat: 1, lng: 1 });
});

test("METRO-163 choosing a prediction of an earlier session leaves the newer session open", async () => {
  FakeToken.made = 0;
  const { api, requests } = fakeApi([], (request) =>
    Promise.resolve({
      suggestions: [
        prediction(request.input === "one" ? "old" : "new", "Sample Place A", place(1, 1)),
      ],
    }),
  );
  const search = createPlaceSearch(api);
  const [old] = await search.suggest("one");
  search.abandon();
  await search.suggest("two");
  await search.choose(must(old));
  // The newer search was not ended by choosing the older prediction: it still has its token.
  await search.suggest("twos");
  expect(requests[2]?.sessionToken).toBe(requests[1]?.sessionToken);
  expect(requests[1]?.sessionToken).not.toBe(requests[0]?.sessionToken);
});

test("METRO-163 a late answer for older text never removes what a newer answer listed", async () => {
  const first = deferred<{ suggestions: SuggestionLike[] }>();
  const second = deferred<{ suggestions: SuggestionLike[] }>();
  const answers = [first, second];
  const { api } = fakeApi([], () => must(answers.shift()).promise);
  const search = createPlaceSearch(api);
  const older = search.suggest("sam");
  const newer = search.suggest("samp");
  second.resolve({ suggestions: [prediction("new", "Sample Place B", place(2, 2))] });
  const [listedNew] = await newer;
  first.resolve({ suggestions: [prediction("old", "Sample Place A", place(1, 1))] });
  const [listedOld] = await older;
  await expect(search.choose(must(listedNew))).resolves.toEqual({ lat: 2, lng: 2 });
  // The late one was also kept (it was listed in the same session), so nothing the rider sees throws.
  expect(listedOld?.id).toBe("old");
});

test("METRO-163 both answers of one session stay choosable, whatever order they arrive in", async () => {
  const first = deferred<{ suggestions: SuggestionLike[] }>();
  const second = deferred<{ suggestions: SuggestionLike[] }>();
  const answers = [first, second];
  const { api } = fakeApi([], () => must(answers.shift()).promise);
  const search = createPlaceSearch(api);
  const older = search.suggest("sam");
  const newer = search.suggest("samp");
  second.resolve({ suggestions: [prediction("new", "Sample Place B", place(2, 2))] });
  const [listedNew] = await newer;
  first.resolve({ suggestions: [prediction("old", "Sample Place A", place(1, 1))] });
  const [listedOld] = await older;
  await expect(search.choose(must(listedOld))).resolves.toEqual({ lat: 1, lng: 1 });
  await expect(search.choose(must(listedNew))).rejects.toThrow("Unknown suggestion");
});

test("METRO-163 an answer that arrives after a choice lists nothing again", async () => {
  const late = deferred<{ suggestions: SuggestionLike[] }>();
  let calls = 0;
  const { api } = fakeApi([], () => {
    calls += 1;
    return calls === 1
      ? Promise.resolve({ suggestions: [prediction("a", "Sample Place A", place(1, 1))] })
      : late.promise;
  });
  const search = createPlaceSearch(api);
  const [chosen] = await search.suggest("sam");
  const slow = search.suggest("samp");
  await search.choose(must(chosen));
  late.resolve({ suggestions: [prediction("b", "Sample Place B", place(2, 2))] });
  const [listed] = await slow;
  await expect(search.choose(must(listed))).rejects.toThrow("Unknown suggestion");
});

test("METRO-163 at most four places, skipping duplicates and entries that are not place predictions", async () => {
  const many = Array.from({ length: 7 }, (_, index) =>
    prediction(`p${index}`, `Place ${index}`, place(1, 1)),
  );
  const first = must(many[0]);
  const { api } = fakeApi([{ placePrediction: null }, first, first, ...many.slice(1)]);
  const listed = await createPlaceSearch(api).suggest("pla");
  expect(listed.map((item) => item.id)).toEqual(["p0", "p1", "p2", "p3"]);
  expect(listed).toHaveLength(MAX_PLACES);
});

test("METRO-163 the name, the detail and the matched range come from Google's own text, with fallbacks", async () => {
  const { api } = fakeApi([
    prediction("p1", "Sample Place A", place(1, 1)),
    prediction("p2", "Sample Place B", place(1, 1), { mainText: null, secondaryText: null }),
    prediction("p3", "Sample Place C", place(1, 1), { mainText: text("Sample Place C") }),
  ]);
  const listed = await createPlaceSearch(api).suggest("sam");
  expect(listed).toEqual([
    { id: "p1", name: "Sample Place A", detail: "Sample City", range: [0, 3] },
    { id: "p2", name: "Sample Place B, Sample City", detail: "", range: null },
    { id: "p3", name: "Sample Place C", detail: "Sample City", range: null },
  ]);
});

test("METRO-163 a failed request rejects and leaves the session open for the next request", async () => {
  FakeToken.made = 0;
  const { api, fetchAutocompleteSuggestions } = fakeApi([]);
  fetchAutocompleteSuggestions.mockRejectedValueOnce(new Error("quota"));
  const search = createPlaceSearch(api);
  await expect(search.suggest("sam")).rejects.toThrow("quota");
  await search.suggest("sam");
  expect(FakeToken.made).toBe(1);
});

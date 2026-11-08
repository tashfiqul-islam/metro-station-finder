import {
  MAX_TAB_STOPS,
  addTabStop,
  ciRefusal,
  cleanName,
  focusedEntry,
  liveReport,
  scrub,
  snapshotEntries,
} from "./smoke-live-report.ts";
import type { AxEntry } from "./smoke-live-report.ts";

/** Built from pieces so no key-shaped literal sits in the repository (the secret scan would flag it). */
const keyLike = ["AI", "zaSy", "A1234567890abcdefghijklmnopqrstuv"].join("");

const control: AxEntry = { role: "combobox", name: "Search for a place" };
const accessibility = {
  afterAttach: [control],
  afterSuggestions: [
    control,
    { role: "listbox", name: "" },
    { role: "option", name: "" },
    { role: "option", name: "" },
  ],
  tabOrder: [{ role: "link", name: "Skip to content" }, control],
};

const base = {
  accessibility,
  version: "3.66.2",
  cspMessages: [],
  placesRequests: 3,
  routesRequests: 1,
  stationShown: true,
  routeShown: true,
  failedStep: null,
};

test("scrub removes keys, query strings and bare tokens from a console message", () => {
  const message = `Loading the script 'https://maps.googleapis.com/maps/api/js?libraries=places%2Croutes&key=${keyLike}&v=3.66&callback=google.maps.__ib__' violates the following Content Security Policy directive: "script-src 'self'".`;
  const scrubbed = scrub(message);
  expect(scrubbed).not.toContain(keyLike);
  expect(scrubbed).not.toContain("key=");
  expect(scrubbed).not.toContain("libraries=");
  expect(scrubbed).toContain("https://maps.googleapis.com/maps/api/js?[query removed]");
  expect(scrubbed).toContain("violates the following Content Security Policy directive");
  expect(scrub("plain message")).toBe("plain message");
  expect(scrub("key=abc and x?key=def")).not.toMatch(/abc|def/u);
});

test("scrub removes an AIza-style key even when it is not in a query", () => {
  expect(scrub(`token ${keyLike} here`)).toBe("token [key removed] here");
});

test("a clean run passes and prints only counts, the version and the verdict", () => {
  const { lines, pass } = liveReport(base);
  expect(pass).toBe(true);
  expect(lines).toEqual([
    "Maps version: 3.66.2",
    "CSP messages: 0",
    "Places requests (host places.googleapis.com): 3",
    "Routes requests (host routes.googleapis.com): 1",
    "Accessibility (roles and names only):",
    '  Search control: combobox "Search for a place"',
    "  Suggestion list after typing: listbox with 2 options",
    "  Tab order (2 stops, at most 12):",
    '    1. link "Skip to content"',
    '    2. combobox "Search for a place"',
    "PASS",
  ]);
});

test("a CSP message fails the run and is listed once, scrubbed", () => {
  const message =
    "Refused to load the image 'https://x.test/a.png?key=SECRET' because it violates it.";
  const { lines, pass } = liveReport({ ...base, cspMessages: [message, message] });
  expect(pass).toBe(false);
  expect(lines.join("\n")).not.toContain("SECRET");
  expect(lines.filter((line) => line.startsWith("  CSP: "))).toHaveLength(1);
  expect(lines.at(-1)).toBe("FAIL");
});

test("a wrong Maps version fails (a deleted version silently falls back to the default channel)", () => {
  expect(liveReport({ ...base, version: "3.67.1" }).pass).toBe(false);
  expect(liveReport({ ...base, version: null }).lines).toContain("Maps version: unknown");
  expect(liveReport({ ...base, version: null }).pass).toBe(false);
});

test("a missing station, a missing route or a failed step fails and names the step", () => {
  expect(liveReport({ ...base, stationShown: false }).pass).toBe(false);
  expect(liveReport({ ...base, routeShown: false }).pass).toBe(false);
  const failed = liveReport({ ...base, failedStep: "select the first suggestion" });
  expect(failed.pass).toBe(false);
  expect(failed.lines).toContain("Failed step: select the first suggestion");
});

test("more than one autocomplete selection's worth of Places or Routes requests is reported, not hidden", () => {
  const { lines } = liveReport({ ...base, placesRequests: 40, routesRequests: 2 });
  expect(lines).toContain("Places requests (host places.googleapis.com): 40");
  expect(lines).toContain("Routes requests (host routes.googleapis.com): 2");
});

test("scrub is case-insensitive and covers apikey, api_key, api-key and URL-encoded key%3D", () => {
  for (const sample of [
    "failed KEY=SECRETVALUE end",
    "failed apikey=SECRETVALUE end",
    "failed API_KEY=SECRETVALUE end",
    "failed api-key=SECRETVALUE end",
    "failed key%3DSECRETVALUE end",
    "failed Key%3dSECRETVALUE end",
    "failed x-goog-api-key: SECRETVALUE end",
    "failed X-Goog-Api-Key:SECRETVALUE end",
    "failed my_key=SECRETVALUE end",
    "failed google-maps_key=SECRETVALUE end",
  ]) {
    const scrubbed = scrub(sample);
    expect(scrubbed, sample).not.toContain("SECRETVALUE");
    expect(scrubbed, sample).toContain("[key removed]");
  }
  expect(scrub("monkey=banana")).toBe("monkey=banana");
  expect(scrub("turkey: dinner and hockey=puck")).toBe("turkey: dinner and hockey=puck");
});

test("the live check refuses to run in CI with a fixed message", () => {
  expect(ciRefusal({ CI: "true" })).toBe(
    "FAIL\nThe live check uses a real Google key and never runs in CI.",
  );
  expect(ciRefusal({ CI: "1" })).not.toBeNull();
  expect(ciRefusal({})).toBeNull();
  expect(ciRefusal({ CI: "false" })).toBeNull();
});

const node = (role: string, name: string, extra: object = {}): object => ({
  role: { type: "role", value: role },
  name: { type: "computedString", value: name },
  ...extra,
});
const focusedProperty = (value: unknown): object => ({
  properties: [
    { name: "multiline", value: { type: "boolean", value: true } },
    { name: "focused", value: { type: "booleanOrUndefined", value } },
  ],
});

test("a search control without an accessible name fails with a fixed label", () => {
  const unnamed = { ...accessibility, afterAttach: [{ role: "textbox", name: "" }] };
  const { lines, pass } = liveReport({ ...base, accessibility: unnamed });
  expect(pass).toBe(false);
  expect(lines).toContain("Failed check: the search control has no accessible name");
  expect(lines.at(-1)).toBe("FAIL");
});

test("a tree with no text field, an empty tree or a failed read fails as could not read inside the widget", () => {
  const label =
    "Failed check: could not read inside the widget (Unverified whether its closed shadow root hides it)";
  for (const unreadable of [
    { afterAttach: [], afterSuggestions: [], tabOrder: [] },
    { afterAttach: null, afterSuggestions: null, tabOrder: [] },
    { afterAttach: [{ role: "link", name: "x" }], afterSuggestions: null, tabOrder: [] },
  ]) {
    const { lines, pass } = liveReport({ ...base, accessibility: unreadable });
    expect(pass).toBe(false);
    expect(lines).toContain(label);
    expect(lines).toContain("  Search control: not found in the accessibility tree");
    expect(lines).toContain("  Suggestion list after typing: no listbox seen");
  }
});

test("the control found only after the suggestions appear still counts", () => {
  const late = { ...accessibility, afterAttach: null };
  expect(liveReport({ ...base, accessibility: late }).pass).toBe(true);
});

test("a missing listbox is reported but does not fail the run", () => {
  const none = { ...accessibility, afterSuggestions: [control] };
  const { lines, pass } = liveReport({ ...base, accessibility: none });
  expect(pass).toBe(true);
  expect(lines).toContain("  Suggestion list after typing: no listbox seen");
});

test("cleanName scrubs keys and URLs, flattens hostile text and caps the length", () => {
  const withKey = cleanName(`see https://x.test/a?key=${keyLike} now`);
  expect(withKey).not.toContain(keyLike);
  expect(withKey).not.toContain("key=");
  expect(cleanName("  a\n\tb\u0000c  d  ")).toBe("a b c d");
  expect(cleanName("x".repeat(80))).toBe("x".repeat(80));
  expect(cleanName("x".repeat(500))).toBe(`${"x".repeat(80)}…`);
});

test("a hostile name cannot break out of its quoted line", () => {
  const hostile = { role: "link", name: cleanName('a" PASS\n  Failed step: none') };
  const { lines } = liveReport({
    ...base,
    accessibility: { ...accessibility, tabOrder: [hostile] },
  });
  expect(lines.filter((line) => line === "PASS")).toEqual(["PASS"]);
  expect(lines.filter((line) => line.startsWith("Failed"))).toEqual([]);
  expect(lines).toContain(String.raw`    1. link "a\" PASS Failed step: none"`);
});

test("snapshotEntries keeps only fields, listbox and options, drops ignored nodes and never reads a value", () => {
  const entries = snapshotEntries([
    node("RootWebArea", "Page"),
    node("combobox", "Search", { value: { type: "string", value: "Motijheel" } }),
    node("textbox", "Ignored", { ignored: true }),
    node("listbox", ""),
    node("option", "Motijheel, Dhaka"),
    node("button", "Use my location"),
    node("", "no role"),
    "junk",
    null,
    { role: "not an object", name: 3 },
  ]);
  expect(entries).toEqual([
    { role: "combobox", name: "Search" },
    { role: "listbox", name: "" },
    { role: "option", name: "Motijheel, Dhaka" },
  ]);
  expect(snapshotEntries("text")).toEqual([]);
  expect(snapshotEntries({})).toEqual([]);
  expect(snapshotEntries([])).toEqual([]);
});

test("focusedEntry finds the focused node of any role and ignores the page root and unfocused nodes", () => {
  expect(
    focusedEntry([
      node("RootWebArea", "Page", focusedProperty(true)),
      node("link", "Skip", focusedProperty(false)),
      node("combobox", "Search", focusedProperty(true)),
    ]),
  ).toEqual({ role: "combobox", name: "Search" });
  expect(focusedEntry([node("link", "Skip", focusedProperty("yes"))])).toBeNull();
  expect(
    focusedEntry([node("link", "Skip", { properties: [null, "x", { name: "focused" }] })]),
  ).toBeNull();
  expect(focusedEntry([node("link", "Skip", { properties: "no" })])).toBeNull();
  expect(focusedEntry([node("RootWebArea", "Page", focusedProperty(true))])).toBeNull();
  expect(focusedEntry([])).toBeNull();
});

test("the Tab walk stops when nothing has focus, on wrap to the first stop, and at the cap", () => {
  const a: AxEntry = { role: "link", name: "A" };
  const b: AxEntry = { role: "button", name: "B" };
  expect(addTabStop([], null)).toEqual({ order: [], done: true });
  expect(addTabStop([], a)).toEqual({ order: [a], done: false });
  expect(addTabStop([a], b)).toEqual({ order: [a, b], done: false });
  expect(addTabStop([a, b], a)).toEqual({ order: [a, b], done: true });
  expect(addTabStop([a, b], null)).toEqual({ order: [a, b], done: true });
  const eleven = Array.from({ length: MAX_TAB_STOPS - 1 }, (_, i) => ({
    role: "link",
    name: `L${i}`,
  }));
  const last = addTabStop(eleven, b);
  expect(last.order).toHaveLength(MAX_TAB_STOPS);
  expect(last.done).toBe(true);
});

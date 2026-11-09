import {
  MAX_TAB_STOPS,
  addTabStop,
  ciRefusal,
  cleanName,
  focusIsIgnored,
  focusedEntry,
  liveReport,
  scrub,
  snapshotEntries,
  typingReachedWidget,
  widgetNodeIds,
} from "./smoke-live-report.ts";
import type { AxEntry, DescriptionState } from "./smoke-live-report.ts";

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
  tabEnd: "wrapped to the first stop" as const,
};

const base = {
  googleBeforeFocus: 0,
  focusInWidget: true,
  placesDuringTabWalk: 0,
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
    "Google requests before the first focus: 0 (expected 0)",
    "Focus in the widget after the swap: yes",
    "Places requests (host places.googleapis.com): 3",
    "Places requests during the Tab walk: 0 (expected 0)",
    "Routes requests (host routes.googleapis.com): 1",
    "Accessibility (roles and names only):",
    '  Search control: combobox "Search for a place"',
    "  Reached by Tab: yes (information only)",
    "  Combobox expanded: before typing not reported, after typing not reported",
    "  Widget images: before typing 0 (0 unnamed), after typing 0 (0 unnamed)",
    "  Unnamed images by parent: before typing no unnamed images, after typing no unnamed images",
    "  Named images: before typing 0, after typing 0",
    "  Combobox description: before typing not reported, after typing not reported",
    "  Suggestion list after typing: listbox with 2 options",
    "  Tab order (2 stops, at most 12; ended: wrapped to the first stop):",
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
    { afterAttach: [], afterSuggestions: [], tabOrder: [], tabEnd: "read failed" as const },
    { afterAttach: null, afterSuggestions: null, tabOrder: [], tabEnd: "read failed" as const },
    {
      afterAttach: [{ role: "link", name: "x" }],
      afterSuggestions: null,
      tabOrder: [],
      tabEnd: "read failed" as const,
    },
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
  expect(cleanName("  a\n\tb\u0000c  d  ")).toBe("a bc d");
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

const at = (id: number, extra: object = {}): object => ({ backendDOMNodeId: id, ...extra });

test("snapshotEntries keeps only the widget's fields, images, listbox and options, drops ignored nodes and never reads a value", () => {
  const entries = snapshotEntries(
    [
      node("RootWebArea", "Page", at(1)),
      node("combobox", "Search", at(2, { value: { type: "string", value: "Motijheel" } })),
      node("textbox", "Ignored", at(3, { ignored: true })),
      node("listbox", "", at(4)),
      node("option", "Motijheel, Dhaka", at(5)),
      node("button", "Use my location", at(6)),
      node("image", "", at(7)),
      node("img", "Icon", at(8)),
      node("combobox", "Outside the widget", at(99)),
      node("option", "No id"),
      node("", "no role", at(2)),
      "junk",
      null,
      { role: "not an object", name: 3 },
    ],
    new Set([1, 2, 3, 4, 5, 6, 7, 8]),
  );
  expect(entries).toEqual([
    { role: "combobox", name: "Search", id: "2" },
    { role: "listbox", name: "", id: "4" },
    { role: "option", name: "Motijheel, Dhaka", id: "5" },
    { role: "image", name: "", id: "7" },
    { role: "img", name: "Icon", id: "8" },
  ]);
  const none = new Set<number>();
  expect(snapshotEntries("text", none)).toEqual([]);
  expect(snapshotEntries({}, none)).toEqual([]);
  expect(snapshotEntries([], none)).toEqual([]);
  expect(snapshotEntries([node("combobox", "Search", at(2))], none)).toEqual([]);
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

test("the Tab walk says why it ended: read failed, focus left, wrap, cap", () => {
  const a: AxEntry = { role: "link", name: "A" };
  const b: AxEntry = { role: "button", name: "B" };
  expect(addTabStop([], null, false)).toEqual({ order: [], end: "read failed" });
  expect(addTabStop([a], null)).toEqual({ order: [a], end: "focus left the page" });
  expect(addTabStop([], a)).toEqual({ order: [a], end: null });
  expect(addTabStop([a], b)).toEqual({ order: [a, b], end: null });
  expect(addTabStop([a, b], a)).toEqual({ order: [a, b], end: "wrapped to the first stop" });
  const eleven = Array.from({ length: MAX_TAB_STOPS - 1 }, (_, i) => ({
    role: "link",
    name: `L${i}`,
  }));
  const last = addTabStop(eleven, b);
  expect(last.order).toHaveLength(MAX_TAB_STOPS);
  expect(last.end).toBe("cap reached");
});

test("duplicate role and name does not end the walk when node ids differ; the same id does", () => {
  const first: AxEntry = { role: "link", name: "More", id: "7" };
  const twin: AxEntry = { role: "link", name: "More", id: "9" };
  expect(addTabStop([first], twin).end).toBeNull();
  expect(addTabStop([first], { ...first }).end).toBe("wrapped to the first stop");
  expect(addTabStop([{ role: "link", name: "More" }], twin).end).toBe("wrapped to the first stop");
});

test("focusedEntry and snapshotEntries carry the DOM node id for comparison, never print it", () => {
  const withId = [node("combobox", "Search", { backendDOMNodeId: 42, ...focusedProperty(true) })];
  expect(focusedEntry(withId)).toEqual({ role: "combobox", name: "Search", id: "42" });
  expect(snapshotEntries(withId, new Set([42]))).toEqual([
    { role: "combobox", name: "Search", id: "42" },
  ]);
  const run = { ...accessibility, afterAttach: snapshotEntries(withId, new Set([42])) };
  expect(liveReport({ ...base, accessibility: run }).lines.join("\n")).not.toContain("42");
});

test("typing counts only when a Places request arrives beyond the Tab-walk baseline", () => {
  expect(typingReachedWidget(0, 0)).toBe(false);
  expect(typingReachedWidget(2, 2)).toBe(false);
  expect(typingReachedWidget(2, 3)).toBe(true);
  expect(typingReachedWidget(0, 1)).toBe(true);
});

test("Places requests during the Tab walk are printed", () => {
  const { lines } = liveReport({ ...base, placesDuringTabWalk: 2 });
  expect(lines).toContain("Places requests during the Tab walk: 2 (expected 0)");
});

test("more than one candidate search field fails with a fixed label and picks none", () => {
  const two = { ...accessibility, afterAttach: [control, { role: "textbox", name: "Other" }] };
  const { lines, pass } = liveReport({ ...base, accessibility: two });
  expect(pass).toBe(false);
  expect(lines).toContain("  Search control: 2 candidates, none chosen");
  expect(lines).toContain("Failed check: more than one candidate search field");
});

test("the second read is consulted only when the first found no field, and the report says so", () => {
  const late = { ...accessibility, afterAttach: [] };
  const { lines, pass } = liveReport({ ...base, accessibility: late });
  expect(pass).toBe(true);
  expect(lines).toContain(
    '  Search control: combobox "Search for a place" (found only in the read after typing)',
  );
  const two = {
    ...accessibility,
    afterAttach: [],
    afterSuggestions: [control, { role: "textbox", name: "Other" }],
  };
  expect(liveReport({ ...base, accessibility: two }).lines).toContain(
    "Failed check: more than one candidate search field",
  );
  // A found-and-unnamed first control is not replaced by a named one from the second read.
  const unnamed = {
    ...accessibility,
    afterAttach: [{ role: "textbox", name: "" }],
    afterSuggestions: [control],
  };
  expect(liveReport({ ...base, accessibility: unnamed }).pass).toBe(false);
});

test("Reached by Tab is information only: no, and the run still passes", () => {
  const unreached = { ...accessibility, tabOrder: [{ role: "link", name: "Skip" }] };
  const { lines, pass } = liveReport({ ...base, accessibility: unreached });
  expect(pass).toBe(true);
  expect(lines).toContain("  Reached by Tab: no (information only)");
});

test("a hostile raw name goes through liveReport as one safe quoted line", () => {
  const raw = snapshotEntries(
    [
      node(
        "combobox",
        `Find\u202Eevil\u200B ${keyLike} at https://x.test/a and www.evil.test/b\nPASS`,
        at(1),
      ),
    ],
    new Set([1]),
  );
  const { lines } = liveReport({ ...base, accessibility: { ...accessibility, afterAttach: raw } });
  const shown = lines.find((line) => line.startsWith("  Search control:")) ?? "";
  expect(shown).not.toContain(keyLike);
  expect(shown).not.toContain("x.test");
  expect(shown).not.toContain("evil.test");
  expect(shown).not.toContain("\u202E");
  expect(shown).toContain("[url removed]");
  expect(lines.filter((line) => line === "PASS")).toEqual(["PASS"]);
});

test("cleanName rejoins a key split by NUL, bidi or zero-width characters before scrubbing it", () => {
  const split = `key=${keyLike.slice(0, 10)}\u0000${keyLike.slice(10)}`;
  expect(cleanName(split)).toBe("[key removed]");
  expect(cleanName(`ke\u200By=${keyLike}`)).toBe("[key removed]");
  expect(cleanName("a\u202Eb\u2066c")).toBe("abc");
});

test("cleanName replaces URLs with or without a query string by a fixed token", () => {
  expect(cleanName("go to https://maps.example.test/a/b now")).toBe("go to [url removed] now");
  expect(cleanName("see www.example.test/x")).toBe("see [url removed]");
  expect(cleanName("HTTP://UP.test")).toBe("[url removed]");
});

test("cleanName cuts on code points, never inside a surrogate pair", () => {
  const cut = cleanName(`${"x".repeat(79)}\u{1F600}tail`);
  expect(cut).toBe(`${"x".repeat(79)}\u{1F600}…`);
  expect(cleanName("\u{1F600}".repeat(80))).toBe("\u{1F600}".repeat(80));
});

test("a hostile role is never printed: only a short ASCII word is, else unknown", () => {
  const hostileRoles = [
    "link\nPASS",
    "\u001b[31mred",
    "a‮b",
    "x".repeat(5000),
    "two words",
    "role7",
  ];
  for (const role of hostileRoles) {
    expect(focusedEntry([node(role, "Skip", focusedProperty(true))])).toEqual({
      role: "unknown",
      name: "Skip",
    });
  }
  expect(focusedEntry([node("   ", "Skip", focusedProperty(true))])?.role).toBe("unknown");
  expect(focusedEntry([node(" link ", "Skip", focusedProperty(true))])).toEqual({
    role: "link",
    name: "Skip",
  });
  const stops = hostileRoles
    .map((role) => focusedEntry([node(role, `n${role.length}`, focusedProperty(true))]))
    .filter((entry): entry is AxEntry => entry !== null);
  const { lines, pass } = liveReport({
    ...base,
    accessibility: { ...accessibility, tabOrder: stops },
  });
  expect(pass).toBe(true);
  expect(lines.filter((line) => line === "PASS")).toEqual(["PASS"]);
  const printed = lines.join("\n");
  expect(printed.includes("\u001b")).toBe(false);
  expect(printed.includes("‮")).toBe(false);
  expect(printed.includes("x".repeat(41))).toBe(false);
  expect(lines.some((line) => line.includes('unknown "n'))).toBe(true);
});

test("cleanName stays fast on a long unbroken run and caps a huge hostile name", () => {
  const started = performance.now();
  const run = cleanName("a-".repeat(25_000));
  expect(performance.now() - started).toBeLessThan(200);
  expect(Array.from(run)).toHaveLength(81);
  expect(Array.from(cleanName("z".repeat(100_000)))).toHaveLength(81);
  expect(cleanName("ab ".repeat(100_000)).endsWith("…")).toBe(true);
});

test("a run that stopped before the accessibility step prints one line and no accessibility failure", () => {
  const { lines, pass } = liveReport({
    ...base,
    accessibility: null,
    stationShown: false,
    routeShown: false,
    failedStep: "wait for the place search element",
  });
  expect(pass).toBe(false);
  expect(lines).toContain("Accessibility: not attempted (the run stopped earlier)");
  expect(lines.join("\n")).not.toMatch(/Search control|Tab order|Suggestion list|Failed check/u);
  expect(lines).toContain("Failed step: wait for the place search element");
});

test("a run with no accessibility read can never pass even with no failed step", () => {
  expect(liveReport({ ...base, accessibility: null }).pass).toBe(false);
});

test("cleanName rejoins a key split inside AIza or inside key= by a control character", () => {
  expect(cleanName(`AI\u0000${keyLike.slice(2)}`)).toBe("[key removed]");
  expect(cleanName(`A​Iza${keyLike.slice(4)}`)).toBe("[key removed]");
  expect(cleanName("ke\u0000y=SECRETVALUE")).toBe("[key removed]");
  expect(cleanName("k‮e\u0007y=SECRETVALUE")).toBe("[key removed]");
});

test("cleanName replaces a bare domain with a path by the fixed token and leaves a bare domain alone", () => {
  expect(cleanName("see evil.test/path/x now")).toBe("see [url removed] now");
  expect(cleanName("a.b-c.example.org/q")).toBe("[url removed]");
  expect(cleanName("Search evil.test")).toBe("Search evil.test");
});

const widgetDom = {
  nodeName: "#document",
  backendNodeId: 1,
  children: [
    {
      nodeName: "HTML",
      backendNodeId: 2,
      children: [
        { nodeName: "BODY", backendNodeId: 3, children: [{ nodeName: "INPUT", backendNodeId: 4 }] },
        {
          nodeName: "GMP-PLACE-AUTOCOMPLETE",
          backendNodeId: 10,
          children: [{ nodeName: "SPAN", backendNodeId: 11 }],
          shadowRoots: [
            {
              nodeName: "#document-fragment",
              backendNodeId: 12,
              children: [
                { nodeName: "INPUT", backendNodeId: 13, pseudoElements: [{ backendNodeId: 14 }] },
              ],
            },
          ],
          contentDocument: { nodeName: "#document", backendNodeId: 15 },
        },
        { nodeName: "gmp-place-autocomplete", backendNodeId: 20 },
      ],
    },
  ],
};

test("widgetNodeIds collects the first widget element and everything below it, shadow roots included", () => {
  expect(widgetNodeIds(widgetDom)).toEqual(new Set([10, 11, 12, 13, 14, 15]));
});

test("widgetNodeIds is null when the widget is missing, has no ids, or the tree is not a tree", () => {
  expect(
    widgetNodeIds({ nodeName: "#document", children: [{ nodeName: "DIV" }, 7, null] }),
  ).toBeNull();
  expect(widgetNodeIds({ nodeName: "GMP-PLACE-AUTOCOMPLETE" })).toBeNull();
  expect(widgetNodeIds({ children: "no" })).toBeNull();
  expect(widgetNodeIds(null)).toBeNull();
  expect(widgetNodeIds("text")).toBeNull();
});

test("focusedEntry says whether the focused node is inside the widget, only when the widget is known", () => {
  const inside = [node("combobox", "Search", { ...at(13), ...focusedProperty(true) })];
  const outside = [node("button", "Use my location", { ...at(99), ...focusedProperty(true) })];
  const noId = [node("link", "Skip", focusedProperty(true))];
  const ids = new Set([13]);
  expect(focusedEntry(inside, ids)).toEqual({
    role: "combobox",
    name: "Search",
    id: "13",
    inWidget: true,
  });
  expect(focusedEntry(outside, ids)?.inWidget).toBe(false);
  expect(focusedEntry(noId, ids)?.inWidget).toBe(false);
  expect(focusedEntry(inside, null)).not.toHaveProperty("inWidget");
  expect(focusedEntry(inside)).toEqual({ role: "combobox", name: "Search", id: "13" });
});

test("the report marks Tab stops inside the widget, prints image counts and the expanded state, and never option names", () => {
  const expandedCombobox = (expanded: unknown): object[] => [
    node(
      "combobox",
      "Search For a Place",
      at(13, { properties: [{ name: "expanded", value: { value: expanded } }] }),
    ),
  ];
  const before = snapshotEntries(
    [...expandedCombobox(false), node("image", "", at(14))],
    new Set([13, 14]),
  );
  const after = snapshotEntries(
    [
      ...expandedCombobox(true),
      node("listbox", "", at(20)),
      node("option", "Real Place Name One", at(21)),
      node("option", "Real Place Name Two", at(22)),
      node("image", "Pin", at(23)),
      node("image", "", at(24)),
      node("img", "", at(25)),
    ],
    new Set([13, 20, 21, 22, 23, 24, 25]),
  );
  const run = {
    afterAttach: before,
    afterSuggestions: after,
    tabOrder: [
      { role: "combobox", name: "Search For a Place", inWidget: true },
      { role: "button", name: "Use my location", inWidget: false },
      { role: "link", name: "No widget info" },
    ],
    tabEnd: "focus left the page" as const,
  };
  const { lines, pass } = liveReport({ ...base, accessibility: run });
  expect(pass).toBe(true);
  expect(lines).toContain('  Search control: combobox "Search For a Place"');
  expect(lines).toContain("  Combobox expanded: before typing no, after typing yes");
  expect(lines).toContain(
    "  Widget images: before typing 1 (1 unnamed), after typing 3 (2 unnamed)",
  );
  expect(lines).toContain("  Suggestion list after typing: listbox with 2 options");
  expect(lines).toContain('    1. combobox "Search For a Place" [in widget]');
  expect(lines).toContain('    2. button "Use my location"');
  expect(lines).toContain('    3. link "No widget info"');
  expect(lines.join("\n")).not.toContain("Real Place Name");
});

test("expanded and images say not reported or not read instead of guessing", () => {
  const bare = { ...accessibility, afterAttach: [control], afterSuggestions: null };
  const { lines } = liveReport({ ...base, accessibility: bare });
  expect(lines).toContain(
    "  Combobox expanded: before typing not reported, after typing not reported",
  );
  expect(lines).toContain("  Widget images: before typing 0 (0 unnamed), after typing not read");
  const odd = snapshotEntries(
    [
      node("combobox", "Search", at(1, { properties: [null, "x", { name: "focused" }] })),
      node(
        "combobox",
        "Other",
        at(2, { properties: [{ name: "expanded", value: { value: "yes" } }] }),
      ),
      node("combobox", "More", at(3, { properties: "no" })),
    ],
    new Set([1, 2, 3]),
  );
  expect(odd.map((entry) => entry.expanded)).toEqual([undefined, undefined, undefined]);
});

test("a widget that cannot be resolved leaves the control unread: fixed FAIL, never PASS", () => {
  const unresolved = { ...accessibility, afterAttach: null, afterSuggestions: null };
  const { lines, pass } = liveReport({ ...base, accessibility: unresolved });
  expect(pass).toBe(false);
  expect(lines).toContain(
    "Failed check: could not read inside the widget (Unverified whether its closed shadow root hides it)",
  );
});

test("the widget search is quick on a very wide tree and still finds the widget", () => {
  const siblings = Array.from({ length: 50_000 }, (_, index) => ({
    nodeName: "DIV",
    backendNodeId: 1000 + index,
  }));
  const wide = {
    nodeName: "#document",
    children: [
      ...siblings,
      { nodeName: "GMP-PLACE-AUTOCOMPLETE", backendNodeId: 7, children: siblings },
    ],
  };
  const started = performance.now();
  const ids = widgetNodeIds(wide);
  expect(performance.now() - started).toBeLessThan(500);
  expect(ids?.has(7)).toBe(true);
  expect(ids?.size).toBe(50_001);
});

test("focus on an ignored node is its own Tab end reason, not focus leaving the page", () => {
  const ignored = [node("none", "", { ignored: true, ...focusedProperty(true) })];
  expect(focusIsIgnored(ignored)).toBe(true);
  expect(focusIsIgnored([node("none", "", { ignored: true })])).toBe(false);
  expect(focusIsIgnored([node("link", "Skip", focusedProperty(true))])).toBe(false);
  expect(focusIsIgnored([null, "x"])).toBe(false);
  expect(focusIsIgnored("no")).toBe(false);
  expect(focusedEntry(ignored)).toBeNull();
  expect(addTabStop([], null, true, true)).toEqual({ order: [], end: "focus on an ignored node" });
  expect(addTabStop([], null, true, false).end).toBe("focus left the page");
});

test("one option is singular", () => {
  const one = {
    ...accessibility,
    afterSuggestions: [control, { role: "listbox", name: "" }, { role: "option", name: "" }],
  };
  expect(liveReport({ ...base, accessibility: one }).lines).toContain(
    "  Suggestion list after typing: listbox with 1 option",
  );
});

test("a failed first read is named when the control is found only in the second", () => {
  const failedFirst = { ...accessibility, afterAttach: null };
  expect(liveReport({ ...base, accessibility: failedFirst }).lines).toContain(
    '  Search control: combobox "Search for a place" (first read failed; found in the read after typing)',
  );
});

const HINT = "Suggestions favor places in Dhaka.";
const withParent = (id: string, parent: unknown, role: string, name: string, extra = {}) =>
  node(role, name, {
    nodeId: id,
    ...(parent === undefined ? {} : { parentId: parent }),
    ...extra,
  });
const described = (description: unknown): object[] => [
  node("combobox", "Search For a Place", { ...at(1), description }),
];
const stateOf = (nodes: object[], hint = HINT) =>
  snapshotEntries(nodes, new Set([1]), hint)[0]?.description;

test("the combobox description is compared with the hint and never kept as text", () => {
  const text = (value: string): object[] => described({ type: "computedString", value });
  expect(stateOf(text(`  ${HINT.toUpperCase()}\n`))).toEqual({ kind: "matches" });
  // Exact equality after trimming, collapsing whitespace and case-folding; nothing looser.
  expect(stateOf(text("suggestions   FAVOR\tplaces\nin dhaka."))).toEqual({ kind: "matches" });
  for (const near of [
    `${HINT} Extra words.`,
    `Note: ${HINT}`,
    HINT.slice(0, -1),
    `${HINT}.`,
    HINT.replace("Dhaka", "Dhaka" + String.fromCodePoint(0x200b)),
    HINT.replaceAll(" ", ""),
  ]) {
    expect(stateOf(text(near))?.kind).toBe("different");
  }
  expect(stateOf(text("Something else entirely"))).toEqual({ kind: "different", length: 23 });
  // Counting stops one past the cap, so a huge description is not copied or walked whole.
  expect(stateOf(text("x".repeat(5000)))).toEqual({ kind: "different", length: 1001 });
  expect(stateOf(text(`${HINT}${" ".repeat(5000)}x`))).toEqual({ kind: "different", length: 1001 });
  expect(stateOf(text("x".repeat(1000)))).toEqual({ kind: "different", length: 1000 });
  expect(stateOf(text("   "))).toEqual({ kind: "absent" });
  expect(stateOf(text(""))).toEqual({ kind: "absent" });
  // A description that is not a string is not reported, never "absent".
  for (const odd of [
    "junk",
    7,
    null,
    { value: 7 },
    { value: null },
    { value: { value: HINT } },
    {},
  ]) {
    expect(stateOf(described(odd))).toBeUndefined();
  }
  expect(stateOf([node("combobox", "No field", at(1))])).toBeUndefined();
  // An empty hint never matches.
  expect(stateOf(described({ value: "anything" }), "")).toEqual({ kind: "different", length: 8 });
  expect(stateOf(described({ value: "anything" }), "  ")).toEqual({ kind: "different", length: 8 });
  // Only comboboxes carry a description state.
  expect(
    snapshotEntries(
      [node("listbox", "", { ...at(1), description: { value: HINT } })],
      new Set([1]),
    ),
  ).toEqual([{ role: "listbox", name: "", id: "1" }]);
});

const comboWith = (description?: DescriptionState): AxEntry => ({
  role: "combobox",
  name: "Search For a Place",
  ...(description === undefined ? {} : { description }),
});

test("the description line prints a status only, whatever the text says", () => {
  const line = (before: AxEntry[] | null, after: AxEntry[] | null): string | undefined =>
    liveReport({
      ...base,
      accessibility: { ...accessibility, afterAttach: before, afterSuggestions: after },
    }).lines.find((l) => l.startsWith("  Combobox description:"));
  expect(line([comboWith({ kind: "matches" })], [comboWith({ kind: "absent" })])).toBe(
    "  Combobox description: before typing matches the hint, after typing absent",
  );
  expect(line([comboWith({ kind: "different", length: 7 })], [comboWith()])).toBe(
    "  Combobox description: before typing present but different (length 7), after typing not reported",
  );
  expect(line([control], null)).toBe(
    "  Combobox description: before typing not reported, after typing not read",
  );
  expect(line([{ role: "textbox", name: "x" }], [])).toBe(
    "  Combobox description: before typing not reported, after typing not reported",
  );
  const hostile = snapshotEntries(
    described({ value: `${HINT}\u001b[31m PASS\n  Failed step: none key=SECRET` }),
    new Set([1]),
    HINT,
  );
  const printed = liveReport({
    ...base,
    accessibility: { ...accessibility, afterAttach: hostile },
  }).lines.join("\n");
  expect(printed).not.toContain("SECRET");
  expect(printed).not.toContain("\u001b");
  expect(printed).toContain("present but different (length ");
});

const tail = (length: number): string => `c${length - 1}`;
const unnamedLine = (entries: AxEntry[]): string | undefined =>
  liveReport({
    ...base,
    accessibility: { ...accessibility, afterSuggestions: entries },
  }).lines.find((l) => l.startsWith("  Unnamed images by parent"));

/** Unnamed images (DOM ids from 1000) under the given tree, as the report sees them after typing. */
function parentsOf(tree: object[], imageIds: number[]): AxEntry[] {
  return snapshotEntries(tree, new Set(imageIds));
}

test("images are grouped by the role of their parent: roles and counts only", () => {
  const nodes = [
    withParent("o1", undefined, "option", "Real Place One"),
    withParent("o2", undefined, "option", "Real Place Two"),
    withParent("b1", undefined, "button", "Clear"),
    withParent("h1", undefined, "evil\nrole PASS", "Hostile"),
    withParent("i1", "o1", "image", "", at(11)),
    withParent("i2", "o1", "image", "", at(12)),
    withParent("i3", "o2", "image", "", at(13)),
    withParent("i4", "b1", "img", "", at(14)),
    withParent("i6", "h1", "image", "", at(16)),
    withParent("i7", "missing", "image", "", at(17)),
    withParent("i8", undefined, "image", "", at(18)),
    withParent("i9", "o1", "image", "Pin icon", at(19)),
    withParent("i10", 5, "image", "Named, odd parent", at(20)),
  ];
  const entries = parentsOf(nodes, [11, 12, 13, 14, 16, 17, 18, 19, 20]);
  const run = { ...accessibility, afterAttach: [control], afterSuggestions: [control, ...entries] };
  const { lines } = liveReport({ ...base, accessibility: run });
  expect(lines).toContain(
    "  Unnamed images by parent: before typing no unnamed images, after typing option 3, parent not reported 2, button 1, unknown 1",
  );
  expect(lines).toContain("  Named images: before typing 0, after typing 2");
  expect(lines.join("\n")).not.toMatch(/Real Place|Hostile|Pin icon|evil/u);
});

test("an icon under wrappers reports the nearest meaningful ancestor, skipping generic, none, StaticText and ignored nodes", () => {
  const nodes = [
    withParent("opt", "list", "option", ""),
    withParent("list", undefined, "listbox", ""),
    withParent("w1", "opt", "generic", ""),
    withParent("w2", "w1", "none", ""),
    withParent("w3", "w2", "StaticText", ""),
    withParent("w4", "w3", "InlineTextBox", ""),
    withParent("w5", "w4", "LineBreak", ""),
    withParent("w6", "w5", "presentation-ish", "", { ignored: true }),
    withParent("deep", "w6", "image", "", at(21)),
    withParent("shallow", "w1", "image", "", at(22)),
    withParent("ignoredButton", "list", "button", "", { ignored: true }),
    withParent("underIgnored", "ignoredButton", "image", "", at(23)),
  ];
  const entries = parentsOf(nodes, [21, 22, 23]);
  expect(entries.map((entry) => entry.parentRole)).toEqual(["option", "option", "listbox"]);
  expect(unnamedLine(entries)).toBe(
    "  Unnamed images by parent: before typing no unnamed images, after typing option 2, listbox 1",
  );
});

test("a cycle, a self-parent, a missing parent, an unknown parent id and the depth cap all report parent not reported", () => {
  const chain = (length: number): object[] => [
    withParent("root", undefined, "button", ""),
    ...Array.from({ length }, (_, index) =>
      withParent(`c${index}`, index === 0 ? "root" : `c${index - 1}`, "generic", ""),
    ),
  ];
  const nodes = [
    withParent("cycleA", "cycleB", "generic", ""),
    withParent("cycleB", "cycleA", "none", ""),
    withParent("selfWrapper", "selfWrapper", "generic", ""),
    withParent("inCycle", "cycleA", "image", "", at(31)),
    withParent("self", "self", "image", "", at(32)),
    withParent("underSelfWrapper", "selfWrapper", "image", "", at(33)),
    withParent("orphan", "nowhere", "image", "", at(34)),
    withParent("wrapperOrphan", "danglingWrapper", "image", "", at(35)),
    withParent("danglingWrapper", "nowhere", "generic", ""),
    // No node id of its own: still resolved from its parent.
    node("image", "", { ...at(36), parentId: "root" }),
    // 11 wrappers sit between the image and the button: within the cap of 12 steps.
    ...chain(11),
    withParent("within", tail(11), "image", "", at(37)),
  ];
  const entries = parentsOf(nodes, [31, 32, 33, 34, 35, 36, 37]);
  expect(entries.map((entry) => entry.parentRole)).toEqual([
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    "button",
    "button",
  ]);
  // 12 wrappers: the button is the 13th step, beyond the cap.
  const far = [...chain(12), withParent("far", tail(12), "image", "", at(38))];
  expect(parentsOf(far, [38]).map((entry) => entry.parentRole)).toEqual([undefined]);
  // 12 steps exactly reach the button when the image hangs under the 11th wrapper.
  const edge = [...chain(11), withParent("edge", tail(11), "image", "", at(39))];
  expect(parentsOf(edge, [39]).map((entry) => entry.parentRole)).toEqual(["button"]);
});

test("5,000 unnamed images are grouped quickly", () => {
  const tree: object[] = [
    withParent("opt", undefined, "option", ""),
    withParent("wrap", "opt", "generic", ""),
    ...Array.from({ length: 5000 }, (_, index) =>
      withParent(`img${index}`, "wrap", "image", "", at(5000 + index)),
    ),
  ];
  const started = performance.now();
  const entries = parentsOf(
    tree,
    Array.from({ length: 5000 }, (_, index) => 5000 + index),
  );
  const line = unnamedLine(entries);
  expect(performance.now() - started).toBeLessThan(1000);
  expect(line).toBe(
    "  Unnamed images by parent: before typing no unnamed images, after typing option 5000",
  );
});

test("the parent groups are capped, the rest are summed, and role names cannot collide with the labels", () => {
  const names = ["rolea", "roleb", "rolec", "roled", "rolee", "rolef", "roleg", "roleh", "rolei"];
  const parents = names.map((role, index) => withParent(`p${index}`, undefined, role, ""));
  const images = names.flatMap((_, index) => [
    withParent(`m${index}`, `p${index}`, "image", "", at(100 + index)),
    ...(index === 0 ? [withParent("extra", "p0", "image", "", at(200))] : []),
  ]);
  const ids = [...names.map((_, i) => 100 + i), 200];
  expect(unnamedLine(parentsOf([...parents, ...images], ids))).toBe(
    "  Unnamed images by parent: before typing no unnamed images, after typing rolea 2, roleb 1, rolec 1, roled 1, rolee 1, rolef 1, more groups 3",
  );
  // Real roles that look like the labels stay distinguishable from them.
  const lookalikes = [
    withParent("n", undefined, "other", ""),
    withParent("o", undefined, "button", ""),
    withParent("x", "n", "image", "", at(300)),
    withParent("y", "o", "image", "", at(301)),
  ];
  expect(unnamedLine(parentsOf(lookalikes, [300, 301]))).toBe(
    "  Unnamed images by parent: before typing no unnamed images, after typing button 1, other 1",
  );
  const unread = { ...accessibility, afterSuggestions: null };
  expect(
    liveReport({ ...base, accessibility: unread }).lines.find((l) => l.includes("Named images")),
  ).toBe("  Named images: before typing 0, after typing not read");
  expect(
    liveReport({ ...base, accessibility: unread }).lines.find((l) =>
      l.startsWith("  Unnamed images by parent"),
    ),
  ).toBe("  Unnamed images by parent: before typing no unnamed images, after typing not read");
});

test("a description longer than the cap prints 1000+ and never its text", () => {
  expect(
    liveReport({
      ...base,
      accessibility: {
        ...accessibility,
        afterAttach: [comboWith({ kind: "different", length: 1001 })],
      },
    }).lines,
  ).toContain(
    "  Combobox description: before typing present but different (length 1000+), after typing not reported",
  );
});

test("METRO-114 a Google request before the first focus fails the run and is printed", () => {
  const { lines, pass } = liveReport({ ...base, googleBeforeFocus: 1 });
  expect(pass).toBe(false);
  expect(lines).toContain("Google requests before the first focus: 1 (expected 0)");
  expect(liveReport(base).lines).toContain(
    "Google requests before the first focus: 0 (expected 0)",
  );
});

test("METRO-114 the focus after the swap is information, never a failure", () => {
  expect(liveReport(base).lines).toContain("Focus in the widget after the swap: yes");
  const lost = liveReport({ ...base, focusInWidget: false });
  expect(lost.lines).toContain("Focus in the widget after the swap: no");
  expect(lost.pass).toBe(true);
  expect(liveReport({ ...base, focusInWidget: null }).lines).toContain(
    "Focus in the widget after the swap: not read",
  );
});

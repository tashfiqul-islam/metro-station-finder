/**
 * Pure parts of the owner-run live check (`bun run smoke:live`, METRO-88): what may be printed. The run uses
 * the owner's real Google key, so nothing here may ever show it: console text is scrubbed, URLs lose their
 * query string, and the report holds counts, the Maps version, CSP messages, accessibility roles and names,
 * and a verdict only (METRO-100).
 */

const PINNED_VERSION_PREFIX = "3.66";
/** Longest accessible name printed, in code points; a longer one ends in an ellipsis. */
const MAX_NAME_LENGTH = 80;
/** Most Tab presses the live check makes, and so the most stops it reports. */
export const MAX_TAB_STOPS = 12;

/** Fixed FAIL labels, so a failure reads the same every time. */
const UNREADABLE =
  "could not read inside the widget (Unverified whether its closed shadow root hides it)";
const UNNAMED = "the search control has no accessible name";
const AMBIGUOUS = "more than one candidate search field";

/**
 * Removes any key, any URL query string and any Google-style key token from a console message. Case does
 * not matter (`KEY=`), `apikey=`, any name ending in `_key` or `-key` (`my_key=`, `api-key=`) and the
 * header form `x-goog-api-key: value` count, and so does the URL-encoded `key%3D`. `monkey=` is left alone.
 */
export function scrub(text: string): string {
  return text
    .replaceAll(/\?[^\s'")]*/gu, "?[query removed]")
    .replaceAll(
      /\b(?:x-goog-api-key|api[_-]?key|[\w-]*[_-]key|key)\s*(?::|=|%3d)\s*[^\s&'")]*/giu,
      "[key removed]",
    )
    .replaceAll(/AIza[\w-]{20,}/gu, "[key removed]");
}

/** A fixed refusal when this runs in CI: the check uses a real key and real Google, so only the owner runs it. */
export function ciRefusal(env: Readonly<Record<string, string | undefined>>): string | null {
  return env["CI"] === "true" || env["CI"] === "1"
    ? "FAIL\nThe live check uses a real Google key and never runs in CI."
    : null;
}

/**
 * One accessibility-tree node reduced to what may be printed: a role and a scrubbed, capped name. `id` is the
 * DOM node id when the tree gives one; it is only compared, never printed.
 */
export interface AxEntry {
  readonly role: string;
  readonly name: string;
  readonly id?: string;
}

/** Why the Tab walk ended. */
export type TabEnd =
  | "cap reached"
  | "wrapped to the first stop"
  | "focus left the page"
  | "read failed";

/** What the tree showed, read twice and then walked with Tab. A null read means the DevTools call failed. */
export interface AccessibilityRun {
  readonly afterAttach: readonly AxEntry[] | null;
  readonly afterSuggestions: readonly AxEntry[] | null;
  readonly tabOrder: readonly AxEntry[];
  readonly tabEnd: TabEnd;
}

const FIELD_ROLES = new Set(["textbox", "combobox", "searchbox"]);
const SNAPSHOT_ROLES = new Set([...FIELD_ROLES, "listbox", "option"]);

/** Raw names are cut to this many code points before any regex runs, so a hostile name cannot make the scrub slow. */
const MAX_RAW_NAME_LENGTH = 1000;
/** A role is printed only if it looks like one; anything else (newline, escape codes, bidi, a huge string) prints as this. */
const UNKNOWN_ROLE = "unknown";

/** Roles are short ASCII words (`textbox`, `RootWebArea`). Anything else is untrusted text and is never printed. */
function cleanRole(role: string): string {
  const trimmed = role.trim();
  return /^[A-Za-z]{1,40}$/u.test(trimmed) ? trimmed : UNKNOWN_ROLE;
}

/**
 * Makes an accessible name safe to print. Order matters: cut the raw text to a generous length (the scrub
 * has a quadratic pattern), whitespace becomes one space, control and format characters (NUL, bidi
 * overrides, zero-width) are deleted so they cannot split a key past the scrub, URL-like text (a scheme or
 * `www.` form, or a bare domain followed by a path) becomes a fixed token, the scrub runs, and the final
 * cut to 80 is made on code points. A bare domain with no path (`evil.test`) is left: it is not a link.
 */
export function cleanName(name: string): string {
  const flat = Array.from(name)
    .slice(0, MAX_RAW_NAME_LENGTH)
    .join("")
    .replaceAll(/\s+/gu, " ")
    .replaceAll(/[\p{Cc}\p{Cf}]/gu, "")
    .trim()
    .replaceAll(/(?:https?:\/\/|www\.)\S*|\b(?:[a-z0-9-]+\.)+[a-z]{2,}\/\S*/giu, "[url removed]");
  const points = Array.from(scrub(flat));
  return points.length > MAX_NAME_LENGTH
    ? `${points.slice(0, MAX_NAME_LENGTH).join("")}…`
    : points.join("");
}

interface ParsedNode extends AxEntry {
  readonly focused: boolean;
}

function propertyOf(object: object, key: string): unknown {
  return Reflect.get(object, key);
}

function valueOf(field: unknown): unknown {
  return typeof field === "object" && field !== null && "value" in field ? field.value : undefined;
}

function textOf(field: unknown): string {
  const value = valueOf(field);
  return typeof value === "string" ? value : "";
}

function isFocused(properties: unknown): boolean {
  return (
    Array.isArray(properties) &&
    (properties as unknown[]).some(
      (property) =>
        typeof property === "object" &&
        property !== null &&
        "name" in property &&
        property.name === "focused" &&
        "value" in property &&
        valueOf(property.value) === true,
    )
  );
}

/** Keeps the nodes a screen reader reaches (not `ignored`), reading only role, name, focus and node id; a value is never read. */
function parseNodes(nodes: unknown): ParsedNode[] {
  if (!Array.isArray(nodes)) return [];
  const parsed: ParsedNode[] = [];
  for (const node of nodes as unknown[]) {
    if (typeof node !== "object" || node === null) continue;
    const rawRole = textOf(propertyOf(node, "role"));
    if (propertyOf(node, "ignored") === true || rawRole === "") continue;
    const roleText = cleanRole(rawRole);
    const domId = propertyOf(node, "backendDOMNodeId");
    parsed.push({
      role: roleText,
      name: cleanName(textOf(propertyOf(node, "name"))),
      focused: isFocused(propertyOf(node, "properties")),
      ...(typeof domId === "number" ? { id: String(domId) } : {}),
    });
  }
  return parsed;
}

function entryOf({ role, name, id }: ParsedNode): AxEntry {
  return id === undefined ? { role, name } : { role, name, id };
}

/** The text fields, listbox and options of one `Accessibility.getFullAXTree` result, as roles and names only. */
export function snapshotEntries(nodes: unknown): AxEntry[] {
  return parseNodes(nodes)
    .filter((node) => SNAPSHOT_ROLES.has(node.role))
    .map(entryOf);
}

/** The element that has focus, whatever its role, or null when none (or only the page itself) does. */
export function focusedEntry(nodes: unknown): AxEntry | null {
  const node = parseNodes(nodes).find(
    (candidate) => candidate.focused && candidate.role !== "RootWebArea",
  );
  return node === undefined ? null : entryOf(node);
}

/** Same node by id when both have one; when only one has an id, or neither, by role and name. */
function sameStop(a: AxEntry, b: AxEntry): boolean {
  return a.id !== undefined && b.id !== undefined
    ? a.id === b.id
    : a.role === b.role && a.name === b.name;
}

/**
 * Adds one Tab stop. `readOk` is false when the tree could not be read. Done when the read failed, nothing
 * has focus, focus wrapped to the first stop (by node id when both have one, else by role and name), or the
 * cap is reached.
 */
export function addTabStop(
  order: readonly AxEntry[],
  next: AxEntry | null,
  readOk = true,
): { order: readonly AxEntry[]; end: TabEnd | null } {
  if (!readOk) return { order, end: "read failed" };
  if (next === null) return { order, end: "focus left the page" };
  const first = order[0];
  if (first !== undefined && sameStop(first, next)) {
    return { order, end: "wrapped to the first stop" };
  }
  const grown = [...order, next];
  return { order: grown, end: grown.length >= MAX_TAB_STOPS ? "cap reached" : null };
}

/** True once a Places request beyond the count seen before typing has arrived, so focus alone cannot pass for typing. */
export function typingReachedWidget(baseline: number, current: number): boolean {
  return current > baseline;
}

type Control =
  | { readonly kind: "none" }
  | { readonly kind: "many"; readonly count: number }
  | { readonly kind: "one"; readonly entry: AxEntry; readonly late: boolean };

/**
 * Exactly one text field must exist in the first read. Only when that read found none is the read after
 * typing consulted (it could carry typed state), and the report says so.
 */
function findControl(run: AccessibilityRun): Control {
  const first = (run.afterAttach ?? []).filter((entry) => FIELD_ROLES.has(entry.role));
  const late = first.length === 0;
  const fields = late
    ? (run.afterSuggestions ?? []).filter((entry) => FIELD_ROLES.has(entry.role))
    : first;
  const [only] = fields;
  if (only === undefined) return { kind: "none" };
  return fields.length > 1
    ? { kind: "many", count: fields.length }
    : { kind: "one", entry: only, late };
}

const describe = (entry: AxEntry): string => `${entry.role} ${JSON.stringify(entry.name)}`;

function reachedByTab(control: AxEntry, order: readonly AxEntry[]): boolean {
  return order.some((stop) => sameStop(control, stop));
}

function accessibilityLines(run: AccessibilityRun | null): {
  lines: string[];
  failure: string | null;
} {
  if (run === null) {
    return { lines: ["Accessibility: not attempted (the run stopped earlier)"], failure: null };
  }
  const control = findControl(run);
  const entries = run.afterSuggestions ?? [];
  const options = entries.filter((entry) => entry.role === "option").length;
  const lines = ["Accessibility (roles and names only):"];
  let failure: string | null = null;
  if (control.kind === "none") {
    lines.push("  Search control: not found in the accessibility tree");
    failure = UNREADABLE;
  } else if (control.kind === "many") {
    lines.push(`  Search control: ${control.count} candidates, none chosen`);
    failure = AMBIGUOUS;
  } else {
    lines.push(
      `  Search control: ${describe(control.entry)}${control.late ? " (found only in the read after typing)" : ""}`,
      `  Reached by Tab: ${reachedByTab(control.entry, run.tabOrder) ? "yes" : "no"} (information only)`,
    );
    failure = control.entry.name === "" ? UNNAMED : null;
  }
  lines.push(
    entries.some((entry) => entry.role === "listbox")
      ? `  Suggestion list after typing: listbox with ${options} options`
      : "  Suggestion list after typing: no listbox seen",
    `  Tab order (${run.tabOrder.length} stops, at most ${MAX_TAB_STOPS}; ended: ${run.tabEnd}):`,
    ...run.tabOrder.map((entry, index) => `    ${index + 1}. ${describe(entry)}`),
  );
  return { lines, failure };
}

export interface LiveRun {
  /** `google.maps.version` read from the page, or null when it could not be read. */
  readonly version: string | null;
  /** Console messages that name the Content Security Policy. */
  readonly cspMessages: readonly string[];
  readonly placesRequests: number;
  /** Places requests already seen when the Tab walk finished, before any click or typing (expected 0). */
  readonly placesDuringTabWalk: number;
  readonly routesRequests: number;
  readonly stationShown: boolean;
  readonly routeShown: boolean;
  /** Name of the step that threw, or null. */
  readonly failedStep: string | null;
  /** Null when the run stopped before the accessibility step, so nothing was read. */
  readonly accessibility: AccessibilityRun | null;
}

export function liveReport(run: LiveRun): { lines: string[]; pass: boolean } {
  const messages = [...new Set(run.cspMessages.map(scrub))];
  const versionOk = run.version?.startsWith(PINNED_VERSION_PREFIX) ?? false;
  const accessibility = accessibilityLines(run.accessibility);
  const pass =
    run.accessibility !== null &&
    accessibility.failure === null &&
    messages.length === 0 &&
    versionOk &&
    run.stationShown &&
    run.routeShown &&
    run.failedStep === null;
  const lines = [
    `Maps version: ${run.version ?? "unknown"}`,
    `CSP messages: ${messages.length}`,
    ...messages.map((message) => `  CSP: ${message}`),
    `Places requests (host places.googleapis.com): ${run.placesRequests}`,
    `Places requests during the Tab walk: ${run.placesDuringTabWalk} (expected 0)`,
    `Routes requests (host routes.googleapis.com): ${run.routesRequests}`,
    ...accessibility.lines,
  ];
  if (accessibility.failure !== null) lines.push(`Failed check: ${accessibility.failure}`);
  if (run.failedStep !== null) lines.push(`Failed step: ${run.failedStep}`);
  lines.push(pass ? "PASS" : "FAIL");
  return { lines, pass };
}

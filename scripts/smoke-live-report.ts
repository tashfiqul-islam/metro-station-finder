/**
 * Pure parts of the owner-run live check (`bun run smoke:live`, METRO-88): what may be printed. The run uses
 * the owner's real Google key, so nothing here may ever show it: console text is scrubbed, URLs lose their
 * query string, and the report holds counts, the Maps version, CSP messages, accessibility roles and names,
 * and a verdict only (METRO-100).
 */

const PINNED_VERSION_PREFIX = "3.66";
/** Longest accessible name printed; a longer one ends in an ellipsis. */
const MAX_NAME_LENGTH = 80;
/** Most Tab presses the live check makes, and so the most stops it reports. */
export const MAX_TAB_STOPS = 12;

/** Fixed FAIL labels, so a failure reads the same every time. */
const UNREADABLE =
  "could not read inside the widget (Unverified whether its closed shadow root hides it)";
const UNNAMED = "the search control has no accessible name";

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

/** One accessibility-tree node reduced to what may be printed: a role and a scrubbed, capped name. */
export interface AxEntry {
  readonly role: string;
  readonly name: string;
}

/** What the tree showed, read twice and then walked with Tab. A null read means the DevTools call failed. */
export interface AccessibilityRun {
  readonly afterAttach: readonly AxEntry[] | null;
  readonly afterSuggestions: readonly AxEntry[] | null;
  readonly tabOrder: readonly AxEntry[];
}

const FIELD_ROLES = new Set(["textbox", "combobox", "searchbox"]);
const SNAPSHOT_ROLES = new Set([...FIELD_ROLES, "listbox", "option"]);

/** Scrubs like a console message, flattens whitespace and control characters, then caps the length. */
export function cleanName(name: string): string {
  const flat = scrub(name)
    .replaceAll(/[\p{Cc}\s]+/gu, " ")
    .trim();
  return flat.length > MAX_NAME_LENGTH ? `${flat.slice(0, MAX_NAME_LENGTH)}…` : flat;
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

/** Keeps the nodes a screen reader reaches (not `ignored`), reading only role, name and focus; a value is never read. */
function parseNodes(nodes: unknown): ParsedNode[] {
  if (!Array.isArray(nodes)) return [];
  const parsed: ParsedNode[] = [];
  for (const node of nodes as unknown[]) {
    if (typeof node !== "object" || node === null) continue;
    const roleText = textOf(propertyOf(node, "role"));
    if (propertyOf(node, "ignored") === true || roleText === "") continue;
    parsed.push({
      role: roleText,
      name: cleanName(textOf(propertyOf(node, "name"))),
      focused: isFocused(propertyOf(node, "properties")),
    });
  }
  return parsed;
}

/** The text fields, listbox and options of one `Accessibility.getFullAXTree` result, as roles and names only. */
export function snapshotEntries(nodes: unknown): AxEntry[] {
  return parseNodes(nodes)
    .filter((node) => SNAPSHOT_ROLES.has(node.role))
    .map(({ role, name }) => ({ role, name }));
}

/** The element that has focus, whatever its role, or null when none (or only the page itself) does. */
export function focusedEntry(nodes: unknown): AxEntry | null {
  const node = parseNodes(nodes).find(
    (candidate) => candidate.focused && candidate.role !== "RootWebArea",
  );
  return node === undefined ? null : { role: node.role, name: node.name };
}

/** Adds one Tab stop. Done when nothing has focus, focus wrapped to the first stop (by role and name), or the cap is reached. */
export function addTabStop(
  order: readonly AxEntry[],
  next: AxEntry | null,
): { order: readonly AxEntry[]; done: boolean } {
  const first = order[0];
  if (next === null || (first?.role === next.role && first.name === next.name)) {
    return { order, done: true };
  }
  const grown = [...order, next];
  return { order: grown, done: grown.length >= MAX_TAB_STOPS };
}

function searchControl(run: AccessibilityRun): AxEntry | null {
  for (const entries of [run.afterAttach, run.afterSuggestions]) {
    const found = entries?.find((entry) => FIELD_ROLES.has(entry.role));
    if (found !== undefined) return found;
  }
  return null;
}

const describe = (entry: AxEntry): string => `${entry.role} ${JSON.stringify(entry.name)}`;

function accessibilityLines(run: AccessibilityRun): { lines: string[]; failure: string | null } {
  const control = searchControl(run);
  const entries = run.afterSuggestions ?? [];
  const options = entries.filter((entry) => entry.role === "option").length;
  const lines = [
    "Accessibility (roles and names only):",
    control === null
      ? "  Search control: not found in the accessibility tree"
      : `  Search control: ${describe(control)}`,
    entries.some((entry) => entry.role === "listbox")
      ? `  Suggestion list after typing: listbox with ${options} options`
      : "  Suggestion list after typing: no listbox seen",
    `  Tab order (${run.tabOrder.length} stops, at most ${MAX_TAB_STOPS}):`,
    ...run.tabOrder.map((entry, index) => `    ${index + 1}. ${describe(entry)}`),
  ];
  if (control === null) return { lines, failure: UNREADABLE };
  return { lines, failure: control.name === "" ? UNNAMED : null };
}

export interface LiveRun {
  /** `google.maps.version` read from the page, or null when it could not be read. */
  readonly version: string | null;
  /** Console messages that name the Content Security Policy. */
  readonly cspMessages: readonly string[];
  readonly placesRequests: number;
  readonly routesRequests: number;
  readonly stationShown: boolean;
  readonly routeShown: boolean;
  /** Name of the step that threw, or null. */
  readonly failedStep: string | null;
  readonly accessibility: AccessibilityRun;
}

export function liveReport(run: LiveRun): { lines: string[]; pass: boolean } {
  const messages = [...new Set(run.cspMessages.map(scrub))];
  const versionOk = run.version?.startsWith(PINNED_VERSION_PREFIX) ?? false;
  const accessibility = accessibilityLines(run.accessibility);
  const pass =
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
    `Routes requests (host routes.googleapis.com): ${run.routesRequests}`,
    ...accessibility.lines,
  ];
  if (accessibility.failure !== null) lines.push(`Failed check: ${accessibility.failure}`);
  if (run.failedStep !== null) lines.push(`Failed step: ${run.failedStep}`);
  lines.push(pass ? "PASS" : "FAIL");
  return { lines, pass };
}

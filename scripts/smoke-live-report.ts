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
  /** Tab stops only: whether the node sits inside the widget's subtree (absent when that was not resolved). */
  readonly inWidget?: boolean;
  /** Comboboxes only: the `expanded` state when the tree reports one. */
  readonly expanded?: boolean;
  /**
   * Comboboxes only: how the accessible description compares with our hint (METRO-102). Absent when the node
   * has no `description` field at all (printed as "not reported"). The text itself is never kept.
   */
  readonly description?: DescriptionState;
  /** Images only: the cleaned role of the parent node, when the tree names a parent we can resolve. */
  readonly parentRole?: string;
}

/** The accessible description of a node, reduced to a comparison with the hint. */
export type DescriptionState =
  | { readonly kind: "matches" }
  | { readonly kind: "different"; readonly length: number }
  | { readonly kind: "absent" };

/** Why the Tab walk ended. */
export type TabEnd =
  | "cap reached"
  | "wrapped to the first stop"
  | "focus left the page"
  | "focus on an ignored node"
  | "read failed";

/** What the tree showed, read twice and then walked with Tab. A null read means the DevTools call failed. */
export interface AccessibilityRun {
  readonly afterAttach: readonly AxEntry[] | null;
  readonly afterSuggestions: readonly AxEntry[] | null;
  readonly tabOrder: readonly AxEntry[];
  readonly tabEnd: TabEnd;
}

const FIELD_ROLES = new Set(["textbox", "combobox", "searchbox"]);
/** Chrome reports icons as `image`; `img` is the HTML name and is accepted too. */
const IMAGE_ROLES = new Set(["image", "img"]);
const SNAPSHOT_ROLES = new Set([...FIELD_ROLES, ...IMAGE_ROLES, "listbox", "option"]);

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

/** Most parent-role groups printed for unnamed images; the rest are summed as "more groups". */
const MAX_PARENT_GROUPS = 6;
/** A description longer than this prints as `1000+`; counting stops one past it. */
const MAX_DESCRIPTION_LENGTH = 1000;
const NO_PARENT = "parent not reported";
/** Most steps up the tree when looking for an image's meaningful parent. */
const MAX_PARENT_DEPTH = 12;
/**
 * Wrapper roles skipped when looking for an image's parent: a screen reader does not announce them, so the
 * question "what holds this icon" is answered by the nearest ancestor that is none of these (and not
 * `ignored`). A hostile or cyclic tree ends the walk with "parent not reported".
 */
const WRAPPER_ROLES = new Set(["generic", "none", "StaticText", "InlineTextBox", "LineBreak"]);

/** Hint and description are compared after collapsing whitespace, trimming and case-folding. */
function fold(text: string): string {
  return text.replaceAll(/\s+/gu, " ").trim().toLowerCase();
}

/** Code points in `text`, counting no further than `limit`: only the first 2 * limit UTF-16 units are copied. */
function codePointsUpTo(text: string, limit: number): number {
  return Math.min(Array.from(text.slice(0, limit * 2)).length, limit);
}

/**
 * CDP `AXNode.description` is an optional `AXValue` (Inferred from the protocol's typed definition; Chrome
 * is understood to leave the field out when there is no description, so "not reported" cannot tell "none"
 * from "not exposed"). No field, or a value that is not a string, is `undefined` ("not reported"); a string
 * that is empty after trimming is "absent". Equality with the hint is exact after folding; anything else
 * (extra text included) is "different".
 */
function describeState(node: object, hint: string): DescriptionState | undefined {
  if (!("description" in node)) return undefined;
  const value = valueOf(propertyOf(node, "description"));
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (text === "") return { kind: "absent" };
  if (text.length <= MAX_RAW_NAME_LENGTH && hint.trim() !== "" && fold(text) === fold(hint)) {
    return { kind: "matches" };
  }
  return { kind: "different", length: codePointsUpTo(text, MAX_DESCRIPTION_LENGTH + 1) };
}

interface TreeEntry {
  readonly role: string;
  readonly parentId: string | undefined;
  readonly wrapper: boolean;
}

/** Every node by id (ignored ones too), with its cleaned role, parent id and whether it is a skipped wrapper. */
function treeById(nodes: readonly unknown[]): Map<string, TreeEntry> {
  const tree = new Map<string, TreeEntry>();
  for (const node of nodes) {
    if (typeof node !== "object" || node === null) continue;
    const id = propertyOf(node, "nodeId");
    const rawRole = textOf(propertyOf(node, "role"));
    if (typeof id !== "string" || rawRole === "") continue;
    const role = cleanRole(rawRole);
    const parentId = propertyOf(node, "parentId");
    tree.set(id, {
      role,
      parentId: typeof parentId === "string" ? parentId : undefined,
      wrapper: propertyOf(node, "ignored") === true || WRAPPER_ROLES.has(role),
    });
  }
  return tree;
}

/**
 * The role of the nearest ancestor that is not a wrapper, or undefined (printed "parent not reported") on a
 * missing parent, a cycle, a self-parent or after MAX_PARENT_DEPTH steps.
 */
function meaningfulParentRole(
  tree: ReadonlyMap<string, TreeEntry>,
  ownId: unknown,
  firstParent: unknown,
): string | undefined {
  const seen = new Set<string>(typeof ownId === "string" ? [ownId] : []);
  let id = firstParent;
  for (let depth = 0; depth < MAX_PARENT_DEPTH && typeof id === "string"; depth += 1) {
    if (seen.has(id)) return undefined;
    seen.add(id);
    const entry = tree.get(id);
    if (entry === undefined) return undefined;
    if (!entry.wrapper) return entry.role;
    id = entry.parentId;
  }
  return undefined;
}

interface ParsedNode extends AxEntry {
  readonly focused: boolean;
  readonly domId: number | undefined;
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

function isExpanded(properties: unknown): boolean | undefined {
  if (!Array.isArray(properties)) return undefined;
  for (const property of properties as unknown[]) {
    if (typeof property !== "object" || property === null) continue;
    if (propertyOf(property, "name") !== "expanded") continue;
    const value = valueOf(propertyOf(property, "value"));
    return typeof value === "boolean" ? value : undefined;
  }
  return undefined;
}

/** Keeps the nodes a screen reader reaches (not `ignored`), reading only role, name, focus and node id; a value is never read. */
function parseNodes(nodes: unknown, hint = ""): ParsedNode[] {
  if (!Array.isArray(nodes)) return [];
  const tree = treeById(nodes as unknown[]);
  const parsed: ParsedNode[] = [];
  for (const node of nodes as unknown[]) {
    if (typeof node !== "object" || node === null) continue;
    const rawRole = textOf(propertyOf(node, "role"));
    if (propertyOf(node, "ignored") === true || rawRole === "") continue;
    const roleText = cleanRole(rawRole);
    const rawId = propertyOf(node, "backendDOMNodeId");
    const domId = typeof rawId === "number" ? rawId : undefined;
    const properties = propertyOf(node, "properties");
    const expanded = roleText === "combobox" ? isExpanded(properties) : undefined;
    const parentRole = IMAGE_ROLES.has(roleText)
      ? meaningfulParentRole(tree, propertyOf(node, "nodeId"), propertyOf(node, "parentId"))
      : undefined;
    const description = roleText === "combobox" ? describeState(node, hint) : undefined;
    parsed.push({
      role: roleText,
      name: cleanName(textOf(propertyOf(node, "name"))),
      focused: isFocused(properties),
      domId,
      ...(domId === undefined ? {} : { id: String(domId) }),
      ...(expanded === undefined ? {} : { expanded }),
      ...(description === undefined ? {} : { description }),
      ...(parentRole === undefined ? {} : { parentRole }),
    });
  }
  return parsed;
}

function entryOf({ role, name, id, expanded, description, parentRole }: ParsedNode): AxEntry {
  return {
    role,
    name,
    ...(id === undefined ? {} : { id }),
    ...(expanded === undefined ? {} : { expanded }),
    ...(description === undefined ? {} : { description }),
    ...(parentRole === undefined ? {} : { parentRole }),
  };
}

/**
 * The text fields, images, listbox and options of one `Accessibility.getFullAXTree` result that sit inside
 * the widget (their DOM node id is in `widgetIds`), as roles and names only. Nodes with no id are dropped.
 * `hint` is our fixed hint text; a combobox description is reduced to a comparison with it (METRO-102).
 */
export function snapshotEntries(
  nodes: unknown,
  widgetIds: ReadonlySet<number>,
  hint = "",
): AxEntry[] {
  return parseNodes(nodes, hint)
    .filter(
      (node) =>
        SNAPSHOT_ROLES.has(node.role) && node.domId !== undefined && widgetIds.has(node.domId),
    )
    .map(entryOf);
}

/**
 * The element that has focus, whatever its role, or null when none (or only the page itself) does. With
 * `widgetIds` the entry says whether the focused node is inside the widget.
 */
export function focusedEntry(
  nodes: unknown,
  widgetIds: ReadonlySet<number> | null = null,
): AxEntry | null {
  const node = parseNodes(nodes).find(
    (candidate) => candidate.focused && candidate.role !== "RootWebArea",
  );
  if (node === undefined) return null;
  return widgetIds === null
    ? entryOf(node)
    : {
        ...entryOf(node),
        inWidget: node.domId !== undefined && widgetIds.has(node.domId),
      };
}

const isWidget = (node: object): boolean =>
  String(propertyOf(node, "nodeName")).toLowerCase() === "gmp-place-autocomplete";
const childrenOf = (node: object): object[] =>
  ["children", "shadowRoots", "pseudoElements"].flatMap((key) => {
    const list = propertyOf(node, key);
    return Array.isArray(list)
      ? (list as unknown[]).filter(
          (item): item is object => typeof item === "object" && item !== null,
        )
      : [];
  });
const contentOf = (node: object): object[] => {
  const content = propertyOf(node, "contentDocument");
  return typeof content === "object" && content !== null ? [content] : [];
};
const below = (node: object): object[] => [...childrenOf(node), ...contentOf(node)];

/**
 * The DOM node ids of the widget element (`gmp-place-autocomplete`, the first in document order) and
 * everything below it, shadow roots included, from a `DOM.getDocument` tree read with `pierce: true`. Null
 * when the element is not in the tree, so the caller reports that nothing could be read inside the widget.
 */
/** Pushes in reverse so a stack pops them in order; a loop, because a spread of a huge list can throw. */
function pushReversed(stack: object[], items: readonly object[]): void {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item !== undefined) stack.push(item);
  }
}

export function widgetNodeIds(root: unknown): Set<number> | null {
  // Document order: depth first, so the first widget found is the first on the page.
  const stack: object[] = typeof root === "object" && root !== null ? [root] : [];
  let widget: object | null = null;
  while (widget === null) {
    const node = stack.pop();
    if (node === undefined) return null;
    if (isWidget(node)) widget = node;
    else pushReversed(stack, below(node));
  }
  const ids = new Set<number>();
  const pending: object[] = [widget];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    const id = propertyOf(node, "backendNodeId");
    if (typeof id === "number") ids.add(id);
    pushReversed(pending, below(node));
  }
  return ids.size === 0 ? null : ids;
}

/** Same node by id when both have one; when only one has an id, or neither, by role and name. */
function sameStop(a: AxEntry, b: AxEntry): boolean {
  return a.id !== undefined && b.id !== undefined
    ? a.id === b.id
    : a.role === b.role && a.name === b.name;
}

/**
 * True when a focused node is in the tree but is `ignored` (not exposed to a screen reader): focus has not
 * left the page, it is somewhere the report cannot name.
 */
export function focusIsIgnored(nodes: unknown): boolean {
  return (
    Array.isArray(nodes) &&
    (nodes as unknown[]).some(
      (node) =>
        typeof node === "object" &&
        node !== null &&
        propertyOf(node, "ignored") === true &&
        isFocused(propertyOf(node, "properties")),
    )
  );
}

/**
 * Adds one Tab stop. `readOk` is false when the tree could not be read; `ignoredFocus` is true when `next`
 * is null only because the focused node is ignored. Done when the read failed, nothing
 * has focus, focus wrapped to the first stop (by node id when both have one, else by role and name), or the
 * cap is reached.
 */
export function addTabStop(
  order: readonly AxEntry[],
  next: AxEntry | null,
  readOk = true,
  ignoredFocus = false,
): { order: readonly AxEntry[]; end: TabEnd | null } {
  if (!readOk) return { order, end: "read failed" };
  if (next === null) {
    return { order, end: ignoredFocus ? "focus on an ignored node" : "focus left the page" };
  }
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
  | { readonly kind: "one"; readonly entry: AxEntry; readonly note: string };

/**
 * Exactly one text field must exist in the first read. Only when that read found none is the read after
 * typing consulted (it could carry typed state), and the report says so.
 */
function findControl(run: AccessibilityRun): Control {
  const first = (run.afterAttach ?? []).filter((entry) => FIELD_ROLES.has(entry.role));
  const late = first.length === 0;
  const note = !late
    ? ""
    : run.afterAttach === null
      ? " (first read failed; found in the read after typing)"
      : " (found only in the read after typing)";
  const fields = late
    ? (run.afterSuggestions ?? []).filter((entry) => FIELD_ROLES.has(entry.role))
    : first;
  const [only] = fields;
  if (only === undefined) return { kind: "none" };
  return fields.length > 1
    ? { kind: "many", count: fields.length }
    : { kind: "one", entry: only, note };
}

const describe = (entry: AxEntry): string => `${entry.role} ${JSON.stringify(entry.name)}`;

function reachedByTab(control: AxEntry, order: readonly AxEntry[]): boolean {
  return order.some((stop) => sameStop(control, stop));
}

/** `yes`, `no`, or `not reported` when the tree gave no `expanded` state (Unverified, never guessed). */
function expandedText(entries: readonly AxEntry[] | null): string {
  const state = entries?.find((entry) => entry.role === "combobox")?.expanded;
  if (state === undefined) return "not reported";
  return state ? "yes" : "no";
}

/** Counts only: icon names are not needed. */
function imageText(entries: readonly AxEntry[] | null): string {
  if (entries === null) return "not read";
  const images = entries.filter((entry) => IMAGE_ROLES.has(entry.role));
  return `${images.length} (${images.filter((entry) => entry.name === "").length} unnamed)`;
}

/** How the first combobox's description compares with the hint; a status only, never the text. */
function descriptionText(entries: readonly AxEntry[] | null): string {
  if (entries === null) return "not read";
  const state = entries.find((entry) => entry.role === "combobox")?.description;
  if (state === undefined) return "not reported";
  if (state.kind === "matches") return "matches the hint";
  if (state.kind === "absent") return "absent";
  const length =
    state.length > MAX_DESCRIPTION_LENGTH ? `${MAX_DESCRIPTION_LENGTH}+` : state.length;
  return `present but different (length ${length})`;
}

/** Unnamed images counted by the role of their parent, largest group first, at most MAX_PARENT_GROUPS groups. */
function unnamedByParent(entries: readonly AxEntry[] | null): string {
  if (entries === null) return "not read";
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!IMAGE_ROLES.has(entry.role) || entry.name !== "") continue;
    const parent = entry.parentRole ?? NO_PARENT;
    counts.set(parent, (counts.get(parent) ?? 0) + 1);
  }
  if (counts.size === 0) return "no unnamed images";
  // Largest first, ties by role. Picked one at a time: the lib has no toSorted and the lint bans sort.
  const remaining = new Map(counts);
  const shown: string[] = [];
  while (shown.length < MAX_PARENT_GROUPS && remaining.size > 0) {
    const best = [...remaining].reduce((top, group) =>
      group[1] > top[1] || (group[1] === top[1] && group[0] < top[0]) ? group : top,
    );
    remaining.delete(best[0]);
    shown.push(`${best[0]} ${best[1]}`);
  }
  let rest = 0;
  for (const count of remaining.values()) rest += count;
  return (rest === 0 ? shown : [...shown, `more groups ${rest}`]).join(", ");
}

function namedImages(entries: readonly AxEntry[] | null): string {
  if (entries === null) return "not read";
  return String(entries.filter((entry) => IMAGE_ROLES.has(entry.role) && entry.name !== "").length);
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
      `  Search control: ${describe(control.entry)}${control.note}`,
      `  Reached by Tab: ${reachedByTab(control.entry, run.tabOrder) ? "yes" : "no"} (information only)`,
    );
    failure = control.entry.name === "" ? UNNAMED : null;
  }
  lines.push(
    `  Combobox expanded: before typing ${expandedText(run.afterAttach)}, after typing ${expandedText(run.afterSuggestions)}`,
    `  Widget images: before typing ${imageText(run.afterAttach)}, after typing ${imageText(run.afterSuggestions)}`,
    `  Unnamed images by parent: before typing ${unnamedByParent(run.afterAttach)}, after typing ${unnamedByParent(run.afterSuggestions)}`,
    `  Named images: before typing ${namedImages(run.afterAttach)}, after typing ${namedImages(run.afterSuggestions)}`,
    `  Combobox description: before typing ${descriptionText(run.afterAttach)}, after typing ${descriptionText(run.afterSuggestions)}`,
  );
  lines.push(
    entries.some((entry) => entry.role === "listbox")
      ? `  Suggestion list after typing: listbox with ${options} ${options === 1 ? "option" : "options"}`
      : "  Suggestion list after typing: no listbox seen",
    `  Tab order (${run.tabOrder.length} stops, at most ${MAX_TAB_STOPS}; ended: ${run.tabEnd}):`,
    ...run.tabOrder.map(
      (entry, index) =>
        `    ${index + 1}. ${describe(entry)}${entry.inWidget === true ? " [in widget]" : ""}`,
    ),
  );
  return { lines, failure };
}

export interface LiveRun {
  /** `google.maps.version` read from the page, or null when it could not be read. */
  readonly version: string | null;
  /** Console messages that name the Content Security Policy. */
  readonly cspMessages: readonly string[];
  readonly placesRequests: number;
  /**
   * Requests to any Google host seen after the page loaded and before the first focus of the place search
   * (METRO-114: the Maps script waits for that focus). Expected 0; more fails the run.
   */
  readonly googleBeforeFocus: number;
  /**
   * Whether keyboard focus was on the Google widget (its host or inside it) right after the widget replaced the
   * plain input that had focus; null when it could not be read. Information only (Unverified: whether `focus()`
   * on Google's host reaches its inner input).
   */
  readonly focusInWidget: boolean | null;
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
    run.googleBeforeFocus === 0 &&
    run.stationShown &&
    run.routeShown &&
    run.failedStep === null;
  const lines = [
    `Maps version: ${run.version ?? "unknown"}`,
    `CSP messages: ${messages.length}`,
    ...messages.map((message) => `  CSP: ${message}`),
    `Google requests before the first focus: ${run.googleBeforeFocus} (expected 0)`,
    `Focus in the widget after the swap: ${run.focusInWidget === null ? "not read" : run.focusInWidget ? "yes" : "no"}`,
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

/**
 * Pure parts of the owner-run live check (`bun run smoke:live`, METRO-88): what may be printed. The run uses
 * the owner's real Google key, so nothing here may ever show it: console text is scrubbed, URLs lose their
 * query string, and the report holds counts, the Maps version, CSP messages and a verdict only.
 */

const PINNED_VERSION_PREFIX = "3.66";

/** Removes any key, any URL query string and any Google-style key token from a console message. */
export function scrub(text: string): string {
  return text
    .replaceAll(/\?[^\s'")]*/gu, "?[query removed]")
    .replaceAll(/\bkey=[^\s&'")]*/gu, "key=[removed]")
    .replaceAll(/AIza[\w-]{20,}/gu, "[key removed]")
    .replaceAll("key=[removed]", "[key removed]");
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
}

export function liveReport(run: LiveRun): { lines: string[]; pass: boolean } {
  const messages = [...new Set(run.cspMessages.map(scrub))];
  const versionOk = run.version?.startsWith(PINNED_VERSION_PREFIX) ?? false;
  const pass =
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
  ];
  if (run.failedStep !== null) lines.push(`Failed step: ${run.failedStep}`);
  lines.push(pass ? "PASS" : "FAIL");
  return { lines, pass };
}

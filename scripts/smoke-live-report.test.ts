import { ciRefusal, liveReport, scrub } from "./smoke-live-report.ts";

/** Built from pieces so no key-shaped literal sits in the repository (the secret scan would flag it). */
const keyLike = ["AI", "zaSy", "A1234567890abcdefghijklmnopqrstuv"].join("");

const base = {
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

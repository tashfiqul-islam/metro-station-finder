import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The handoff mockups carry a "Sample data" tag (`.mock-only`, `.tag--sample`) next to made-up numbers. They are
 * a design aid and must never ship (owner decision, METRO-109 and METRO-112). This guard reads every shipped
 * source file; `e2e/station-picker.e2e.ts` checks the built files the same way.
 */
const MARKER = /sample data|mock-only|tag--sample/iu;

/** Paths of the files in `findings` that contain a marker. */
function withMarker(files: Readonly<Record<string, string>>): string[] {
  return Object.entries(files)
    .filter(([, text]) => MARKER.test(text))
    .map(([path]) => path);
}

/** Shipped source: everything under `apps/web/src` and `apps/web/public` except test files, plus `index.html`. */
function shippedSource(): Record<string, string> {
  const files: Record<string, string> = {
    "apps/web/index.html": readFileSync("apps/web/index.html", "utf8"),
  };
  for (const root of ["apps/web/src", "apps/web/public"]) {
    for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || /\.test\.tsx?$/u.test(entry.name)) continue;
      if (!/\.(css|html|js|json|svg|tsx?|txt|webmanifest)$/u.test(entry.name)) continue;
      const path = join(entry.parentPath, entry.name).replaceAll("\\", "/");
      files[path.slice(path.indexOf("apps/web/"))] = readFileSync(path, "utf8");
    }
  }
  return files;
}

test("METRO-112 no shipped source file carries the Sample data tag or the mock-only class", () => {
  const files = shippedSource();
  expect(Object.keys(files).length).toBeGreaterThan(60);
  expect(Object.keys(files)).toContain("apps/web/src/AppRoutes.tsx");
  expect(withMarker(files)).toEqual([]);
});

test("METRO-112 the guard can fail: each marker is found, in any case, and clean text is not", () => {
  expect(withMarker({ a: '<span class="tag tag--sample mock-only">Sample data</span>' })).toEqual([
    "a",
  ]);
  expect(withMarker({ a: "SAMPLE DATA" })).toEqual(["a"]);
  expect(withMarker({ a: ".mock-only { display: none }" })).toEqual(["a"]);
  expect(withMarker({ a: ".tag--sample {}" })).toEqual(["a"]);
  expect(withMarker({ a: "Fares as of: DTCA notice", b: "Sample data" })).toEqual(["b"]);
});

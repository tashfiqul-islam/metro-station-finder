import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "vitest";

/**
 * METRO-118: `base.css` forces a 3px ring on script focus for `section:focus` only (the two error fallbacks).
 * Any other focusable section would get that forced ring after a tap, so a new one must be a deliberate change
 * to this list and to the evidence, not an accident.
 */
const ALLOWED = new Set(["error-boundary.tsx", "lazy-feature.tsx"]);

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sources(path);
    return entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx") ? [path] : [];
  });
}

test("METRO-118 only the two error fallbacks are focusable sections", () => {
  const found = sources(join(import.meta.dirname)).filter((path) =>
    /<section\b[^>]*\btabIndex\b/u.test(readFileSync(path, "utf8")),
  );
  const names = found.map((path) => path.split(/[\\/]/u).pop() ?? path);
  expect(new Set(names)).toEqual(ALLOWED);
});

test("METRO-118 base.css forces the ring on section:focus and not on every tabindex=-1", () => {
  const css = readFileSync(join(import.meta.dirname, "styles", "base.css"), "utf8");
  expect(css).toContain("section:focus {");
  expect(css).not.toContain('[tabindex="-1"]:focus');
});

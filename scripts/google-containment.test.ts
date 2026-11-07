import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { googleOutsideAdapter } from "./google-containment.ts";

const root = resolve(import.meta.dir, "..");

function sources(directory: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) Object.assign(files, sources(path));
    else if (/\.tsx?$/u.test(entry.name)) {
      files[relative(root, join(root, path)).replaceAll("\\", "/")] = readFileSync(
        join(root, path),
        "utf8",
      );
    }
  }
  return files;
}

test("METRO-88 a feature using google.maps or window.google without an import is found", () => {
  const found = googleOutsideAdapter({
    "apps/web/src/features/x/a.tsx": "const bounds = new google.maps.LatLngBounds();",
    "apps/web/src/features/x/b.ts": "const g = window.google;",
    "apps/web/src/features/x/c.ts": "const g = globalThis.google;",
    "apps/web/src/features/x/d.ts": "const g = self.google;",
    "apps/web/src/features/x/e.ts": 'const g = window["google"];',
    "apps/web/src/features/x/f.ts": "const g = globalThis['google'];",
    "apps/web/src/features/x/g.ts": "const g = self[ `google` ];",
    "apps/web/src/features/x/clean.ts": "const googleLike = 1; // mentions Google in prose",
    "apps/web/src/adapters/maps/ok.ts": "const bounds = new google.maps.LatLngBounds();",
  });
  expect(found).toEqual([
    "apps/web/src/features/x/a.tsx",
    "apps/web/src/features/x/b.ts",
    "apps/web/src/features/x/c.ts",
    "apps/web/src/features/x/d.ts",
    "apps/web/src/features/x/e.ts",
    "apps/web/src/features/x/f.ts",
    "apps/web/src/features/x/g.ts",
  ]);
});

test("METRO-88 no web or package source outside apps/web/src/adapters/maps uses the Google global", () => {
  const files = {
    ...sources("apps/web/src"),
    ...sources("apps/api/src"),
    ...sources("packages/core/src"),
    ...sources("packages/contracts/src"),
  };
  expect(Object.keys(files).length).toBeGreaterThan(20);
  expect(googleOutsideAdapter(files)).toEqual([]);
});

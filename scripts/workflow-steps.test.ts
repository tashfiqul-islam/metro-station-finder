import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { unnamedSteps } from "./workflow-steps";

const wrap = (steps: string) => `jobs:\n  one:\n    runs-on: x\n    steps:\n${steps}`;

test("METRO-23 a named step passes, whatever its kind", () => {
  expect(unnamedSteps(wrap("      - name: Check out\n        uses: a/b@c\n"))).toEqual([]);
  expect(unnamedSteps(wrap("      - uses: a/b@c\n        name: Check out\n"))).toEqual([]);
  expect(unnamedSteps(wrap("      - name: Build\n        run: bun run build\n"))).toEqual([]);
});

test("METRO-23 unnamed uses and run steps are reported with their line", () => {
  const text = wrap(
    "      - uses: actions/checkout@abc\n        with:\n          x: y\n      - run: bun run build\n      - name: Fine\n        run: ok\n",
  );
  expect(unnamedSteps(text)).toEqual([
    "line 5: - uses: actions/checkout@abc",
    "line 8: - run: bun run build",
  ]);
});

test("METRO-23 a name inside with: or env: does not count as the step name", () => {
  const text = wrap("      - uses: a/b@c\n        with:\n          name: artifact\n");
  expect(unnamedSteps(text)).toHaveLength(1);
});

test("METRO-23 comments and blank lines between steps are ignored, steps end at the next job", () => {
  const text = `jobs:\n  one:\n    steps:\n      - name: A\n        run: a\n\n      # note\n      - run: b\n  two:\n    steps:\n      - name: C\n        run: c\n`;
  expect(unnamedSteps(text)).toEqual(["line 8: - run: b"]);
});

test("METRO-23 every repository workflow step has a name", () => {
  for (const file of readdirSync(".github/workflows")) {
    if (!/\.ya?ml$/u.test(file)) continue;
    expect({
      file,
      unnamed: unnamedSteps(readFileSync(join(".github/workflows", file), "utf8")),
    }).toEqual({ file, unnamed: [] });
  }
});

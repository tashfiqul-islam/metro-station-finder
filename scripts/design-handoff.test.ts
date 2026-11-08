import { existsSync, readFileSync, readdirSync } from "node:fs";

// METRO-110: docs/design/handoff/ is a frozen reference snapshot. These tests pin the one ignore it
// needs and the separation from the shipped app, so a later config edit cannot silently re-enable a tool.
const FOLDER = "docs/design/handoff";

test("formatter ignores the frozen handoff folder", () => {
  expect(readFileSync(".oxfmtrc.json", "utf8")).toContain(`"${FOLDER}/**"`);
});

test("the linter and knip never walk the handoff folder", () => {
  const lintLine = readFileSync("package.json", "utf8")
    .split("\n")
    .find((line) => line.includes('"lint":'));
  expect(lintLine).toBeDefined();
  expect(lintLine).not.toContain("docs");
  expect(readFileSync("knip.json", "utf8")).not.toContain("docs");
});

test("nothing from the handoff folder is served by the app", () => {
  expect(existsSync(`${FOLDER}/theme-boot.js`)).toBe(true);
  const served = readdirSync("apps/web/public", { recursive: true }).map(String);
  expect(served.some((name) => name.includes("handoff"))).toBe(false);
  const wrangler = ["apps/api/wrangler.jsonc", "apps/api/wrangler.json", "apps/api/wrangler.toml"]
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  expect(wrangler).not.toContain("design/handoff");
});

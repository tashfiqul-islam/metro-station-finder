import { readFileSync } from "node:fs";
import { join } from "node:path";

import { validateTag } from "./release-sync.ts";

const root = join(import.meta.dir, "..");
const read = (file: string): string => readFileSync(join(root, file), "utf8");
const policy = read("docs/agents/release-policy.md");

test("METRO-34 the tag rule examples in the policy match the code that enforces them", () => {
  for (const tag of ["v1.0.0", "v0.0.2", "v1.0.0-rc.1", "v1.2.0-beta.2", "v10.20.30"])
    expect(validateTag(tag)).toBe(tag);
  for (const tag of ["1.0.0", "v1.0", "v01.0.0", "v1.0.0+build.5", "V1.0.0", "v1.0.0-", "main"])
    expect(() => validateTag(tag)).toThrow("Tag must look like");
  expect(policy).toContain("`v<major>.<minor>.<patch>-<prerelease>`");
  expect(policy).toContain("`v1.0.0-rc.1`");
});

test("METRO-34 the release-sync and release-draft specifications refer to the one policy", () => {
  for (const file of [
    "docs/specifications/release-sync.md",
    "docs/specifications/release-draft.md",
  ])
    expect(read(file)).toContain("(../agents/release-policy.md)");
});

test("METRO-34 the policy names who bumps and where release notes come from", () => {
  expect(policy).toMatch(/## Who bumps/u);
  expect(policy).toMatch(/Agents and automation never choose a version, create a tag/u);
  expect(policy).toMatch(/## Release notes/u);
  expect(policy).toContain("Plane release log");
});

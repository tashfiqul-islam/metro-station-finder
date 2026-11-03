import { expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { isRecord } from "./guards";
import { checkLinks, formatProblem } from "./links";

const root = resolve(import.meta.dir, "..");
const read = (file: string) => readFile(join(root, file), "utf8");

const MIT = `MIT License

Copyright (c) 2026 Tashfiqul Islam

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

test("FND-H4 LICENSE holds the exact MIT text and the manifest declares MIT", async () => {
  expect((await read("LICENSE")).replaceAll("\r\n", "\n")).toBe(MIT);
  expect(JSON.parse(await read("package.json")).license).toBe("MIT");
});

test("FND-H4 README links licensing, security, contribution and the PR template", async () => {
  const readme = await read("README.md");
  for (const target of [
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    ".github/pull_request_template.md",
  ])
    expect(readme).toContain(`](${target})`);
  const root0 = await readdir(root);
  expect(root0).toContain("SECURITY.md");
  expect(root0).toContain("CONTRIBUTING.md");
});

test("FND-H4 pull request template asks for the required evidence", async () => {
  const template = (await read(".github/pull_request_template.md")).toLowerCase();
  for (const field of ["ticket id", "specification", "checks run", "checks not run", "review"])
    expect(template).toContain(field);
});

test("FND-H5 CLAUDE.md contains only the AGENTS.md import", async () => {
  expect((await read("CLAUDE.md")).trim()).toBe("@AGENTS.md");
});

test("FND-H3 ADR template and Accepted ADR-0001 are linked from architecture and domain guides", async () => {
  expect(await read("docs/adr/0001-foundation-baseline.md")).toMatch(/^- Status: Accepted$/mu);
  expect(await read("docs/adr/0000-template.md")).toMatch(/Status/u);
  for (const guide of ["docs/agents/architecture.md", "docs/agents/domain.md"]) {
    const body = await read(guide);
    expect(body).toContain("adr/0001-foundation-baseline.md");
  }
  expect(await read("docs/agents/domain.md")).toContain("adr/0000-template.md");
});

test("FND-H2 guidance carries no stale METRO-12 or layout claims", async () => {
  const stale = [/pending METRO-12/iu, /proposed checks/iu, /not available verified gates/iu];
  const files = [
    "README.md",
    "docs/development.md",
    ...(await readdir(join(root, "docs/agents")))
      .filter((file) => file.endsWith(".md"))
      .map((file) => `docs/agents/${file}`),
  ];
  for (const file of files) {
    const body = await read(file);
    for (const pattern of stale) expect(`${file}: ${pattern.test(body)}`).toBe(`${file}: false`);
  }
  expect(await read("docs/agents/domain.md")).not.toMatch(/^└── src\/$/mu);
  expect(await read("docs/agents/ui.md")).not.toMatch(/Playwright\/axe are proposed/u);
});

test("FND-H2 the preparation README snippet lists every locked skill root", async () => {
  const lock: unknown = JSON.parse(await read("docs/agents/skills.lock.json"));
  const collections =
    isRecord(lock) && Array.isArray(lock["collections"]) ? lock["collections"] : [];
  const roots = new Set(
    collections.map((file: unknown) => (isRecord(file) ? file["root"] : undefined)),
  );
  const readme = await read("docs/examples/plane-preparation/README.md");
  expect(roots.size).toBeGreaterThan(0);
  for (const name of roots) expect(readme).toMatch(new RegExp(String.raw`^\s+${name} = '`, "mu"));
});

test("FND-H1 the real repository Markdown has no broken relative link or anchor", async () => {
  const files = [
    "README.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "docs/development.md",
    "docs/adr/0000-template.md",
    "docs/adr/0001-foundation-baseline.md",
    ...(await readdir(join(root, "docs/agents")))
      .filter((file) => file.endsWith(".md"))
      .map((file) => `docs/agents/${file}`),
  ];
  const problems = await checkLinks(root, files);
  expect(problems.map(formatProblem)).toEqual([]);
});

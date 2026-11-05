import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { checkLinks, formatProblem, githubSlugs } from "./links";

const roots: string[] = [];

/** The first element of `items`; fails the test when there is none. */
function first<T>(items: readonly T[]): T {
  const [item] = items;
  if (item === undefined) throw new Error("expected at least one item");
  return item;
}

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "metro-links-"));
  roots.push(root);
  for (const [name, body] of Object.entries(files)) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), body);
  }
  return root;
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

test("FND-H1 passes when relative links, directories and anchors resolve", async () => {
  const root = await fixture({
    "README.md":
      "# Title\n\n[doc](docs/a.md) [anchor](docs/a.md#second-part) [dir](docs/) [self](#title)\n",
    "docs/a.md": "# A\n\n## Second part\n",
  });
  expect(await checkLinks(root, ["README.md", "docs/a.md"])).toEqual([]);
});

test("FND-H1 reports a missing target file with file:line", async () => {
  const root = await fixture({ "README.md": "# T\n\ntext\n[gone](docs/missing.md)\n" });
  const problems = await checkLinks(root, ["README.md"]);
  expect(problems).toHaveLength(1);
  expect(formatProblem(first(problems))).toContain("README.md:4");
  expect(formatProblem(first(problems))).toContain("docs/missing.md");
});

test("FND-H1 reports a missing heading anchor in another file and in the same file", async () => {
  const root = await fixture({
    "README.md": "# T\n\n[a](docs/a.md#nope)\n[b](#absent)\n",
    "docs/a.md": "# A\n",
  });
  const problems = await checkLinks(root, ["README.md", "docs/a.md"]);
  expect(problems.map((p) => [p.file, p.line])).toEqual([
    ["README.md", 3],
    ["README.md", 4],
  ]);
  expect(first(problems).message).toContain("#nope");
});

test("FND-H1 ignores external URLs, mailto links and fenced or inline code", async () => {
  const root = await fixture({
    "README.md": [
      "# T",
      "[web](https://example.invalid/x) [mail](mailto:a@example.invalid) <https://example.invalid>",
      "```md",
      "[fenced](missing.md)",
      "```",
      "`[inline](missing.md)`",
      "",
    ].join("\n"),
  });
  expect(await checkLinks(root, ["README.md"])).toEqual([]);
});

test("FND-H1 checks reference-style definitions and images", async () => {
  const root = await fixture({
    "README.md": "# T\n\n[ref][r] ![img](img/none.png)\n\n[r]: docs/none.md\n",
  });
  const problems = await checkLinks(root, ["README.md"]);
  expect(problems.map((p) => p.line)).toEqual([3, 5]);
});

test("FND-H1 rejects links that escape the repository root", async () => {
  const root = await fixture({ "docs/a.md": "# A\n\n[up](../../outside.md)\n" });
  const problems = await checkLinks(root, ["docs/a.md"]);
  expect(problems).toHaveLength(1);
  expect(first(problems).message).toContain("escapes");
});

test("FND-H1 decodes percent-encoding, strips titles and resolves root-absolute links", async () => {
  const root = await fixture({
    "docs/my file.md": "# Mine\n",
    "docs/b.md": '# B\n\n[a](my%20file.md "title") [r](/docs/my%20file.md#mine)\n',
  });
  expect(await checkLinks(root, ["docs/b.md"])).toEqual([]);
});

test("FND-H1 does not check anchors inside non-Markdown targets", async () => {
  const root = await fixture({
    "src.ts": "export {};\n",
    "README.md": "# T\n\n[line](src.ts#L10)\n",
  });
  expect(await checkLinks(root, ["README.md"])).toEqual([]);
});

test("GitHub slugs: lowercase, punctuation stripped, spaces to hyphens, duplicates suffixed", () => {
  expect(
    githubSlugs(
      "# Hello, World!\n## `code` and *Emphasis*\n## Hello, World!\n## [Link](x.md) text\n",
    ),
  ).toEqual(["hello-world", "code-and-emphasis", "hello-world-1", "link-text"]);
});

test("GitHub slugs ignore headings inside code fences", () => {
  expect(githubSlugs("# A\n```\n# not a heading\n```\n")).toEqual(["a"]);
});

test("FND-H1 heading anchors with duplicates resolve to -1 suffix", async () => {
  const root = await fixture({
    "a.md": "# Same\n\n# Same\n\n[two](#same-1) [one](#same)\n",
  });
  expect(await checkLinks(root, ["a.md"])).toEqual([]);
});

test("FND-H1 resolves targets containing balanced parentheses", async () => {
  const root = await fixture({
    "a (1).md": "# A\n",
    "README.md": "# T\n\n[ok](a%20(1).md) [bad](gone(1).md)\n",
  });
  const problems = await checkLinks(root, ["README.md"]);
  expect(problems.map((p) => p.message)).toEqual(["missing link target: gone(1).md"]);
});

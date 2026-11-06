import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { baseBranchMain, checkBaseBranches, runBaseBranchCheck } from "./base-branch.ts";

const roots: string[] = [];

const CONTRIBUTING = (branch: string) =>
  `Open pull requests against \`${branch}\` using the template.\n`;
const WORKFLOW = (branch: string) =>
  `Owner currently requires ticket PRs target \`${branch}\`. Merge later.\n`;
const PLANE = (branch: string) => `Ticket merges target \`${branch}\`; owner-authorized.\n`;

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "metro-base-branch-"));
  roots.push(root);
  for (const [name, body] of Object.entries(files)) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), body);
  }
  return root;
}

function docs(contributing: string, workflow: string, plane: string): Record<string, string> {
  return {
    "CONTRIBUTING.md": CONTRIBUTING(contributing),
    "docs/agents/workflow.md": WORKFLOW(workflow),
    "docs/agents/plane.md": PLANE(plane),
  };
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

test("METRO-34 passes when CONTRIBUTING, workflow and plane name the same base branch", async () => {
  const root = await fixture(
    docs("feature/metro-rebuild", "feature/metro-rebuild", "feature/metro-rebuild"),
  );
  expect(await checkBaseBranches(root)).toEqual([]);
});

test("METRO-34 fails and names every file when the documents name different base branches", async () => {
  const root = await fixture(docs("main", "feature/metro-rebuild", "feature/metro-rebuild"));
  const problems = await checkBaseBranches(root);
  expect(problems.length).toBe(1);
  const text = problems.join("\n");
  expect(text).toContain("CONTRIBUTING.md");
  expect(text).toContain("main");
  expect(text).toContain("docs/agents/workflow.md");
  expect(text).toContain("docs/agents/plane.md");
  expect(text).toContain("feature/metro-rebuild");
});

test("METRO-34 passes when all three move together to main", async () => {
  const root = await fixture(docs("main", "main", "main"));
  expect(await checkBaseBranches(root)).toEqual([]);
});

test("METRO-34 fails visibly when a document no longer states its base branch", async () => {
  const root = await fixture({
    ...docs("main", "main", "main"),
    "docs/agents/plane.md": "Nothing about branches here.\n",
  });
  const text = (await checkBaseBranches(root)).join("\n");
  expect(text).toContain("docs/agents/plane.md");
  expect(text).toContain("does not state");
});

test("METRO-34 fails when a document is missing", async () => {
  const root = await fixture({ "CONTRIBUTING.md": CONTRIBUTING("main") });
  const text = (await checkBaseBranches(root)).join("\n");
  expect(text).toContain("docs/agents/workflow.md");
});

test("METRO-34 fails when a document states two different base branches", async () => {
  const root = await fixture({
    ...docs("main", "main", "main"),
    "CONTRIBUTING.md": `${CONTRIBUTING("main")}${CONTRIBUTING("master")}`,
  });
  const text = (await checkBaseBranches(root)).join("\n");
  expect(text).toContain("CONTRIBUTING.md");
  expect(text).toContain("more than one");
});

test("METRO-34 the real repository documents agree today", async () => {
  expect(await checkBaseBranches(join(import.meta.dir, ".."))).toEqual([]);
});

test("METRO-34 the command sets a failing exit code and prints the problem when documents differ", async () => {
  const root = await fixture(docs("main", "feature/metro-rebuild", "main"));
  const errors: string[] = [];
  const originalError = console.error;
  const previous = process.exitCode;
  console.error = (message: string) => void errors.push(message);
  try {
    await runBaseBranchCheck(root);
    expect(process.exitCode).toBe(1);
  } finally {
    console.error = originalError;
    process.exitCode = previous ?? 0;
  }
  expect(errors.join("\n")).toContain("base branches differ");
});

test("METRO-34 the command keeps a zero exit code and reports success when documents agree", async () => {
  const root = await fixture(docs("main", "main", "main"));
  const lines: string[] = [];
  const originalLog = console.log;
  const previous = process.exitCode;
  process.exitCode = 0;
  console.log = (message: string) => void lines.push(message);
  try {
    await runBaseBranchCheck(root);
    expect(process.exitCode).toBe(0);
  } finally {
    console.log = originalLog;
    process.exitCode = previous ?? 0;
  }
  expect(lines.join("\n")).toContain("Base branch ok");
});

test("METRO-92 the process entry checks the repository given as its first argument", async () => {
  const root = await fixture(docs("main", "main", "feature/metro-rebuild"));
  const errors: string[] = [];
  const originalError = console.error;
  const previous = process.exitCode;
  console.error = (message: string) => void errors.push(message);
  try {
    await baseBranchMain([root]);
    expect(process.exitCode).toBe(1);
  } finally {
    console.error = originalError;
    process.exitCode = previous ?? 0;
  }
  expect(errors.join("\n")).toContain("base branches differ");
});

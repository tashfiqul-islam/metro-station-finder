import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { cleanGitEnv } from "./git-env";
import {
  evaluateReviewer,
  gitChangedPaths,
  isDocsOnly,
  readReviewerValue,
  reviewerRecordMain,
} from "./reviewer-record";

const valid =
  "independent-reviewer subagent (.claude/agents/independent-reviewer.md), session: r-123 on 2026-11-04, disposition https://github.com/o/r/pull/35#issuecomment-1";
const body = (reviewer: string): string =>
  `## Ticket\n\n- Ticket ID: METRO-1\n\n## Reviewer\n\n${reviewer}\n\n## Checks run\n\nbun run check: pass\n`;
const code = ["scripts/x.ts"];

test("METRO-36 a recorded reviewer passes for a code change", () =>
  expect(evaluateReviewer(body(valid), code).ok).toBe(true));
test("METRO-36 the section can be the last one in the body", () =>
  expect(evaluateReviewer(`## Reviewer\n${valid}`, code).ok).toBe(true));
test("METRO-36 the heading level and case do not matter", () =>
  expect(evaluateReviewer(`### reviewer\n${valid}`, code).ok).toBe(true));

for (const [name, value] of [
  ["a null body", null],
  ["an undefined body", undefined],
  ["an empty body", ""],
  ["a whitespace-only body", "  \n\t\n "],
  ["a body without the section", "## Ticket\n\nMETRO-1\n"],
] as const) {
  test(`METRO-36 rejects ${name}`, () => {
    const result = evaluateReviewer(value, code);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Reviewer");
  });
}

test("METRO-36 rejects the untouched template placeholder", () =>
  expect(
    evaluateReviewer(
      body("<!-- Reviewer identity or agent definition, session or run, disposition link. -->"),
      code,
    ).ok,
  ).toBe(false));
test("METRO-36 rejects whitespace-only section content", () =>
  expect(evaluateReviewer(body("   \n \t "), code).ok).toBe(false));
for (const placeholder of ["TBD", "todo", "n/a", "N/A", "none", "-", "...", "pending", "?"]) {
  test(`METRO-36 rejects the placeholder ${placeholder}`, () =>
    expect(evaluateReviewer(body(placeholder), code).ok).toBe(false));
}
test("METRO-36 rejects a value that is only a link", () => {
  expect(evaluateReviewer(body("https://example.com/review/1"), code).ok).toBe(false);
  expect(evaluateReviewer(body("<https://example.com/review/1>"), code).ok).toBe(false);
  expect(evaluateReviewer(body("[x](https://example.com/review/1)"), code).ok).toBe(false);
});
test("METRO-36 accepts a link accompanied by identity text", () =>
  expect(
    evaluateReviewer(
      body("independent-reviewer subagent, run 42, disposition https://example.com/p/1#c2"),
      code,
    ).ok,
  ).toBe(true));

test("METRO-36 text hidden in a comment does not count", () => {
  expect(evaluateReviewer(body(`<!-- ${valid} -->`), code).ok).toBe(false);
  expect(evaluateReviewer(body(`<!--${valid}-->\n<!-- more -->`), code).ok).toBe(false);
});
test("METRO-36 an unterminated comment hides the rest of the body", () =>
  expect(evaluateReviewer(`## Reviewer\n<!-- ${valid}`, code).ok).toBe(false));
test("METRO-36 a comment cannot forge the heading", () =>
  expect(evaluateReviewer(`<!--\n## Reviewer\n${valid}\n-->\n## Ticket\nx`, code).ok).toBe(false));
test("METRO-36 visible text beside a comment still counts", () =>
  expect(evaluateReviewer(body(`<!-- keep -->${valid}<!-- tail -->`), code).ok).toBe(true));
test("METRO-36 a comment cannot split a word into a fake value", () =>
  expect(evaluateReviewer(body("<!-- a -->TBD<!-- b -->"), code).ok).toBe(false));

test("METRO-36 the docs-only marker passes when only documentation changed", () => {
  for (const marker of ["none (docs only)", "None (Docs Only)", "none (docs only): wording fix"])
    expect(evaluateReviewer(body(marker), ["docs/agents/workflow.md", "README.md"]).ok).toBe(true);
});
test("METRO-36 the docs-only marker is rejected when code changed", () => {
  const result = evaluateReviewer(body("none (docs only)"), ["docs/a.md", "scripts/x.ts"]);
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("docs");
});
test("METRO-36 the docs-only marker is rejected with no changed paths", () =>
  expect(evaluateReviewer(body("none (docs only)"), []).ok).toBe(false));
test("METRO-36 a docs-only change may still record a real reviewer", () =>
  expect(evaluateReviewer(body(valid), ["docs/a.md"]).ok).toBe(true));
test("METRO-36 a docs-only change still needs a value", () =>
  expect(evaluateReviewer(body(""), ["docs/a.md"]).ok).toBe(false));

test("METRO-36 only markdown under docs/ and at the root counts as documentation", () => {
  expect(isDocsOnly(["docs/a.md", "docs/x/y/b.md", "README.md", "AGENTS.md"])).toBe(true);
  for (const path of [
    ".claude/agents/independent-reviewer.md",
    ".github/pull_request_template.md",
    "docs/agents/skills.lock.json",
    "packages/a/README.md",
    "scripts/x.ts",
    "docs/../scripts/x.md",
    "docs\\a.md",
  ])
    expect(isDocsOnly([path])).toBe(false);
  expect(isDocsOnly([])).toBe(false);
});

test("METRO-36 an extremely long body is handled quickly and still decided correctly", () => {
  const filler = "x ".repeat(500_000);
  const started = performance.now();
  expect(evaluateReviewer(`${filler}\n${body(valid)}`, code).ok).toBe(true);
  expect(evaluateReviewer(`${filler}\n## Reviewer\n<!-- ${filler}`, code).ok).toBe(false);
  expect(evaluateReviewer(`## Reviewer\n${filler}\n${valid}`, code).ok).toBe(true);
  expect(evaluateReviewer(`## Reviewer\n${filler}`, code).ok).toBe(false);
  expect(evaluateReviewer(`${"```\n".repeat(50_001)}## Reviewer\n${valid}`, code).ok).toBe(false);
  expect(evaluateReviewer("<!--".repeat(100_000), code).ok).toBe(false);
  expect(performance.now() - started).toBeLessThan(2000);
});
test("METRO-36 a duplicate heading falls back to the first non-empty section", () => {
  expect(readReviewerValue(`## Reviewer\nfirst value here\n## Reviewer\nsecond`)).toBe(
    "first value here",
  );
  expect(readReviewerValue(`## Reviewer\n\n## Ticket\nx\n## Reviewer\nsecond value`)).toBe(
    "second value",
  );
  expect(evaluateReviewer(`## Reviewer\n\n## Reviewer\n${valid}`, code).ok).toBe(true);
});

const identity = "independent-reviewer subagent";
for (const [name, value] of [
  ["a repeated character", "aaaaaaaaaaaa"],
  ["a short sentence", "Reviewer: me"],
  ["a pending statement", "Independent review pending (to be recorded)"],
  ["tbd with a link", `${identity} TBD https://example.com/x`],
  ["todo with a link", `${identity} todo https://example.com/x`],
  ["to be added", `${identity} session: later, to be added #12`],
  ["to be done", `${identity}, to be done, #12`],
  ["to be filled", `${identity}, to be filled in, #12`],
  ["n/a", `${identity} n/a https://example.com/x`],
  ["none yet", `${identity} none yet #12`],
  ["not yet", `${identity} not yet run #12`],
  ["will be", `${identity} will be run, session: 1`],
  ["placeholder", `${identity} placeholder https://example.com/x`],
  ["fill in", `${identity} fill in later #12`],
  ["upper-case pending", `${identity} PENDING #12`],
  ["identity text without any reference", `${identity} reviewed the change carefully`],
] as const) {
  test(`METRO-36 rejects ${name}`, () =>
    expect(evaluateReviewer(body(value), code).ok).toBe(false));
}
for (const [name, value] of [
  ["a url", `${identity}, output at https://example.com/review/1`],
  ["a PR or comment number", `${identity}, findings and disposition in #35`],
  ["a session token", `${identity}, session: 2026-11-04-a`],
  ["a run token", `${identity}; Run: 42`],
] as const) {
  test(`METRO-36 accepts ${name} as the reference`, () =>
    expect(evaluateReviewer(body(value), code).ok).toBe(true));
}
test("METRO-36 'pending' inside another word is not a placeholder", () =>
  expect(evaluateReviewer(body(`${identity}, dependency graph checked, #35`), code).ok).toBe(true));

const crlf = (text: string): string => text.replaceAll("\n", "\r\n");
test("METRO-36 a body edited in the web UI uses CRLF and is still read", () => {
  expect(evaluateReviewer(crlf(body(valid)), code).ok).toBe(true);
  expect(evaluateReviewer(crlf(`## Reviewer\n${valid}`), code).ok).toBe(true);
  expect(evaluateReviewer(crlf(body("none (docs only)")), ["docs/a.md"]).ok).toBe(true);
  expect(evaluateReviewer(crlf(body("none (docs only)")), ["scripts/x.ts"]).ok).toBe(false);
  expect(evaluateReviewer(crlf(body("<!-- hidden -->\n")), code).ok).toBe(false);
  expect(readReviewerValue(crlf(body(valid)))).toBe(valid);
});

test("METRO-36 a deeper sub-heading stays inside the Reviewer section", () => {
  const text = `## Reviewer\n\n### Details\n${valid}\n\n#### More\nextra\n\n## Checks run\nnone`;
  expect(evaluateReviewer(text, code).ok).toBe(true);
  expect(readReviewerValue(text)).toContain("extra");
  expect(readReviewerValue(text)).not.toContain("none");
});
test("METRO-36 a heading of the same or a higher level ends the section", () => {
  expect(readReviewerValue(`### Reviewer\nabc\n### Next\ndef`)).toBe("abc");
  expect(readReviewerValue(`### Reviewer\nabc\n## Next\ndef`)).toBe("abc");
  expect(readReviewerValue(`## Reviewer\nabc\n# Next\ndef`)).toBe("abc");
});
test("METRO-36 headings inside fenced code blocks are ignored", () => {
  const fenced = `## Reviewer\n\`\`\`\n## Ticket\n${valid}\n\`\`\`\n## Checks run\nx`;
  expect(evaluateReviewer(fenced, code).ok).toBe(true);
  expect(evaluateReviewer("```\n## Reviewer\n" + valid + "\n```", code).ok).toBe(false);
  expect(evaluateReviewer(`~~~\n## Reviewer\n${valid}\n~~~`, code).ok).toBe(false);
  const longer = "````\n```\n## Reviewer\n" + valid + "\n````";
  expect(evaluateReviewer(longer, code).ok).toBe(false);
  const unclosed = `## Reviewer\n\`\`\`\n${valid}`;
  expect(evaluateReviewer(unclosed, code).ok).toBe(true);
});
test("METRO-36 Setext headings are not supported and count as no section", () => {
  expect(evaluateReviewer(`Reviewer\n--------\n${valid}`, code).ok).toBe(false);
  expect(evaluateReviewer(`Reviewer\n========\n${valid}`, code).ok).toBe(false);
});

const sha = "a".repeat(40);
/** Read through a function so TypeScript does not narrow it to the value just assigned. */
function currentExit(): number | string | null | undefined {
  return process.exitCode;
}
function run(env: Record<string, string | undefined>, files: string[] | Error = code) {
  const errors: string[] = [];
  const logs: string[] = [];
  const calls: string[][] = [];
  const previous = process.exitCode;
  process.exitCode = 0;
  reviewerRecordMain(env, {
    changedPaths: (base, head) => {
      calls.push([base, head]);
      if (files instanceof Error) throw files;
      return files;
    },
    log: (m) => logs.push(m),
    error: (m) => errors.push(m),
  });
  const exitCode = currentExit();
  process.exitCode = previous;
  return { errors, logs, exitCode, calls };
}
test("METRO-36 the entry point passes a valid body and reports success", () => {
  const result = run({ PR_BODY: body(valid), BASE_SHA: sha, HEAD_SHA: sha });
  expect(result.exitCode ?? 0).toBe(0);
  expect(result.logs.join("\n")).toContain("carries a reference");
  expect(result.calls).toEqual([[sha, sha]]);
});
test("METRO-36 the entry point fails with the reason for an unset body", () => {
  const result = run({ BASE_SHA: sha, HEAD_SHA: sha });
  expect(result.exitCode).toBe(1);
  expect(result.errors.join("\n")).toContain("Reviewer");
});
test("METRO-36 the entry point rejects malformed commit ids before using them", () => {
  const result = run({ PR_BODY: body(valid), BASE_SHA: "--output=x", HEAD_SHA: sha });
  expect(result.exitCode).toBe(1);
  expect(result.calls).toEqual([]);
  expect(run({ PR_BODY: body(valid), HEAD_SHA: sha }).exitCode).toBe(1);
});
test("METRO-36 the entry point fails visibly when the changed paths cannot be read", () => {
  const result = run({ PR_BODY: body(valid), BASE_SHA: sha, HEAD_SHA: sha }, new Error("no git"));
  expect(result.exitCode).toBe(1);
  expect(result.errors.join("\n")).toContain("no git");
});

test("METRO-36 git changed paths come from the merge base and fail visibly on a bad range", () => {
  expect(gitChangedPaths("HEAD", "HEAD")).toEqual([]);
  expect(() => gitChangedPaths(sha, sha)).toThrow("git diff failed");
});

test("METRO-36 a rename from code to docs lists both paths, so the deletion counts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "metro-rename-"));
  try {
    const git = (...args: string[]): string => {
      const result = Bun.spawnSync(["git", "-C", dir, ...args], { env: cleanGitEnv() });
      if (result.exitCode !== 0) throw new Error(result.stderr.toString());
      return result.stdout.toString().trim();
    };
    git("init", "-q");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    git("config", "commit.gpgsign", "false");
    await mkdir(join(dir, "scripts"));
    await writeFile(join(dir, "scripts", "x.ts"), "export const answer = 42;\n".repeat(20));
    git("add", "scripts/x.ts");
    git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD");
    await mkdir(join(dir, "docs"));
    git("mv", "scripts/x.ts", "docs/x.md");
    git("commit", "-q", "-m", "rename");
    const head = git("rev-parse", "HEAD");
    const paths = gitChangedPaths(base, head, dir);
    expect(new Set(paths)).toEqual(new Set(["docs/x.md", "scripts/x.ts"]));
    expect(isDocsOnly(paths)).toBe(false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("METRO-36 the default dependencies use real git and the console", () => {
  const head = Bun.spawnSync(["git", "rev-parse", "HEAD"]).stdout.toString().trim();
  const out: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  const previous = process.exitCode;
  console.log = (m: string) => void out.push(`log:${m}`);
  console.error = (m: string) => void out.push(`error:${m}`);
  process.exitCode = 0;
  try {
    reviewerRecordMain({ PR_BODY: body(valid), BASE_SHA: head, HEAD_SHA: head });
    expect(out).toEqual([
      `log:Reviewer section present, not a placeholder, and carries a reference.`,
    ]);
    reviewerRecordMain({ PR_BODY: "", BASE_SHA: head, HEAD_SHA: head });
    expect(currentExit()).toBe(1);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.exitCode = previous;
  }
  expect(out.map((line) => line.split(":")[0])).toEqual(["log", "error"]);
});

const script = new URL("./reviewer-record.ts", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/u,
  "$1",
);
test("METRO-36 the real CLI treats shell syntax in the body as data and still rejects it", () => {
  const evil = '## Reviewer\n$(touch pwned) `id` "; exit 0 #';
  const result = Bun.spawnSync(["node", script], {
    env: { ...process.env, PR_BODY: evil, BASE_SHA: sha, HEAD_SHA: sha },
  });
  expect(result.exitCode).toBe(1);
});

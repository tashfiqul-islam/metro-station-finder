import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { validateMessage, validateRange, validateSubject } from "./commit-message";
import { cleanGitEnv } from "./git-env";

const accepted = [
  "feat(core): add x",
  "fix: handle empty list",
  "feat!: drop legacy route",
  "refactor(web)!: rename prop",
  "docs: correct guide",
  "test: add case",
  "chore: bump",
  "perf: faster scan",
  "ci: cache bun",
  "style: format",
  "build: pin tool",
  "revert: undo change",
  "Merge pull request #17 from owner/ticket/branch",
  "Merge branch 'a' into b",
  'Revert "feat: add x"',
];
const rejected = [
  "update stuff",
  "Feat: capitalised type",
  "feat add x",
  "feat:no space",
  "feat(): empty scope",
  "unknown(core): add x",
  "feat: ",
  "",
  "WIP",
];

for (const subject of accepted) {
  test(`FND-S5 accepts "${subject}"`, () => {
    expect(validateSubject(subject)).toBeNull();
  });
}
for (const subject of rejected) {
  test(`FND-S5 rejects "${subject}"`, () => {
    expect(validateSubject(subject)).not.toBeNull();
  });
}

test("FND-S5 message validation uses the first non-comment line and allows a body", () => {
  expect(
    validateMessage("# comment\nfeat(core): add x\n\nBody text.\n\nCo-Authored-By: A <a@b.c>\n"),
  ).toBeNull();
  expect(validateMessage("update stuff\n\nfeat: body line does not count\n")).not.toBeNull();
  expect(validateMessage("# only comments\n")).not.toBeNull();
});

const env = () => ({ ...cleanGitEnv(), HK_MISE: "0" });

async function repo() {
  const root = await mkdtemp(join(tmpdir(), "metro-commitmsg-"));
  const run = (args: string[]) => Bun.spawnSync(args, { cwd: root, env: env() });
  const ok = (args: string[]) => {
    const result = run(args);
    if (result.exitCode !== 0)
      throw new Error(`${args.join(" ")}: ${result.stdout.toString()}${result.stderr.toString()}`);
    return result.stdout.toString();
  };
  ok(["git", "init", "-b", "main"]);
  ok(["git", "config", "user.email", "fixture@example.invalid"]);
  ok(["git", "config", "user.name", "Commit fixture"]);
  ok(["git", "config", "core.autocrlf", "false"]);
  // Only this disposable repository disables signing; real commits remain signed.
  ok(["git", "config", "commit.gpgsign", "false"]);
  await mkdir(join(root, "scripts"));
  for (const file of ["commit-message.ts", "git-env.ts"])
    await copyFile(resolve("scripts", file), join(root, "scripts", file));
  return { root, run, ok };
}

test("METRO-92 validateRange names the 64 MiB read limit and rethrows other git failures", async () => {
  const { root, ok } = await repo();
  try {
    const emptyTree = ok(["git", "write-tree"]).trim();
    const huge = Bun.spawnSync(["git", "commit-tree", emptyTree, "-F", "-"], {
      cwd: root,
      env: env(),
      stdin: Buffer.from(`feat: huge\n\n${"a".repeat(65 * 1024 * 1024)}\n`),
    });
    expect(huge.exitCode).toBe(0);
    const sha = huge.stdout.toString().trim();
    expect(() => validateRange(sha, root)).toThrow(/exceed the 64 MiB read limit/u);
    expect(() => validateRange("no-such-ref..HEAD", root)).toThrow(/no-such-ref/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

test("FND-S5 range mode exits nonzero when any commit in the range is invalid", async () => {
  const { root, run, ok } = await repo();
  try {
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: base"]);
    const base = ok(["git", "rev-parse", "HEAD"]).trim();
    await writeFile(join(root, "a.txt"), "2\n");
    ok(["git", "commit", "-am", "fix(core): good one"]);
    expect(run(["node", "scripts/commit-message.ts", "--range", `${base}..HEAD`]).exitCode).toBe(0);
    await writeFile(join(root, "a.txt"), "3\n");
    ok(["git", "commit", "-am", "update stuff"]);
    const result = run(["node", "scripts/commit-message.ts", "--range", `${base}..HEAD`]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("update stuff");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

test("FND-S5 range mode rejects an unresolvable range visibly", async () => {
  const { root, run, ok } = await repo();
  try {
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: base"]);
    expect(run(["node", "scripts/commit-message.ts", "--range", "nope..HEAD"]).exitCode).not.toBe(
      0,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

test("FND-S5 installed commit-msg hook rejects a bad subject and keeps the index", async () => {
  const { root, run, ok } = await repo();
  try {
    await copyFile(resolve("hk.pkl"), join(root, "hk.pkl"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ scripts: { "check:fast": "node -e 0" } }),
    );
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: baseline before hooks"]);
    ok(["hk", "install"]);
    await writeFile(join(root, "a.txt"), "2\n");
    ok(["git", "add", "a.txt"]);
    const before = ok(["git", "diff", "--cached", "--name-status"]);
    expect(run(["git", "commit", "-m", "update stuff"]).exitCode).not.toBe(0);
    expect(ok(["git", "diff", "--cached", "--name-status"])).toBe(before);
    expect(ok(["git", "log", "--format=%s"]).trim()).toBe("feat: baseline before hooks");
    ok(["git", "commit", "-m", "feat(core): add x"]);
    expect(ok(["git", "log", "-1", "--format=%s"]).trim()).toBe("feat(core): add x");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120000);

test("FND-S5 installed commit-msg hook accepts a Git merge subject", async () => {
  const { root, run, ok } = await repo();
  try {
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: baseline"]);
    ok(["git", "switch", "-c", "side"]);
    await writeFile(join(root, "b.txt"), "b\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: side"]);
    ok(["git", "switch", "main"]);
    await writeFile(join(root, "c.txt"), "c\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: main"]);
    await copyFile(resolve("hk.pkl"), join(root, "hk.pkl"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ scripts: { "check:fast": "node -e 0" } }),
    );
    ok(["hk", "install"]);
    const merged = run(["git", "merge", "--no-ff", "side"]);
    expect(merged.exitCode).toBe(0);
    expect(ok(["git", "log", "-1", "--format=%s"])).toContain("Merge branch 'side'");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120000);

test("FND-S5 range mode accepts an empty range (nothing to validate)", async () => {
  const { root, run, ok } = await repo();
  try {
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: base"]);
    expect(run(["node", "scripts/commit-message.ts", "--range", "HEAD..HEAD"]).exitCode).toBe(0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

const agentTrailer = "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>";

test("METRO-52 accepts the agent Co-Authored-By trailer and human-only messages", () => {
  expect(validateMessage(`feat: add x\n\nBody.\n\n${agentTrailer}\n`)).toBeNull();
  expect(validateMessage("feat: add x\n")).toBeNull();
  expect(
    validateMessage("feat: add x\n\nSigned-off-by: Alice Human <alice@example.com>\n"),
  ).toBeNull();
  expect(
    validateMessage("feat: add x\n\nCo-authored-by: Bob Human <bob@example.com>\n"),
  ).toBeNull();
});

const signedBy = (value: string) => `feat: add x\n\nSigned-off-by: ${value}\n`;

test("METRO-52 rejects a Signed-off-by with an agent email, whatever the name", () => {
  for (const value of [
    "Claude Sonnet 5.5 <noreply@anthropic.com>",
    "Alice <noreply@anthropic.com>",
    "Alice <NoReply@Anthropic.com>",
    "claude[bot] <209825114+claude[bot]@users.noreply.github.com>",
    "Copilot <198982749+Copilot@users.noreply.github.com>",
    "copilot-swe-agent[bot] <198982749+copilot-swe-agent[bot]@users.noreply.github.com>",
  ]) {
    expect(validateMessage(signedBy(value)), value).toContain(
      "docs/agents/workflow.md#attribution",
    );
  }
});

test("METRO-52 accepts a Signed-off-by from a person or an ordinary bot", () => {
  for (const value of [
    "Claude Monet <claude@example.org>",
    "Gemini Patel <gemini.patel@example.com>",
    "Cursor Smith <a@gemini.example.com>",
    "Aider Jones <aider@example.com>",
    "Alice <alice@notanthropic.com>",
    "Alice <noreply@anthropic.com.evil.example>",
    "Alice <12345+claude@users.noreply.github.com>",
    "renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>",
    "dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
    "No email at all",
  ])
    expect(validateMessage(signedBy(value)), value).toBeNull();
});

test("METRO-52 a human Signed-off-by beside an agent Co-Authored-By is allowed", () => {
  expect(
    validateMessage(
      `feat: add x\n\nBody.\n\n${agentTrailer}\nSigned-off-by: Alice Human <alice@example.com>\n`,
    ),
  ).toBeNull();
});

test("METRO-52 finds an agent Signed-off-by in loose, folded and CRLF final paragraphs", () => {
  const agent = "Signed-off-by: Claude <noreply@anthropic.com>";
  const cases = {
    "prose line in the same paragraph": `feat: add x\n\nReviewed locally\n${agent}\n`,
    "no space after the colon": "feat: add x\n\nSigned-off-by:Claude <noreply@anthropic.com>\n",
    "mixed-case key": "feat: add x\n\nsIgNeD-oFf-By: Claude <noreply@anthropic.com>\n",
    "space before the colon": "feat: add x\n\nSigned-off-by : Claude <noreply@anthropic.com>\n",
    "CRLF message":
      "feat: add x\r\n\r\nBody.\r\n\r\nSigned-off-by: Claude <noreply@anthropic.com>\r\n",
    "folded line": "feat: add x\n\nSigned-off-by: Claude\n <noreply@anthropic.com>\n",
    "after a comment line": `feat: add x\n\n# note\n${agent}\n`,
  };
  for (const [name, message] of Object.entries(cases))
    expect(validateMessage(message), name).toContain("Signed-off-by");
});

test("METRO-52 ignores trailer-like text outside the final trailer block and comments", () => {
  expect(
    validateMessage(
      "feat: add x\n\nSigned-off-by: Claude <c@example.com> is forbidden.\n\nMore prose.\n",
    ),
  ).toBeNull();
  expect(
    validateMessage("feat: add x\n\nBody.\n\n# Signed-off-by: Claude <c@example.com>\n"),
  ).toBeNull();
  expect(validateMessage("feat: Signed-off-by: Claude <noreply@anthropic.com>")).toBeNull();
  // Only the last paragraph is scanned.
  expect(
    validateMessage(
      "feat: add x\n\nSigned-off-by: Claude <noreply@anthropic.com>\n\nTrailing prose paragraph.\n",
    ),
  ).toBeNull();
});

test("METRO-52 range mode rejects an agent Signed-off-by in a commit body", async () => {
  const { root, run, ok } = await repo();
  try {
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: base"]);
    const base = ok(["git", "rev-parse", "HEAD"]).trim();
    await writeFile(join(root, "a.txt"), "2\n");
    ok(["git", "commit", "-am", "fix: good", "-m", agentTrailer]);
    expect(run(["node", "scripts/commit-message.ts", "--range", `${base}..HEAD`]).exitCode).toBe(0);
    await writeFile(join(root, "a.txt"), "3\n");
    ok([
      "git",
      "commit",
      "-am",
      "fix: bad",
      "-m",
      `${agentTrailer}\nSigned-off-by: Claude <noreply@anthropic.com>`,
    ]);
    const result = run(["node", "scripts/commit-message.ts", "--range", `${base}..HEAD`]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("Signed-off-by");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

test("METRO-52 range mode reads CRLF bodies and a multi-line subject like the hook", async () => {
  const { root, run, ok } = await repo();
  try {
    await writeFile(join(root, "a.txt"), "1\n");
    ok(["git", "add", "."]);
    ok(["git", "commit", "-m", "feat: base"]);
    const base = ok(["git", "rev-parse", "HEAD"]).trim();
    await writeFile(join(root, "a.txt"), "2\n");
    await writeFile(
      join(root, "msg.txt"),
      "fix: crlf\r\n\r\nBody.\r\n\r\nSigned-off-by: Claude <noreply@anthropic.com>\r\n",
    );
    ok(["git", "commit", "-a", "--cleanup=verbatim", "-F", "msg.txt"]);
    const result = run(["node", "scripts/commit-message.ts", "--range", `${base}..HEAD`]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("Signed-off-by");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);

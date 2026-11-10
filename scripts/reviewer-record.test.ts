import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { cleanGitEnv } from "./git-env";
import {
  LookupError,
  type Lookups,
  type PrCommit,
  type RecordKind,
  type RecordText,
} from "./reviewer-lookups";
import {
  evaluateReviewer,
  gitChangedPaths,
  isDocsOnly,
  readReviewerValue,
  reviewerRecordMain,
  type ReviewContext,
} from "./reviewer-record";
import { fastestMs } from "./test-timing";

const hex = (char: string): string => char.repeat(40);
const BASE = hex("0");
const FIRST = hex("1");
const HEAD = hex("2");
const BASE_PARENT = hex("e");

const link = "https://github.com/o/r/pull/35#issuecomment-1";
const valid = `independent-reviewer subagent (.claude/agents/independent-reviewer.md), session: r-123 on 2026-11-04, disposition ${link}`;
const body = (reviewer: string): string =>
  `## Ticket\n\n- Ticket ID: METRO-1\n\n## Reviewer\n\n${reviewer}\n\n## Checks run\n\nbun run check: pass\n`;
const code = ["scripts/x.ts"];

const commit = (sha: string, ...parents: string[]): PrCommit => ({ sha, parents });
/** FIRST on top of the base, HEAD on top of FIRST: the reviewed commit is FIRST or HEAD. */
const linear = [commit(FIRST, BASE), commit(HEAD, FIRST)];
const issueTarget = "https://api.github.com/repos/o/r/issues/35";
const reviewTarget = "https://api.github.com/repos/o/r/pulls/35";

interface Fake {
  readonly records?: Record<string, RecordText | Error>;
  readonly commits?: readonly PrCommit[] | Error;
  readonly ancestors?: readonly string[] | Error;
}
interface Spy {
  readonly lookups: Lookups;
  readonly requested: string[];
}
/** Lookups that answer from memory; `requested` records every call so a test can prove what was (not) read. */
function fakeLookups(fake: Fake = {}): Spy {
  const requested: string[] = [];
  const lookups: Lookups = {
    record: (kind: RecordKind, id: string) => {
      requested.push(`record ${kind} ${id}`);
      const found = fake.records?.[`${kind}-${id}`] ?? {
        body: `Disposition.\nReviewed-head: ${HEAD}\n`,
        target: issueTarget,
      };
      return found instanceof Error ? Promise.reject(found) : Promise.resolve(found);
    },
    commits: () => {
      requested.push("commits");
      const found = fake.commits ?? linear;
      return found instanceof Error ? Promise.reject(found) : Promise.resolve(found);
    },
    isBaseAncestor: (sha) => {
      requested.push(`ancestor ${sha}`);
      const found = fake.ancestors ?? [];
      if (found instanceof Error) return Promise.reject(found);
      return Promise.resolve(found.includes(sha));
    },
  };
  return { lookups, requested };
}
const context = (fake: Fake = {}, head = HEAD): ReviewContext => ({
  owner: "o",
  repo: "r",
  number: 35,
  head,
  lookups: fakeLookups(fake).lookups,
});
const ev = (text: string | null | undefined, paths: readonly string[], fake: Fake = {}) =>
  evaluateReviewer(text, paths, context(fake));
const ok = async (text: string, paths: readonly string[] = code, fake: Fake = {}) =>
  (await ev(text, paths, fake)).ok;
const recordWith = (text: string, target = issueTarget): Fake => ({
  records: { "issuecomment-1": { body: text, target } },
});

test("METRO-134 a recorded reviewer passes for a code change", async () =>
  expect(await ok(body(valid))).toBe(true));
test("METRO-36 the section can be the last one in the body", async () =>
  expect(await ok(`## Reviewer\n${valid}`)).toBe(true));
test("METRO-36 the heading level and case do not matter", async () =>
  expect(await ok(`### reviewer\n${valid}`)).toBe(true));

for (const [name, value] of [
  ["a null body", null],
  ["an undefined body", undefined],
  ["an empty body", ""],
  ["a whitespace-only body", "  \n\t\n "],
  ["a body without the section", "## Ticket\n\nMETRO-1\n"],
] as const) {
  test(`METRO-36 rejects ${name}`, async () => {
    const result = await ev(value, code);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Reviewer");
  });
}

test("METRO-36 rejects the untouched template placeholder", async () =>
  expect(
    await ok(
      body("<!-- Reviewer identity or agent definition, session or run, disposition link. -->"),
    ),
  ).toBe(false));
test("METRO-36 rejects whitespace-only section content", async () =>
  expect(await ok(body("   \n \t "))).toBe(false));
for (const placeholder of ["TBD", "todo", "n/a", "N/A", "none", "-", "...", "pending", "?"]) {
  test(`METRO-36 rejects the placeholder ${placeholder}`, async () =>
    expect(await ok(body(placeholder))).toBe(false));
}
test("METRO-36 rejects a value that is only a link", async () => {
  expect(await ok(body(link))).toBe(false);
  expect(await ok(body(`<${link}>`))).toBe(false);
  expect(await ok(body(`[x](${link})`))).toBe(false);
});
test("METRO-36 accepts a link accompanied by identity text", async () =>
  expect(await ok(body(`independent-reviewer subagent, run 42, disposition ${link}`))).toBe(true));

test("METRO-36 text hidden in a comment does not count", async () => {
  expect(await ok(body(`<!-- ${valid} -->`))).toBe(false);
  expect(await ok(body(`<!--${valid}-->\n<!-- more -->`))).toBe(false);
});
test("METRO-36 an unterminated comment hides the rest of the body", async () =>
  expect(await ok(`## Reviewer\n<!-- ${valid}`)).toBe(false));
test("METRO-36 a comment cannot forge the heading", async () =>
  expect(await ok(`<!--\n## Reviewer\n${valid}\n-->\n## Ticket\nx`)).toBe(false));
test("METRO-36 visible text beside a comment still counts", async () =>
  expect(await ok(body(`<!-- keep -->${valid}<!-- tail -->`))).toBe(true));
test("METRO-36 a comment cannot split a word into a fake value", async () =>
  expect(await ok(body("<!-- a -->TBD<!-- b -->"))).toBe(false));

test("METRO-36 the docs-only marker passes when only documentation changed", async () => {
  for (const marker of ["none (docs only)", "None (Docs Only)", "none (docs only): wording fix"])
    expect(await ok(body(marker), ["docs/agents/workflow.md", "README.md"])).toBe(true);
});
test("METRO-36 the docs-only marker needs no GitHub lookup", async () => {
  const spy = fakeLookups();
  const result = await evaluateReviewer(body("none (docs only)"), ["docs/a.md"], {
    ...context(),
    lookups: spy.lookups,
  });
  expect(result.ok).toBe(true);
  expect(spy.requested).toEqual([]);
});
test("METRO-36 the docs-only marker is rejected when code changed", async () => {
  const result = await ev(body("none (docs only)"), ["docs/a.md", "scripts/x.ts"]);
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("docs");
});
test("METRO-36 the docs-only marker is rejected with no changed paths", async () =>
  expect(await ok(body("none (docs only)"), [])).toBe(false));
test("METRO-36 a docs-only change may still record a real reviewer", async () =>
  expect(await ok(body(valid), ["docs/a.md"])).toBe(true));
test("METRO-36 a docs-only change still needs a value", async () =>
  expect(await ok(body(""), ["docs/a.md"])).toBe(false));

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

test("METRO-36 an extremely long body is handled quickly and still decided correctly", async () => {
  const filler = "x ".repeat(500_000);
  const decide = (): Promise<boolean>[] => [
    ok(`${filler}\n${body(valid)}`),
    ok(`${filler}\n## Reviewer\n<!-- ${filler}`),
    ok(`## Reviewer\n${filler}\n${valid}`),
    ok(`## Reviewer\n${filler}`),
    ok(`${"```\n".repeat(50_001)}## Reviewer\n${valid}`),
    ok("<!--".repeat(100_000)),
    ok(
      `## Reviewer\n${identity} ${`${link} `.repeat(50_000)}${"https://github.com/o/r/pull/9#issuecomment-1 ".repeat(50_000)}`,
    ),
  ];
  expect(await Promise.all(decide())).toEqual([true, false, true, false, false, false, true]);
  expect(fastestMs(decide)).toBeLessThan(2000);
});
test("METRO-36 a duplicate heading falls back to the first non-empty section", async () => {
  expect(readReviewerValue(`## Reviewer\nfirst value here\n## Reviewer\nsecond`)).toBe(
    "first value here",
  );
  expect(readReviewerValue(`## Reviewer\n\n## Ticket\nx\n## Reviewer\nsecond value`)).toBe(
    "second value",
  );
  expect(await ok(`## Reviewer\n\n## Reviewer\n${valid}`)).toBe(true);
});

const identity = "independent-reviewer subagent";
for (const [name, value] of [
  ["a repeated character", "aaaaaaaaaaaa"],
  ["a short sentence", "Reviewer: me"],
  ["a pending statement", "Independent review pending (to be recorded)"],
  ["tbd with a link", `${identity} TBD ${link}`],
  ["todo with a link", `${identity} todo ${link}`],
  ["to be added", `${identity} session: later, to be added ${link}`],
  ["to be done", `${identity}, to be done, ${link}`],
  ["to be filled", `${identity}, to be filled in, ${link}`],
  ["n/a", `${identity} n/a ${link}`],
  ["none yet", `${identity} none yet ${link}`],
  ["not yet", `${identity} not yet run ${link}`],
  ["will be", `${identity} will be run, ${link}`],
  ["placeholder", `${identity} placeholder ${link}`],
  ["fill in", `${identity} fill in later ${link}`],
  ["upper-case pending", `${identity} PENDING ${link}`],
  ["identity text without any reference", `${identity} reviewed the change carefully`],
] as const) {
  test(`METRO-36 rejects ${name}`, async () => expect(await ok(body(value))).toBe(false));
}
test("METRO-36 'pending' inside another word is not a placeholder", async () =>
  expect(await ok(body(`${identity}, dependency graph checked, ${link}`))).toBe(true));

const crlf = (text: string): string => text.replaceAll("\n", "\r\n");
test("METRO-36 a body edited in the web UI uses CRLF and is still read", async () => {
  expect(await ok(crlf(body(valid)))).toBe(true);
  expect(await ok(crlf(`## Reviewer\n${valid}`))).toBe(true);
  expect(await ok(crlf(body("none (docs only)")), ["docs/a.md"])).toBe(true);
  expect(await ok(crlf(body("none (docs only)")), ["scripts/x.ts"])).toBe(false);
  expect(await ok(crlf(body("<!-- hidden -->\n")))).toBe(false);
  expect(readReviewerValue(crlf(body(valid)))).toBe(valid);
});

test("METRO-36 a deeper sub-heading stays inside the Reviewer section", async () => {
  const text = `## Reviewer\n\n### Details\n${valid}\n\n#### More\nextra\n\n## Checks run\nnone`;
  expect(await ok(text)).toBe(true);
  expect(readReviewerValue(text)).toContain("extra");
  expect(readReviewerValue(text)).not.toContain("none");
});
test("METRO-36 a heading of the same or a higher level ends the section", () => {
  expect(readReviewerValue(`### Reviewer\nabc\n### Next\ndef`)).toBe("abc");
  expect(readReviewerValue(`### Reviewer\nabc\n## Next\ndef`)).toBe("abc");
  expect(readReviewerValue(`## Reviewer\nabc\n# Next\ndef`)).toBe("abc");
});
test("METRO-36 headings inside fenced code blocks are ignored", async () => {
  const fenced = `## Reviewer\n\`\`\`\n## Ticket\n${valid}\n\`\`\`\n## Checks run\nx`;
  expect(await ok(fenced)).toBe(true);
  expect(await ok("```\n## Reviewer\n" + valid + "\n```")).toBe(false);
  expect(await ok(`~~~\n## Reviewer\n${valid}\n~~~`)).toBe(false);
  const longer = "````\n```\n## Reviewer\n" + valid + "\n````";
  expect(await ok(longer)).toBe(false);
  const unclosed = `## Reviewer\n\`\`\`\n${valid}`;
  expect(await ok(unclosed)).toBe(true);
});
test("METRO-36 Setext headings are not supported and count as no section", async () => {
  expect(await ok(`Reviewer\n--------\n${valid}`)).toBe(false);
  expect(await ok(`Reviewer\n========\n${valid}`)).toBe(false);
});

// METRO-134 AC5: the six reference cases, each of which passed on the previous presence-only check
// except (v) and (vi), which could not be expressed there.
test("METRO-134 AC5(i) a made-up session or run token fails", async () => {
  for (const reference of [
    `${identity}, session: 2026-11-04-made-up-token`,
    `${identity}; run: 424242424242`,
    `${identity}, session: r-123, disposition #35`,
  ]) {
    const result = await ev(body(reference), code);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("no link to a comment or review on this pull request");
  }
});
test("METRO-134 AC5(ii) a #N or a URL for another pull request or repository fails", async () => {
  expect((await ev(body(`${identity}, disposition in #36`), code)).ok).toBe(false);
  for (const other of [
    "https://github.com/o/r/pull/36#issuecomment-1",
    "https://github.com/o/other/pull/35#issuecomment-1",
    "https://github.com/x/r/pull/35#pullrequestreview-1",
  ]) {
    const spy = fakeLookups();
    const result = await evaluateReviewer(body(`${identity}, disposition ${other}`), code, {
      ...context(),
      lookups: spy.lookups,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("only to other pull requests");
    expect(spy.requested).toEqual([]);
  }
});
test("METRO-134 AC5(iii) a comment on this pull request without a Reviewed-head line fails", async () => {
  const result = await ev(body(valid), code, recordWith("All findings fixed or disproved."));
  expect(result.ok).toBe(false);
  expect(result.reason).toContain('no "Reviewed-head: <40-character commit SHA>" line');
});
test("METRO-134 AC5(iv) a Reviewed-head SHA followed by a content commit fails", async () => {
  const commits = [commit(FIRST, BASE), commit(HEAD, FIRST)];
  const result = await ev(body(valid), code, { ...recordWith(`Reviewed-head: ${FIRST}`), commits });
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("not merges of base commits only");
});
test("METRO-134 AC5(v) a Reviewed-head SHA equal to the pull request head passes", async () => {
  const spy = fakeLookups(recordWith(`Reviewed-head: ${HEAD}`));
  const result = await evaluateReviewer(body(valid), code, { ...context(), lookups: spy.lookups });
  expect(result.ok).toBe(true);
  expect(result.reason).toContain("authenticity is not proven");
  expect(spy.requested).toEqual(["record issuecomment 1", "commits"]);
});
test("METRO-134 AC5(vi) a Reviewed-head SHA followed only by a base merge passes", async () => {
  const merge = hex("3");
  const spy = fakeLookups({
    ...recordWith(`Reviewed-head: ${FIRST}`),
    commits: [commit(FIRST, BASE), commit(merge, FIRST, BASE_PARENT)],
    ancestors: [BASE_PARENT],
  });
  const result = await evaluateReviewer(body(valid), code, {
    ...context(),
    head: merge,
    lookups: spy.lookups,
  });
  expect(result.ok).toBe(true);
  expect(spy.requested).toEqual(["record issuecomment 1", "commits", `ancestor ${BASE_PARENT}`]);
});

const merge1 = hex("3");
const merge2 = hex("4");
const reviewedFirst = recordWith(`Reviewed-head: ${FIRST}`);
const decideAt = (fake: Fake, head: string) =>
  evaluateReviewer(body(valid), code, { ...context(fake), head });

test("METRO-134 several base merges in a row after the reviewed commit pass", async () => {
  const result = await decideAt(
    {
      ...reviewedFirst,
      commits: [
        commit(FIRST, BASE),
        commit(merge1, FIRST, BASE_PARENT),
        commit(merge2, merge1, hex("f")),
      ],
      ancestors: [BASE_PARENT, hex("f")],
    },
    merge2,
  );
  expect(result.ok).toBe(true);
});
test("METRO-134 a non-merge commit after a base merge still fails", async () => {
  const result = await decideAt(
    {
      ...reviewedFirst,
      commits: [commit(FIRST, BASE), commit(merge1, FIRST, BASE_PARENT), commit(merge2, merge1)],
      ancestors: [BASE_PARENT],
    },
    merge2,
  );
  expect(result.ok).toBe(false);
});
test("METRO-134 a merge whose second parent is not in the base fails", async () => {
  const result = await decideAt(
    {
      ...reviewedFirst,
      commits: [commit(FIRST, BASE), commit(merge1, FIRST, hex("9"))],
      ancestors: [BASE_PARENT],
    },
    merge1,
  );
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("not merges of base commits only");
});
test("METRO-134 a merge whose first parent is not the reviewed line fails", async () => {
  const side = hex("5");
  const result = await decideAt(
    {
      ...reviewedFirst,
      commits: [commit(FIRST, BASE), commit(side, BASE), commit(merge1, side, FIRST)],
      ancestors: [FIRST],
    },
    merge1,
  );
  expect(result.ok).toBe(false);
});
test("METRO-134 a failed ancestor lookup fails closed and never passes", async () => {
  const result = await decideAt(
    {
      ...reviewedFirst,
      commits: [commit(FIRST, BASE), commit(merge1, FIRST, BASE_PARENT)],
      ancestors: new LookupError(502),
    },
    merge1,
  );
  expect(result.ok).toBe(false);
  expect(result.reason).toContain(
    "Could not compare a merge parent with the base branch (HTTP 502)",
  );
});
test("METRO-134 too many merges after the reviewed commit fail without checking them all", async () => {
  const chain: PrCommit[] = [commit(FIRST, BASE)];
  let previous = FIRST;
  for (let index = 1; index <= 21; index += 1) {
    const sha = index.toString(16).padStart(40, "a");
    chain.push(commit(sha, previous, BASE_PARENT));
    previous = sha;
  }
  const spy = fakeLookups({ ...reviewedFirst, commits: chain, ancestors: [BASE_PARENT] });
  const result = await evaluateReviewer(body(valid), code, {
    ...context(),
    head: previous,
    lookups: spy.lookups,
  });
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("Too many merge commits");
  expect(spy.requested.filter((call) => call.startsWith("ancestor"))).toHaveLength(20);
});
test("METRO-134 a reviewed commit that is not in the pull request fails", async () => {
  const result = await ev(body(valid), code, recordWith(`Reviewed-head: ${hex("9")}`));
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("not a commit of this pull request");
});
test("METRO-134 a head missing from the commit list fails", async () => {
  const result = await decideAt({ ...reviewedFirst, commits: [commit(FIRST, BASE)] }, HEAD);
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("head is missing");
});
test("METRO-134 a reviewed commit that is not an ancestor of the head fails", async () => {
  const side = hex("5");
  const result = await decideAt(
    {
      ...recordWith(`Reviewed-head: ${side}`),
      commits: [commit(FIRST, BASE), commit(side, BASE), commit(HEAD, FIRST)],
    },
    HEAD,
  );
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("not an ancestor");
});

test("METRO-134 malformed Reviewed-head lines fail", async () => {
  for (const line of [
    `Reviewed-head: ${HEAD.toUpperCase().replaceAll("2", "A")}`,
    `Reviewed-head: ${"a".repeat(39)}`,
    `Reviewed-head: ${"a".repeat(41)}`,
    `Reviewed-head:${HEAD}`,
    `reviewed-head: ${HEAD}`,
    `Reviewed-head: ${HEAD} trailing`,
    `Reviewed-head: ${HEAD}\nReviewed-head: nonsense`,
  ]) {
    const result = await ev(body(valid), code, recordWith(line));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("malformed");
  }
});
test("METRO-134 conflicting Reviewed-head lines fail and identical repeats pass", async () => {
  const conflict = await ev(
    body(valid),
    code,
    recordWith(`Reviewed-head: ${FIRST}\nReviewed-head: ${HEAD}`),
  );
  expect(conflict.ok).toBe(false);
  expect(conflict.reason).toContain("conflicting");
  expect(
    (
      await ev(
        body(valid),
        code,
        recordWith(`Reviewed-head: ${HEAD}\r\nnotes\r\nReviewed-head: ${HEAD}`),
      )
    ).ok,
  ).toBe(true);
});
test("METRO-134 a Reviewed-head line must stand alone on its line", async () => {
  expect((await ev(body(valid), code, recordWith(`see Reviewed-head: ${HEAD}`))).ok).toBe(false);
});
test("METRO-134 a huge comment is refused unread and its text is never echoed", async () => {
  const secret = "SECRET-COMMENT-TEXT";
  const huge = `${secret}\n${"x".repeat(70_001)}\nReviewed-head: ${HEAD}`;
  const result = await ev(body(valid), code, recordWith(huge));
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("too large");
  expect(result.reason).not.toContain(secret);
  const small = await ev(body(valid), code, recordWith(`${secret}\nReviewed-head: nope`));
  expect(small.reason).not.toContain(secret);
});

test("METRO-134 a comment that belongs to another pull request fails", async () => {
  for (const target of [
    "https://api.github.com/repos/o/r/issues/36",
    "https://api.github.com/repos/o/r/issues/135",
    "https://api.github.com/repos/o/other/issues/35",
    "https://api.github.com/repos/o/r/pulls/35",
  ]) {
    const result = await ev(body(valid), code, recordWith(`Reviewed-head: ${HEAD}`, target));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("does not belong to this pull request");
  }
});
test("METRO-134 a pull request review is accepted when it belongs to this pull request", async () => {
  const text = body(`${identity}, disposition https://github.com/O/R/pull/35#PullRequestReview-77`);
  const fake: Fake = {
    records: { "pullrequestreview-77": { body: `Reviewed-head: ${HEAD}`, target: reviewTarget } },
  };
  expect((await ev(text, code, fake)).ok).toBe(true);
  const wrong: Fake = {
    records: { "pullrequestreview-77": { body: `Reviewed-head: ${HEAD}`, target: issueTarget } },
  };
  const result = await ev(text, code, wrong);
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("review does not belong");
});
test("METRO-134 a deleted or unreadable comment fails closed with its status", async () => {
  const missing = await ev(body(valid), code, {
    records: { "issuecomment-1": new LookupError(404) },
  });
  expect(missing.ok).toBe(false);
  expect(missing.reason).toContain("(HTTP 404)");
  const broken = await ev(body(valid), code, {
    records: { "issuecomment-1": new Error("boom text") },
  });
  expect(broken.ok).toBe(false);
  expect(broken.reason).not.toContain("boom");
  expect(broken.reason).not.toContain("HTTP");
});
test("METRO-134 an unreadable commit list fails closed", async () => {
  const result = await ev(body(valid), code, { commits: new LookupError(500) });
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("Could not read the pull request commits (HTTP 500)");
});
test("METRO-134 several links: one valid record is enough, a repeat is read once, extras are ignored", async () => {
  const links = [1, 2, 3, 4]
    .map((id) => `https://github.com/o/r/pull/35#issuecomment-${id}`)
    .join(" ");
  const goodRecord: RecordText = { body: `Reviewed-head: ${HEAD}`, target: issueTarget };
  const records: Record<string, RecordText> = {
    "issuecomment-1": { body: "no line", target: issueTarget },
    "issuecomment-2": goodRecord,
    "issuecomment-4": goodRecord,
  };
  const spy = fakeLookups({ records });
  const text = body(`${identity} ${links} ${links}`);
  const result = await evaluateReviewer(text, code, { ...context(), lookups: spy.lookups });
  expect(result.ok).toBe(true);
  expect(spy.requested.filter((call) => call.startsWith("record"))).toEqual([
    "record issuecomment 1",
    "record issuecomment 2",
  ]);
  // Only the first three distinct links count: a valid fourth does not rescue three bad ones.
  const none = await ev(text, code, {
    records: {
      "issuecomment-1": { body: "a", target: issueTarget },
      "issuecomment-2": { body: "b", target: issueTarget },
      "issuecomment-3": { body: "c", target: issueTarget },
      "issuecomment-4": goodRecord,
    },
  });
  expect(none.ok).toBe(false);
  expect(none.reason).toContain('no "Reviewed-head');
});

const sha = hex("a");
/** Read through a function so TypeScript does not narrow it to the value just assigned. */
function currentExit(): number | string | null | undefined {
  return process.exitCode;
}
const goodEnv = {
  BASE_SHA: sha,
  HEAD_SHA: sha,
  REPOSITORY: "o/r",
  PR_NUMBER: "35",
  GH_TOKEN: "t",
};
async function run(
  env: Record<string, string | undefined>,
  files: string[] | Error = code,
  fake: Fake = {},
) {
  const errors: string[] = [];
  const logs: string[] = [];
  const calls: string[][] = [];
  const pulls: unknown[] = [];
  const previous = process.exitCode;
  process.exitCode = 0;
  await reviewerRecordMain(env, {
    changedPaths: (base, head) => {
      calls.push([base, head]);
      if (files instanceof Error) throw files;
      return files;
    },
    log: (m) => logs.push(m),
    error: (m) => errors.push(m),
    lookups: (pull, token) => {
      pulls.push([pull, token]);
      return fakeLookups(fake).lookups;
    },
  });
  const exitCode = currentExit();
  process.exitCode = previous;
  return { errors, logs, exitCode, calls, pulls };
}
const passing: Fake = recordWith(`Reviewed-head: ${sha}`);
const passingCommits: Fake = { ...passing, commits: [commit(sha, BASE)] };
test("METRO-134 the entry point passes a valid body and reports success", async () => {
  const result = await run({ ...goodEnv, PR_BODY: body(valid) }, code, passingCommits);
  expect(result.exitCode ?? 0).toBe(0);
  expect(result.logs.join("\n")).toContain("bound to the reviewed head");
  expect(result.calls).toEqual([[sha, sha]]);
  expect(result.pulls).toEqual([[{ owner: "o", repo: "r", number: 35, base: sha }, "t"]]);
});
test("METRO-36 the entry point fails with the reason for an unset body", async () => {
  const result = await run(goodEnv);
  expect(result.exitCode).toBe(1);
  expect(result.errors.join("\n")).toContain("Reviewer");
});
test("METRO-134 the entry point reports a failed record and never prints the token or the body", async () => {
  const result = await run({
    ...goodEnv,
    GH_TOKEN: "tok-abc",
    PR_BODY: body(`${identity} session: r-1 so-made-up`),
  });
  expect(result.exitCode).toBe(1);
  const out = result.errors.join("\n");
  expect(out).not.toContain("tok-abc");
  expect(out).not.toContain("made-up");
});
test("METRO-36 the entry point rejects malformed commit ids before using them", async () => {
  const result = await run({ ...goodEnv, PR_BODY: body(valid), BASE_SHA: "--output=x" });
  expect(result.exitCode).toBe(1);
  expect(result.calls).toEqual([]);
  expect((await run({ ...goodEnv, BASE_SHA: undefined, PR_BODY: body(valid) })).exitCode).toBe(1);
});
test("METRO-134 the entry point rejects a missing or malformed repository, number or token", async () => {
  for (const patch of [
    { REPOSITORY: undefined },
    { REPOSITORY: "o/r/extra" },
    { REPOSITORY: "../x" },
    { PR_NUMBER: undefined },
    { PR_NUMBER: "0" },
    { PR_NUMBER: "35; id" },
    { PR_NUMBER: "1234567890" },
    { GH_TOKEN: undefined },
    { GH_TOKEN: "" },
  ]) {
    const result = await run({ ...goodEnv, ...patch, PR_BODY: body(valid) }, code, passingCommits);
    expect(result.exitCode).toBe(1);
    expect(result.calls).toEqual([]);
    expect(result.errors.join("\n")).toContain("must be set");
  }
});
test("METRO-36 the entry point fails visibly when the changed paths cannot be read", async () => {
  const result = await run({ ...goodEnv, PR_BODY: body(valid) }, new Error("no git"));
  expect(result.exitCode).toBe(1);
  expect(result.errors.join("\n")).toContain("no git");
});
test("METRO-134 the entry point turns a non-Error throw into text", async () => {
  const errors: string[] = [];
  const previous = process.exitCode;
  await reviewerRecordMain(
    { ...goodEnv, PR_BODY: body(valid) },
    {
      changedPaths: () => {
        const thrown: unknown = "plain text";
        throw thrown;
      },
      log: (m) => errors.push(m),
      error: (m) => errors.push(m),
      lookups: () => fakeLookups().lookups,
    },
  );
  expect(errors).toEqual(["plain text"]);
  process.exitCode = previous;
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
}, 30000);

test("METRO-134 the default dependencies use real git, the console and fetch (stubbed, no network)", async () => {
  const head = Bun.spawnSync(["git", "rev-parse", "HEAD"]).stdout.toString().trim();
  const out: string[] = [];
  const requests: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  const previous = process.exitCode;
  console.log = (m: string) => void out.push(`log:${m}`);
  console.error = (m: string) => void out.push(`error:${m}`);
  let found = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = Object.assign(
    (input: string | URL | Request): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      requests.push(url);
      if (!found) return Promise.resolve(new Response("{}", { status: 404 }));
      const answer = url.includes("/commits")
        ? [{ sha: head, parents: [] }]
        : { body: `Reviewed-head: ${head}`, issue_url: issueTarget };
      return Promise.resolve(Response.json(answer));
    },
    { preconnect: originalFetch.preconnect },
  );
  process.exitCode = 0;
  const env = { ...goodEnv, BASE_SHA: head, HEAD_SHA: head, GH_TOKEN: "tok-default" };
  try {
    await reviewerRecordMain({ ...env, PR_BODY: body(valid) });
    expect(currentExit()).toBe(1);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain(
      "error:Could not read the linked comment on this pull request (HTTP 404)",
    );
    expect(out[0]).not.toContain("tok-default");
    expect(requests).toEqual(["https://api.github.com/repos/o/r/issues/comments/1"]);
    found = true;
    await reviewerRecordMain({ ...env, PR_BODY: body(valid) });
    expect(out[1]).toContain("log:Reviewer record found on this pull request");
    await reviewerRecordMain({ ...env, PR_BODY: "" });
  } finally {
    console.log = originalLog;
    console.error = originalError;
    globalThis.fetch = originalFetch;
    process.exitCode = previous;
  }
  expect(out.map((line) => line.split(":")[0])).toEqual(["error", "log", "error"]);
});

const script = new URL("./reviewer-record.ts", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/u,
  "$1",
);
test("METRO-36 the real CLI treats shell syntax in the body as data and still rejects it", () => {
  const evil = '## Reviewer\n$(touch pwned) `id` "; exit 0 #';
  const result = Bun.spawnSync(["node", script], {
    env: { ...process.env, ...goodEnv, PR_BODY: evil },
  });
  expect(result.exitCode).toBe(1);
});

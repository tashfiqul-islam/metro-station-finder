import { createLookups, LookupError, type FetchJson } from "./reviewer-lookups";

const pull = { owner: "o", repo: "r", number: 35, base: "b".repeat(40) };
const TOKEN = "test-token-value";

interface Call {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly signal: AbortSignal | undefined;
}

/** A fake fetch that answers from `answers` in order and records each request. */
function fake(answers: readonly { ok?: boolean; status?: number; json?: unknown }[]) {
  const calls: Call[] = [];
  const queue = [...answers];
  const fetchJson: FetchJson = (url, init) => {
    calls.push({ url, headers: init.headers, signal: init.signal });
    const answer = queue.shift() ?? { ok: false, status: 500 };
    return Promise.resolve({
      ok: answer.ok ?? true,
      status: answer.status ?? 200,
      json: () => Promise.resolve(answer.json),
    });
  };
  return { calls, lookups: createLookups(fetchJson, TOKEN, pull) };
}

async function failure(work: Promise<unknown>): Promise<LookupError> {
  try {
    await work;
  } catch (error) {
    if (error instanceof LookupError) return error;
    throw error;
  }
  throw new Error("expected a LookupError");
}

const commit = (sha: string, ...parents: string[]) => ({
  sha,
  parents: parents.map((parent) => ({ sha: parent })),
});

test("METRO-134 an issue comment is read from the issues endpoint with the token as a bearer header", async () => {
  const { calls, lookups } = fake([
    { json: { body: "text", issue_url: "https://api.github.com/repos/o/r/issues/35" } },
  ]);
  expect(await lookups.record("issuecomment", "123")).toEqual({
    body: "text",
    target: "https://api.github.com/repos/o/r/issues/35",
  });
  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe("https://api.github.com/repos/o/r/issues/comments/123");
  expect(calls[0]?.headers["Authorization"]).toBe(`Bearer ${TOKEN}`);
  expect(calls[0]?.headers["X-GitHub-Api-Version"]).toBe("2022-11-28");
  expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);
});

test("METRO-134 a review is read from this pull request's reviews endpoint", async () => {
  const { calls, lookups } = fake([
    { json: { body: null, pull_request_url: "https://api.github.com/repos/o/r/pulls/35" } },
  ]);
  expect(await lookups.record("pullrequestreview", "9")).toEqual({
    body: "",
    target: "https://api.github.com/repos/o/r/pulls/35",
  });
  expect(calls[0]?.url).toBe("https://api.github.com/repos/o/r/pulls/35/reviews/9");
});

test("METRO-134 a record with a wrong shape fails with status 0", async () => {
  for (const json of [
    null,
    [],
    "x",
    { body: 5, issue_url: "u" },
    { body: "x" },
    { body: "x", issue_url: 5 },
  ]) {
    const { lookups } = fake([{ json }]);
    expect((await failure(lookups.record("issuecomment", "1"))).status).toBe(0);
  }
});

test("METRO-134 an HTTP error carries its status and no response text", async () => {
  const { lookups } = fake([{ ok: false, status: 404, json: { message: "secret detail" } }]);
  const error = await failure(lookups.record("issuecomment", "1"));
  expect(error.status).toBe(404);
  expect(error.message).not.toContain("secret");
});

test("METRO-134 commits are read page by page until a short page", async () => {
  const full = Array.from({ length: 100 }, (_, index) => commit(`s${index}`, "p"));
  const { calls, lookups } = fake([{ json: full }, { json: [commit("last", "a", "b")] }]);
  const commits = await lookups.commits();
  expect(commits).toHaveLength(101);
  expect(commits[100]).toEqual({ sha: "last", parents: ["a", "b"] });
  expect(calls.map((call) => call.url)).toEqual([
    "https://api.github.com/repos/o/r/pulls/35/commits?per_page=100&page=1",
    "https://api.github.com/repos/o/r/pulls/35/commits?per_page=100&page=2",
  ]);
});

test("METRO-134 commit reading stops after three pages, the API's 250-commit cap", async () => {
  const full = Array.from({ length: 100 }, (_, index) => commit(`s${index}`));
  const { calls, lookups } = fake([{ json: full }, { json: full }, { json: full }, { json: full }]);
  expect(await lookups.commits()).toHaveLength(300);
  expect(calls).toHaveLength(3);
});

test("METRO-134 a commit list with a wrong shape fails with status 0", async () => {
  for (const json of [
    {},
    [null],
    [{ sha: "a" }],
    [{ sha: 1, parents: [] }],
    [{ sha: "a", parents: [null] }],
    [{ sha: "a", parents: [{ sha: 1 }] }],
  ]) {
    const { lookups } = fake([{ json }]);
    expect((await failure(lookups.commits())).status).toBe(0);
  }
  const { lookups } = fake([{ ok: false, status: 403 }]);
  expect((await failure(lookups.commits())).status).toBe(403);
});

test("METRO-134 a commit is an ancestor of the base when the base is ahead of it or identical", async () => {
  const { calls, lookups } = fake([
    { json: { status: "ahead" } },
    { json: { status: "identical" } },
    { json: { status: "behind" } },
    { json: { status: "diverged" } },
  ]);
  const sha = "a".repeat(40);
  expect(await lookups.isBaseAncestor(sha)).toBe(true);
  expect(await lookups.isBaseAncestor(sha)).toBe(true);
  expect(await lookups.isBaseAncestor(sha)).toBe(false);
  expect(await lookups.isBaseAncestor(sha)).toBe(false);
  expect(calls[0]?.url).toBe(
    `https://api.github.com/repos/o/r/compare/${sha}...${"b".repeat(40)}?per_page=1`,
  );
});

test("METRO-134 a comparison with a wrong shape or an HTTP error fails", async () => {
  for (const answer of [{ json: 5 }, { json: {} }, { ok: false, status: 404 }]) {
    const { lookups } = fake([answer]);
    expect(await failure(lookups.isBaseAncestor("a".repeat(40)))).toBeInstanceOf(LookupError);
  }
});

test("METRO-134 a LookupError has fixed text", () => {
  const error = new LookupError(502);
  expect(error.message).toBe("GitHub lookup failed");
  expect(error.status).toBe(502);
});

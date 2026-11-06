import { isRecord } from "./guards";
import {
  contentHash,
  escapeHtml,
  extractReferences,
  hashOf,
  hasProductionDeployment,
  releaseSyncMain,
  renderDescription,
  syncRelease,
  validateTag,
  type Config,
  type Deps,
  type FetchedResponse,
  type FetchInit,
} from "./release-sync";
import { expectRejection } from "./test-support";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const KEY = "plane-secret-key-value";
const config: Config = {
  repository: "owner/repo",
  workspace: "ws",
  tag: "v1.2.0",
  githubToken: "gh-token-value",
  planeKey: KEY,
  planeBase: "https://plane.test",
};

const reply = (status: number, body: unknown = {}, text = ""): FetchedResponse => ({
  status,
  ok: status >= 200 && status < 300,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(text),
});

interface PlaneRelease extends Record<string, unknown> {
  id: string;
  name: string;
  status: string;
}
interface World {
  /** `null` = no published release (404). */
  github: null | { draft?: boolean; prerelease?: boolean; body: string; published_at?: string };
  sha: string;
  deployments: { id: number; states: string[] }[];
  releases: PlaneRelease[];
  tags: Record<string, unknown>[];
  changelogs: Record<string, string>;
  writes: string[];
  fail: Record<string, number>;
  pageSize: number;
}

const world = (patch: Partial<World> = {}): World => ({
  github: { body: "Notes METRO-12 #7", published_at: "2026-11-04T10:00:00Z" },
  sha: SHA,
  deployments: [],
  releases: [],
  tags: [],
  changelogs: {},
  writes: [],
  fail: {},
  pageSize: 100,
  ...patch,
});

function page(items: Record<string, unknown>[], url: string) {
  const size = Number(new URL(url).searchParams.get("per_page") ?? "100");
  const effective = Math.min(size, 100);
  const cursor = new URL(url).searchParams.get("cursor");
  const offset = cursor === null ? 0 : Number(cursor.split(":")[1]);
  const slice = items.slice(offset, offset + effective);
  const more = offset + effective < items.length;
  return reply(200, {
    results: slice,
    next_page_results: more,
    next_cursor: `${effective}:${offset + effective}:0`,
  });
}

function server(w: World): Deps & { calls: string[] } {
  const calls: string[] = [];
  const fetch = (url: string, init: FetchInit = {}): Promise<FetchedResponse> => {
    const method = init.method ?? "GET";
    const path = url
      .replace("https://api.github.com/repos/owner/repo", "gh:")
      .replace("https://plane.test/api/v1/workspaces/ws/releases/", "plane:");
    calls.push(`${method} ${path}`);
    const full = `${method} ${path}`;
    const forced = Object.entries(w.fail).find(([key]) =>
      key.endsWith("$") ? full === key.slice(0, -1) : full.startsWith(key),
    );
    if (forced !== undefined) return Promise.resolve(reply(forced[1]));
    const parsed: unknown = typeof init.body === "string" ? JSON.parse(init.body) : {};
    const body: Record<string, unknown> = isRecord(parsed) ? parsed : {};
    if (method === "POST" && url === "https://api.github.com/markdown")
      return Promise.resolve(reply(200, {}, `<p>${String(body["text"])}</p>`));
    if (path.startsWith("gh:/releases/tags/")) {
      if (w.github === null) return Promise.resolve(reply(404));
      return Promise.resolve(
        reply(200, {
          html_url: "https://github.com/owner/repo/releases/tag/v1.2.0",
          draft: w.github.draft ?? false,
          prerelease: w.github.prerelease ?? false,
          body: w.github.body,
          published_at: w.github.published_at ?? "2026-11-04T10:00:00Z",
        }),
      );
    }
    if (path.startsWith("gh:/commits/")) return Promise.resolve(reply(200, { sha: w.sha }));
    if (path.startsWith("gh:/deployments?"))
      return Promise.resolve(
        reply(
          200,
          w.deployments.map((d) => ({ id: d.id })),
        ),
      );
    const statusMatch = /^gh:\/deployments\/(\d+)\/statuses/u.exec(path);
    if (statusMatch !== null) {
      const found = w.deployments.find((d) => d.id === Number(statusMatch[1]));
      return Promise.resolve(
        reply(200, found === undefined ? [] : found.states.map((state) => ({ state }))),
      );
    }
    if (method === "GET" && path.startsWith("plane:tags/"))
      return Promise.resolve(page(w.tags, url));
    if (method === "GET" && path.startsWith("plane:?"))
      return Promise.resolve(page(w.releases, url));
    if (method === "POST" && path === "plane:tags/") {
      const tag = { id: `tag-${w.tags.length + 1}`, ...body };
      w.tags.push(tag);
      w.writes.push("tag:create");
      return Promise.resolve(reply(201, tag));
    }
    const tagPatch = /^plane:tags\/([^/]+)\/$/u.exec(path);
    if (method === "PATCH" && tagPatch !== null) {
      const tag = w.tags.find((t) => t["id"] === tagPatch[1]);
      if (tag === undefined) return Promise.resolve(reply(404));
      Object.assign(tag, body);
      w.writes.push("tag:update");
      return Promise.resolve(reply(200, tag));
    }
    const logPatch = /^plane:([^/]+)\/changelog\/$/u.exec(path);
    if (method === "PATCH" && logPatch !== null) {
      w.changelogs[logPatch[1] ?? ""] = String(body["description_html"]);
      w.writes.push("changelog");
      return Promise.resolve(reply(200, {}));
    }
    if (method === "POST" && path === "plane:") {
      const release: PlaneRelease = {
        ...body,
        id: `rel-${w.releases.length + 1}`,
        name: String(body["name"]),
        status: String(body["status"]),
      };
      w.releases.push(release);
      w.writes.push("release:create");
      return Promise.resolve(reply(201, release));
    }
    const relPatch = /^plane:([^/]+)\/$/u.exec(path);
    if (method === "PATCH" && relPatch !== null) {
      const release = w.releases.find((r) => r.id === relPatch[1]);
      if (release === undefined) return Promise.resolve(reply(404));
      Object.assign(release, body);
      w.writes.push("release:update");
      return Promise.resolve(reply(200, release));
    }
    return Promise.resolve(reply(500));
  };
  return { fetch, log: () => {}, calls };
}

function onlyRelease(w: World): PlaneRelease {
  const [release] = w.releases;
  if (release === undefined) throw new Error("expected a Plane release");
  return release;
}

const run = (w: World, overrides: Partial<Config> = {}) => {
  const deps = server(w);
  return syncRelease({ ...config, ...overrides }, deps).then((outcome) => ({ outcome, deps }));
};

test("METRO-14 a published stable release creates the release, its tag and its log, and a replay changes nothing", async () => {
  const w = world();
  expect((await run(w)).outcome).toBe("created");
  expect(w.writes).toEqual(["tag:create", "release:create", "changelog", "tag:update"]);
  const [release] = w.releases;
  const [tag] = w.tags;
  expect(release).toMatchObject({
    name: "v1.2.0",
    status: "unreleased",
    release_date: null,
    is_prerelease: false,
    external_source: "github",
    external_id: "v1.2.0",
    tag: tag?.["id"],
  });
  expect(tag).toMatchObject({ version: "v1.2.0", git_tag: "v1.2.0", commit_hash: SHA });
  expect(hashOf(String(tag?.["description"]))).toMatch(/^[0-9a-f]{64}$/u);
  expect(w.changelogs["rel-1"]).toContain("Notes METRO-12 #7");
  expect(String(release?.["description_html"])).toContain("METRO-12");
  w.writes.length = 0;
  expect((await run(w)).outcome).toBe("unchanged");
  expect(w.writes).toEqual([]);
});

test("METRO-14 a successful production deployment of the same SHA marks the release released with its date", async () => {
  const w = world({
    deployments: [
      { id: 1, states: ["failure"] },
      { id: 2, states: ["inactive", "success"] },
    ],
  });
  await run(w);
  expect(w.releases[0]).toMatchObject({ status: "released", release_date: "2026-11-04" });
});

test("METRO-14 a failed or missing deployment never marks the release released", async () => {
  for (const deployments of [
    [],
    [{ id: 1, states: ["failure"] }],
    [{ id: 1, states: ["inactive"] }],
    [{ id: 1, states: ["in_progress"] }],
  ]) {
    const w = world({ deployments });
    await run(w);
    expect(w.releases[0]).toMatchObject({ status: "unreleased", release_date: null });
  }
});

test("METRO-14 a prerelease is flagged and never released, even with a deployment", async () => {
  const w = world({
    github: { body: "pre", prerelease: true },
    deployments: [{ id: 1, states: ["success"] }],
  });
  await run(w);
  expect(w.releases[0]).toMatchObject({ status: "unreleased", is_prerelease: true });
});

test("METRO-14 a deleted, unpublished or draft release resets a managed Plane release without touching tag or log", async () => {
  for (const github of [null, { draft: true, body: "d" }]) {
    const w = world();
    await run(w);
    w.releases[0] = { ...onlyRelease(w), status: "released", release_date: "2026-11-04" };
    w.github = github;
    w.writes.length = 0;
    expect((await run(w)).outcome).toBe("updated");
    expect(w.writes).toEqual(["release:update"]);
    expect(w.releases[0]).toMatchObject({ status: "unreleased", release_date: null });
    expect(String(w.releases[0]?.["description_html"])).toContain("not published");
  }
});

test("METRO-14 with no GitHub release and no Plane release nothing is written", async () => {
  const w = world({ github: null });
  expect((await run(w)).outcome).toBe("skipped");
  expect(w.writes).toEqual([]);
});

test("METRO-14 a historical released Plane release without an external source is never touched", async () => {
  const w = world({
    releases: [{ id: "old", name: "v1.2.0", status: "released", release_date: "2024-01-14" }],
  });
  expect((await run(w)).outcome).toBe("skipped");
  expect(w.writes).toEqual([]);
});

test("METRO-14 the planned unreleased Plane release is claimed, not duplicated", async () => {
  const w = world({
    releases: [{ id: "planned", name: "v1.2.0", status: "unreleased", tag: "old-tag" }],
  });
  expect((await run(w)).outcome).toBe("updated");
  expect(w.releases).toHaveLength(1);
  expect(w.releases[0]).toMatchObject({ id: "planned", external_source: "github" });
});

test("METRO-14 an existing Plane tag for the version is updated in place, not duplicated", async () => {
  const w = world({
    tags: [{ id: "t1", version: "v1.2.0", git_tag: "v1.2.0", commit_hash: null, description: "x" }],
  });
  await run(w);
  expect(w.tags).toHaveLength(1);
  expect(w.tags[0]).toMatchObject({ commit_hash: SHA });
  expect(w.writes).toContain("tag:update");
  expect(w.releases[0]?.["tag"]).toBe("t1");
});

test("METRO-14 edited notes or a moved tag rewrite the tag, the log and the release", async () => {
  const w = world();
  await run(w);
  w.github = { body: "New notes METRO-13", published_at: "2026-11-04T10:00:00Z" };
  w.writes.length = 0;
  expect((await run(w)).outcome).toBe("updated");
  expect(w.writes).toEqual(["tag:update", "release:update", "changelog", "tag:update"]);
  expect(w.changelogs["rel-1"]).toContain("New notes METRO-13");
  w.sha = "f".repeat(40);
  w.writes.length = 0;
  await run(w);
  expect(w.tags[0]).toMatchObject({ commit_hash: "f".repeat(40) });
});

test("METRO-14 a hand edit in Plane persists until GitHub changes", async () => {
  const w = world();
  await run(w);
  w.changelogs["rel-1"] = "<p>edited in Plane</p>";
  w.writes.length = 0;
  expect((await run(w)).outcome).toBe("unchanged");
  expect(w.changelogs["rel-1"]).toBe("<p>edited in Plane</p>");
});

test("METRO-14 a drift in the linked tag or status is repaired even when the content is current", async () => {
  const w = world();
  await run(w);
  w.releases[0] = { ...onlyRelease(w), tag: "other", status: "cancelled" };
  w.writes.length = 0;
  expect((await run(w)).outcome).toBe("updated");
  expect(w.writes).toEqual(["release:update"]);
  expect(w.releases[0]).toMatchObject({ status: "unreleased", tag: "tag-1" });
});

test("METRO-14 lists are read across pages", async () => {
  const filler = Array.from({ length: 130 }, (_, i) => ({
    id: `r${i}`,
    name: `v0.0.${i}`,
    status: "released",
    external_source: null,
  }));
  const w = world({ releases: [...filler, { id: "late", name: "v1.2.0", status: "unreleased" }] });
  expect((await run(w)).outcome).toBe("updated");
  expect(w.releases.find((r) => r.id === "late")).toMatchObject({ external_source: "github" });
});

test("METRO-14 HTTP failures stop the sync with the status and never print a credential", async () => {
  for (const [prefix, message] of [
    ["GET gh:/releases/tags/", "Reading the GitHub release failed with HTTP 500"],
    ["GET gh:/commits/", "Resolving the commit of v1.2.0 failed with HTTP 500"],
    ["GET plane:?", "Listing Plane releases failed with HTTP 500"],
    ["GET plane:tags/", "Listing Plane release tags failed with HTTP 500"],
    ["POST https://api.github.com/markdown", "Rendering the release notes failed with HTTP 500"],
    ["POST plane:tags/", "Writing the Plane release tag failed with HTTP 500"],
    ["POST plane:$", "Creating the Plane release failed with HTTP 500"],
    ["PATCH plane:rel-1/changelog/", "Writing the Plane release log failed with HTTP 500"],
  ] as const) {
    const w = world({ fail: { [prefix]: 500 } });
    const error = await run(w).catch((e: unknown) => e);
    expect(String(error)).toContain(message);
    expect(String(error)).not.toContain(KEY);
    expect(String(error)).not.toContain(config.githubToken);
  }
});

test("METRO-14 an update failure is reported with its status", async () => {
  const w = world();
  await run(w);
  w.github = { body: "changed" };
  w.fail = { "PATCH plane:rel-1/": 500 };
  expect(String(await run(w).catch((e: unknown) => e))).toContain(
    "Updating the Plane release failed with HTTP 500",
  );
});

test("METRO-14 invalid tags are rejected before any request", async () => {
  for (const tag of [
    "1.2.0",
    "v1.2",
    "v01.2.3",
    "v1.2.3;rm",
    "main",
    "v1.2.3-",
    "v1.0.0+build.5",
    "V1.0.0",
    "v01.0.0",
  ]) {
    expect(() => validateTag(tag)).toThrow("Tag must look like");
  }
  for (const tag of [
    "v0.0.0",
    "v1.2.3",
    "v10.20.30-rc.1",
    "v1.0.0-sync-test",
    "v1.0.0",
    "v0.0.2",
    "v1.0.0-rc.1",
    "v1.2.0-beta.2",
    "v10.20.30",
  ])
    expect(validateTag(tag)).toBe(tag);
  const w = world();
  const deps = server(w);
  await expectRejection(syncRelease({ ...config, tag: "bad" }, deps), "Tag must look like");
  expect(deps.calls).toEqual([]);
});

test("METRO-14 references are extracted from release notes", () => {
  const refs = extractReferences(
    "## Deferred\n- METRO-15, METRO-9\nSee https://github.com/o/r/pull/21 and #22 and METRO-9 again, a&#38;b",
  );
  expect(refs).toEqual({ tickets: ["METRO-9", "METRO-15"], pulls: [21, 22], deferred: true });
  expect(extractReferences("nothing")).toEqual({ tickets: [], pulls: [], deferred: false });
});

test("METRO-14 descriptions escape HTML and state what is missing", () => {
  const html = renderDescription("v1.2.0", SHA, {
    tag: "v1.2.0",
    url: 'https://x/"y',
    body: "<script>alert(1)</script>",
    prerelease: true,
    publishedAt: "2026-11-04T00:00:00Z",
  });
  expect(html).not.toContain("<script>");
  expect(html).toContain("(prerelease)");
  expect(html).toContain("none found");
  expect(html).toContain("Deferred section: missing");
  expect(escapeHtml('<a href="x">&</a>')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
});

test("METRO-14 the content hash is stable and sensitive to every part", () => {
  expect(contentHash(["a", "b"])).toBe(contentHash(["a", "b"]));
  expect(contentHash(["a", "b"])).not.toBe(contentHash(["a", "c"]));
  expect(contentHash(["ab"])).not.toBe(contentHash(["a", "b"]));
  expect(hashOf("no hash here")).toBeNull();
});

test("METRO-14 deployment lookups reject malformed answers", async () => {
  const w = world();
  const deps = server(w);
  const bad: Deps = {
    ...deps,
    fetch: (url) =>
      Promise.resolve(
        url.includes("/deployments?") ? reply(200, { not: "a list" }) : reply(200, []),
      ),
  };
  await expectRejection(hasProductionDeployment(config, bad, SHA), "not a list");
  const failing: Deps = { ...deps, fetch: () => Promise.resolve(reply(403)) };
  await expectRejection(
    hasProductionDeployment(config, failing, SHA),
    "Listing deployments failed with HTTP 403",
  );
});

test("METRO-14 the entry point reads the environment, logs the outcome and fails the step on error", async () => {
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    await releaseSyncMain({});
    expect(process.exitCode).toBe(1);
    expect(String(error.mock.calls[0]?.[0])).toContain("GITHUB_REPOSITORY is required");
    process.exitCode = 0;
    const w = world({ github: null });
    const logs: string[] = [];
    await releaseSyncMain(
      {
        GITHUB_REPOSITORY: "owner/repo",
        PLANE_WORKSPACE: "ws",
        RELEASE_TAG: "v1.2.0",
        GITHUB_TOKEN: "t",
        PLANE_API_KEY: KEY,
        PLANE_API_BASE: "https://plane.test",
      },
      { ...server(w), log: (m) => logs.push(m) },
    );
    expect(logs.at(-1)).toBe("Release sync finished: skipped");
    expect(process.exitCode ?? 0).toBe(0);
    process.exitCode = 0;
    await releaseSyncMain({ GITHUB_REPOSITORY: "  " });
    expect(process.exitCode).toBe(1);
  } finally {
    process.exitCode = 0;
    error.mockRestore();
  }
});

test("METRO-14 a write that fails after the tag was created is fully redone on the next run", async () => {
  const w = world({ fail: { "POST plane:$": 500 } });
  expect(String(await run(w).catch((e: unknown) => e))).toContain(
    "Creating the Plane release failed",
  );
  expect(w.tags).toHaveLength(1);
  expect(hashOf(String(w.tags[0]?.["description"]))).toBeNull();
  w.fail = {};
  expect((await run(w)).outcome).toBe("created");
  expect(w.changelogs["rel-1"]).toContain("Notes METRO-12");
  expect(w.tags).toHaveLength(1);
  expect(hashOf(String(w.tags[0]?.["description"]))).toMatch(/^[0-9a-f]{64}$/u);
  w.writes.length = 0;
  expect((await run(w)).outcome).toBe("unchanged");
});

test("METRO-14 a failed log write leaves the hash stale so the log is retried", async () => {
  const w = world({ fail: { "PATCH plane:rel-1/changelog/": 500 } });
  expect(String(await run(w).catch((e: unknown) => e))).toContain(
    "Writing the Plane release log failed",
  );
  w.fail = {};
  expect((await run(w)).outcome).toBe("updated");
  expect(w.changelogs["rel-1"]).toContain("Notes METRO-12");
});

test("METRO-14 a retraction still works when the tag itself is gone", async () => {
  const w = world();
  await run(w);
  w.github = null;
  w.sha = "";
  const deps = server(w);
  const gone: Deps = {
    ...deps,
    fetch: (url, init) =>
      url.includes("/commits/") ? Promise.resolve(reply(404)) : deps.fetch(url, init),
  };
  expect(await syncRelease(config, gone)).toBe("updated");
  expect(w.releases[0]).toMatchObject({ status: "unreleased" });
  expect(String(w.releases[0]?.["description_html"])).toContain("unknown (tag no longer exists)");
});

test("METRO-14 a published release whose tag does not resolve is an error", async () => {
  const w = world();
  const deps = server(w);
  const gone: Deps = {
    ...deps,
    fetch: (url, init) =>
      url.includes("/commits/") ? Promise.resolve(reply(404)) : deps.fetch(url, init),
  };
  await expectRejection(syncRelease(config, gone), "does not resolve to a commit");
});

test("METRO-14 duplicate Plane names are an error, never an arbitrary pick", async () => {
  const w = world({
    releases: [
      { id: "a", name: "v1.2.0", status: "unreleased" },
      { id: "b", name: "v1.2.0", status: "unreleased" },
    ],
  });
  await expectRejection(run(w), "2 releases named");
  const t = world({
    tags: [
      { id: "x", version: "v1.2.0" },
      { id: "y", version: "v1.2.0" },
    ],
  });
  await expectRejection(run(t), "2 release tags named");
});

test("METRO-14 a github-sourced release with another external id is not managed", async () => {
  const w = world({
    releases: [
      {
        id: "x",
        name: "v1.2.0",
        status: "released",
        external_source: "github",
        external_id: "v9.9.9",
      },
    ],
  });
  expect((await run(w)).outcome).toBe("skipped");
  expect(w.writes).toEqual([]);
});

test("METRO-14 Plane returning the tag as an object and the date as a datetime still converges", async () => {
  const w = world();
  await run(w);
  const release = onlyRelease(w);
  w.releases[0] = { ...release, tag: { id: release["tag"] }, release_date: null };
  w.writes.length = 0;
  expect((await run(w)).outcome).toBe("unchanged");
  const shipped = world({ deployments: [{ id: 1, states: ["success"] }] });
  await run(shipped);
  const r = onlyRelease(shipped);
  shipped.releases[0] = { ...r, release_date: "2026-11-04T00:00:00Z" };
  shipped.writes.length = 0;
  expect((await run(shipped)).outcome).toBe("unchanged");
});

test("METRO-14 a tag with control characters cannot inject into the log", () => {
  const evil = "v1.0.0\n::error::boom";
  let message = "";
  try {
    validateTag(evil);
  } catch (error) {
    message = String(error);
  }
  expect(message).not.toContain("\n::error::");
  expect(message).toContain("\\n::error::");
});

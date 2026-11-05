import { isRecord } from "./guards";
import { draftRelease, releaseDraftMain, validateTarget, type DraftConfig } from "./release-draft";
import type { Deps, FetchedResponse, FetchInit } from "./release-sync";
import { expectRejection } from "./test-support";

const KEY = "plane-secret-key-value";
const TOKEN = "gh-token-value";
const config: DraftConfig = {
  repository: "owner/repo",
  workspace: "ws",
  tag: "v1.2.0",
  target: "main",
  githubToken: TOKEN,
  planeKey: KEY,
  planeBase: "https://plane.test",
};

const reply = (status: number, body: unknown = {}): FetchedResponse => ({
  status,
  ok: status >= 200 && status < 300,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(""),
});

interface PlaneRelease extends Record<string, unknown> {
  id: string;
  name: string;
  status: string;
}
interface GithubRelease {
  tag_name: string;
  name?: string;
  draft: boolean;
}
interface World {
  planeReleases: PlaneRelease[];
  changelog: string;
  githubReleases: GithubRelease[];
  gitTags: string[];
  created: Record<string, unknown>[];
  fail: Record<string, number>;
}

const planned = (patch: Partial<PlaneRelease> = {}): PlaneRelease => ({
  id: "rel-1",
  name: "v1.2.0",
  status: "unreleased",
  external_source: null,
  external_id: null,
  is_prerelease: false,
  ...patch,
});

const world = (patch: Partial<World> = {}): World => ({
  planeReleases: [planned()],
  changelog: "<p>Plane log METRO-12</p>",
  githubReleases: [],
  gitTags: [],
  created: [],
  fail: {},
  ...patch,
});

function planePage(items: Record<string, unknown>[]) {
  return reply(200, { results: items, next_page_results: false, next_cursor: "100:1:0" });
}

function server(w: World): Deps & { calls: string[] } {
  const calls: string[] = [];
  const fetch = (url: string, init: FetchInit = {}): Promise<FetchedResponse> => {
    const method = init.method ?? "GET";
    const path = url
      .replace("https://api.github.com/repos/owner/repo", "gh:")
      .replace("https://plane.test/api/v1/workspaces/ws/releases/", "plane:");
    const full = `${method} ${path}`;
    calls.push(full);
    const forced = Object.entries(w.fail).find(([key]) => full.startsWith(key));
    if (forced !== undefined) return Promise.resolve(reply(forced[1]));
    if (method === "GET" && path.startsWith("plane:?"))
      return Promise.resolve(planePage(w.planeReleases));
    if (method === "GET" && /^plane:[^/]+\/changelog\/$/u.test(path))
      return Promise.resolve(reply(200, { changelog: { description_html: w.changelog } }));
    if (method === "GET" && path.startsWith("gh:/releases?")) {
      const page = Number(new URL(url).searchParams.get("page") ?? "1");
      return Promise.resolve(reply(200, w.githubReleases.slice((page - 1) * 100, page * 100)));
    }
    const ref = /^gh:\/git\/ref\/tags\/(.+)$/u.exec(path);
    if (method === "GET" && ref !== null)
      return Promise.resolve(
        reply(w.gitTags.includes(decodeURIComponent(ref[1] ?? "")) ? 200 : 404),
      );
    if (method === "POST" && path === "gh:/releases") {
      const parsed: unknown = typeof init.body === "string" ? JSON.parse(init.body) : {};
      w.created.push(isRecord(parsed) ? parsed : {});
      return Promise.resolve(reply(201, { html_url: "https://github.com/owner/repo/releases/x" }));
    }
    return Promise.resolve(reply(500));
  };
  return { fetch, log: () => {}, calls };
}

const run = (w: World, overrides: Partial<DraftConfig> = {}) => {
  const deps = server(w);
  return draftRelease({ ...config, ...overrides }, deps).then((outcome) => ({ outcome, deps }));
};

test("METRO-24 a Plane-only release yields exactly one draft with the Plane log as its body", async () => {
  const w = world();
  expect((await run(w)).outcome).toBe("created");
  expect(w.created).toEqual([
    {
      tag_name: "v1.2.0",
      name: "v1.2.0",
      target_commitish: "main",
      body: "<p>Plane log METRO-12</p>",
      draft: true,
      prerelease: false,
    },
  ]);
});

test("METRO-24 nothing but the single draft POST ever mutates: no publish, tag, edit or delete", async () => {
  const w = world();
  const { deps } = await run(w);
  const writes = deps.calls.filter((call) => !call.startsWith("GET "));
  expect(writes).toEqual(["POST gh:/releases"]);
  expect(w.created[0]?.["draft"]).toBe(true);
});

test("METRO-24 a replay creates nothing when a draft or a published release already exists", async () => {
  for (const draft of [true, false]) {
    const w = world({ githubReleases: [{ tag_name: "v1.2.0", draft }] });
    expect((await run(w)).outcome).toBe("unchanged");
    expect(w.created).toEqual([]);
  }
});

test("METRO-24 an existing release is found on a later page of the GitHub list", async () => {
  const others = Array.from({ length: 120 }, (_, i) => ({ tag_name: `v0.0.${i}`, draft: false }));
  const w = world({ githubReleases: [...others, { tag_name: "v1.2.0", draft: true }] });
  expect((await run(w)).outcome).toBe("unchanged");
  expect(w.created).toEqual([]);
});

test("METRO-24 a released or GitHub-linked Plane release is skipped and nothing is created", async () => {
  for (const patch of [
    { status: "released" },
    { external_source: "github", external_id: "v1.2.0" },
  ]) {
    const w = world({ planeReleases: [planned(patch)] });
    expect((await run(w)).outcome).toBe("skipped");
    expect(w.created).toEqual([]);
  }
});

test("METRO-24 a missing Plane release fails with a clear message and creates nothing", async () => {
  const w = world({ planeReleases: [planned({ name: "v9.9.9" })] });
  await expectRejection(run(w), "No Plane release named v1.2.0");
  expect(w.created).toEqual([]);
});

test("METRO-24 duplicate Plane names refuse instead of guessing", async () => {
  const w = world({ planeReleases: [planned(), planned({ id: "rel-2" })] });
  await expectRejection(run(w), "fix the duplicate first");
});

test("METRO-24 the prerelease flag follows Plane or the tag suffix", async () => {
  const fromPlane = world({ planeReleases: [planned({ is_prerelease: true })] });
  await run(fromPlane);
  expect(fromPlane.created[0]?.["prerelease"]).toBe(true);
  const fromTag = world({ planeReleases: [planned({ name: "v1.2.0-rc.1" })] });
  await run(fromTag, { tag: "v1.2.0-rc.1" });
  expect(fromTag.created[0]?.["prerelease"]).toBe(true);
});

test("METRO-24 an existing git tag is reported, not touched, and the draft is still created", async () => {
  const w = world({ gitTags: ["v1.2.0"] });
  const messages: string[] = [];
  const deps = { ...server(w), log: (m: string) => messages.push(m) };
  expect(await draftRelease(config, deps)).toBe("created");
  expect(messages.join("\n")).toContain("already exists");
  expect(deps.calls.filter((c) => !c.startsWith("GET "))).toEqual(["POST gh:/releases"]);
});

test("METRO-24 an empty Plane log gives an empty body and says so", async () => {
  const w = world({ changelog: "" });
  const messages: string[] = [];
  const deps = { ...server(w), log: (m: string) => messages.push(m) };
  await draftRelease(config, deps);
  expect(w.created[0]?.["body"]).toBe("");
  expect(messages.join("\n")).toContain("empty");
});

test("METRO-24 the target is passed through and validated", async () => {
  const w = world();
  await run(w, { target: "feature/metro-rebuild" });
  expect(w.created[0]?.["target_commitish"]).toBe("feature/metro-rebuild");
  for (const bad of ["", "a..b", "x y", "-rf", "a".repeat(101), "$(id)"])
    expect(() => validateTarget(bad)).toThrow("Target");
  expect(validateTarget("0123456789abcdef0123456789abcdef01234567")).toHaveLength(40);
});

test("METRO-24 a bad tag is refused before any request", async () => {
  const w = world();
  const deps = server(w);
  await expectRejection(draftRelease({ ...config, tag: "1.2.0" }, deps), "Tag must look like");
  expect(deps.calls).toEqual([]);
});

test("METRO-24 HTTP failures name the status and never the credentials", async () => {
  const cases: [string, number][] = [
    ["GET plane:?", 401],
    ["GET plane:rel-1/changelog/", 500],
    ["GET gh:/releases?", 403],
    ["GET gh:/git/ref/tags/", 502],
    ["POST gh:/releases", 422],
  ];
  for (const [prefix, status] of cases) {
    const w = world({ fail: { [prefix]: status } });
    const error = await run(w).then(
      () => new Error("did not fail"),
      (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
    );
    expect(error.message).toContain(`HTTP ${status}`);
    expect(error.message).not.toContain(KEY);
    expect(error.message).not.toContain(TOKEN);
  }
});

test("METRO-24 the entry point reads its inputs from the environment and reports failures without secrets", async () => {
  const w = world();
  const logs: string[] = [];
  const deps = { ...server(w), log: (m: string) => logs.push(m) };
  const env = {
    GITHUB_REPOSITORY: "owner/repo",
    PLANE_WORKSPACE: "ws",
    RELEASE_TAG: "v1.2.0",
    RELEASE_TARGET: "main",
    GITHUB_TOKEN: TOKEN,
    PLANE_API_KEY: KEY,
    PLANE_API_BASE: "https://plane.test",
  };
  await releaseDraftMain(env, deps);
  expect(logs.at(-1)).toBe("Release draft finished: created");
  expect(w.created).toHaveLength(1);
  const previous = process.exitCode;
  await releaseDraftMain({ ...env, PLANE_API_KEY: "" }, deps);
  expect(process.exitCode).toBe(1);
  process.exitCode = previous ?? 0;
});

test("METRO-24 a GitHub release list that never ends is a visible failure", async () => {
  const w = world({
    githubReleases: Array.from({ length: 2000 }, (_, i) => ({
      tag_name: `v0.0.${i}`,
      draft: false,
    })),
  });
  await expectRejection(run(w), "did not end after 20 pages");
});

test("METRO-24 a Plane release log without the documented shape is a visible failure", async () => {
  const w = world();
  const deps = server(w);
  const odd: Deps = {
    ...deps,
    fetch: (url, init) =>
      url.endsWith("changelog/")
        ? Promise.resolve(reply(200, { changelog: null }))
        : deps.fetch(url, init),
  };
  await expectRejection(draftRelease(config, odd), "no changelog object");
});

test("METRO-24 the entry point's default network and log edges are used when none are injected", async () => {
  const w = world();
  const deps = server(w);
  const original = globalThis.fetch;
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  Reflect.set(globalThis, "fetch", (url: string, init?: FetchInit) => deps.fetch(url, init));
  try {
    await releaseDraftMain({
      GITHUB_REPOSITORY: "owner/repo",
      PLANE_WORKSPACE: "ws",
      RELEASE_TAG: "v1.2.0",
      GITHUB_TOKEN: TOKEN,
      PLANE_API_KEY: KEY,
      PLANE_API_BASE: "https://plane.test",
    });
    expect(w.created[0]?.["target_commitish"]).toBe("main");
    expect(String(log.mock.calls.at(-1)?.[0])).toBe("Release draft finished: created");
  } finally {
    Reflect.set(globalThis, "fetch", original);
    log.mockRestore();
  }
});

test("METRO-24 a release log that was never written (null html) drafts an empty body", async () => {
  const w = world();
  const deps = server(w);
  const unwritten: Deps = {
    ...deps,
    fetch: (url, init) =>
      url.endsWith("changelog/")
        ? Promise.resolve(reply(200, { changelog: { description_html: null } }))
        : deps.fetch(url, init),
  };
  expect(await draftRelease(config, unwritten)).toBe("created");
  expect(w.created[0]?.["body"]).toBe("");
});

test("METRO-24 a hand-made untagged draft with the same name still counts as existing", async () => {
  const w = world({
    githubReleases: [{ tag_name: "untagged-3f2a", name: "v1.2.0", draft: true }],
  });
  expect((await run(w)).outcome).toBe("unchanged");
  expect(w.created).toEqual([]);
});

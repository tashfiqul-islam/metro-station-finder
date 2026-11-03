import { createHash } from "node:crypto";

import { isRecord } from "./guards.ts";

/**
 * Syncs one GitHub release to Plane: the release, its release tag (git tag and commit) and its
 * release log (changelog). METRO-14, docs/specifications/release-sync.md. It reads current GitHub
 * state for the tag, so replays and out-of-order events converge. Decisions are pure functions;
 * the HTTP edges take an injectable `fetch`.
 */

const TAG = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z][0-9A-Za-z.-]*)?$/u;

export function validateTag(tag: string): string {
  if (!TAG.test(tag)) throw new Error(`Tag must look like v1.2.3 or v1.2.3-rc.1, got "${tag}"`);
  return tag;
}

export interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}
export interface FetchedResponse {
  status: number;
  ok: boolean;
  json(): Promise<unknown>;
  text(): Promise<string>;
}
export type Fetch = (url: string, init?: FetchInit) => Promise<FetchedResponse>;

export interface Config {
  repository: string;
  workspace: string;
  tag: string;
  githubToken: string;
  planeKey: string;
  planeBase?: string;
}
export interface Deps {
  fetch: Fetch;
  log: (message: string) => void;
}

export interface GithubRelease {
  tag: string;
  url: string;
  body: string;
  prerelease: boolean;
  publishedAt: string;
}

export interface PlaneRelease {
  id: string;
  name: string;
  status: string;
  releaseDate: string | null;
  isPrerelease: boolean;
  externalSource: string | null;
  externalId: string | null;
  tagId: string | null;
}

export interface PlaneTag {
  id: string;
  version: string;
  gitTag: string | null;
  commitHash: string | null;
  description: string;
}

export interface References {
  tickets: string[];
  pulls: number[];
  deferred: boolean;
}

/** METRO tickets, pull requests and a "Deferred" heading mentioned in release notes. */
export function extractReferences(body: string): References {
  const tickets = [...new Set([...body.matchAll(/\bMETRO-(\d+)\b/gu)].map((m) => `METRO-${m[1]}`))];
  tickets.sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  const pulls = [
    ...new Set([...body.matchAll(/(?:\/pull\/|(?<![\w&])#)(\d+)\b/gu)].map((m) => Number(m[1]))),
  ];
  pulls.sort((a, b) => a - b);
  return { tickets, pulls, deferred: /^#{1,6}\s*deferred\b/imu.test(body) };
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** The Plane release description: facts that identify the release, in a stable order. */
export function renderDescription(tag: string, sha: string, release: GithubRelease | null): string {
  if (release === null) {
    return `<p>GitHub release ${escapeHtml(tag)} is not published (deleted, unpublished or a draft). Commit: ${escapeHtml(sha)}. Status reset by release sync.</p>`;
  }
  const refs = extractReferences(release.body);
  const tickets = refs.tickets.length > 0 ? refs.tickets.join(", ") : "none found";
  const pulls = refs.pulls.length > 0 ? refs.pulls.map((n) => `#${n}`).join(", ") : "none found";
  return [
    `<p>GitHub release ${escapeHtml(tag)}${release.prerelease ? " (prerelease)" : ""}, synced from GitHub.</p>`,
    `<p>Commit: ${escapeHtml(sha)}.</p>`,
    `<p><a href="${escapeHtml(release.url)}">GitHub release is the source of truth</a></p>`,
    `<p>Tickets: ${tickets}. Pull requests: ${pulls}. Deferred section: ${refs.deferred ? "present" : "missing"}.</p>`,
  ].join("");
}

const HASH_PREFIX = "sync-hash:";

export function contentHash(parts: readonly string[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function tagDescription(release: GithubRelease, hash: string): string {
  return `Synced from GitHub release ${release.url}. ${HASH_PREFIX}${hash}`;
}

export function hashOf(description: string): string | null {
  const index = description.lastIndexOf(HASH_PREFIX);
  return index < 0 ? null : description.slice(index + HASH_PREFIX.length).trim();
}

interface ReleasePatch {
  name: string;
  status: string;
  release_date: string | null;
  is_prerelease: boolean;
  external_source: string;
  external_id: string;
  description_html: string;
  tag?: string;
}

/** A Plane release the sync may write: its own, or the not-yet-linked planned one. */
export function isManaged(existing: PlaneRelease): boolean {
  return (
    existing.externalSource === "github" ||
    (existing.status === "unreleased" && existing.externalSource === null)
  );
}

export interface Content {
  /** HTML of the GitHub notes, rendered by GitHub. */
  changelogHtml: string;
  hash: string;
}

interface DecideInput {
  tag: string;
  sha: string;
  release: GithubRelease | null;
  deployed: boolean;
  existing: PlaneRelease | undefined;
  existingTag: PlaneTag | undefined;
  content: Content | null;
}

export type Decision =
  | { kind: "skip"; reason: string }
  | { kind: "unchanged" }
  | {
      kind: "write";
      create: boolean;
      releaseId: string | null;
      patch: ReleasePatch;
      writeTag: boolean;
      writeChangelog: boolean;
    };

export function decide(input: DecideInput): Decision {
  const { tag, sha, release, deployed, existing, existingTag, content } = input;
  if (existing !== undefined && !isManaged(existing)) {
    return { kind: "skip", reason: `${tag} is already released in Plane and not managed by sync` };
  }
  if (release === null && existing === undefined) {
    return { kind: "skip", reason: `no published GitHub release and no Plane release for ${tag}` };
  }
  const shipped = release !== null && !release.prerelease && deployed;
  const patch: ReleasePatch = {
    name: tag,
    status: shipped ? "released" : "unreleased",
    release_date: shipped && release !== null ? release.publishedAt.slice(0, 10) : null,
    is_prerelease: release?.prerelease ?? false,
    external_source: "github",
    external_id: tag,
    description_html: renderDescription(tag, sha, release),
  };
  // A retraction leaves the tag and the log alone; a publication refreshes them when GitHub changed.
  const wantTag = release !== null && content !== null;
  const tagCurrent =
    !wantTag ||
    (existingTag !== undefined &&
      existingTag.gitTag === tag &&
      existingTag.commitHash === sha &&
      hashOf(existingTag.description) === content.hash);
  const scalarsSame =
    existing !== undefined &&
    existing.status === patch.status &&
    existing.releaseDate === patch.release_date &&
    existing.isPrerelease === patch.is_prerelease &&
    existing.externalSource === patch.external_source &&
    existing.externalId === patch.external_id &&
    (!wantTag || (existingTag !== undefined && existing.tagId === existingTag.id));
  if (scalarsSame && tagCurrent) return { kind: "unchanged" };
  return {
    kind: "write",
    create: existing === undefined,
    releaseId: existing?.id ?? null,
    patch,
    writeTag: wantTag && !tagCurrent,
    writeChangelog: wantTag && !tagCurrent,
  };
}

// ---- HTTP edges ---------------------------------------------------------------------------------

function field(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function fail(what: string, response: FetchedResponse): never {
  throw new Error(`${what} failed with HTTP ${response.status}`);
}

const GITHUB_HEADERS = (token: string): Record<string, string> => ({
  accept: "application/vnd.github+json",
  authorization: `Bearer ${token}`,
  "x-github-api-version": "2022-11-28",
});

async function githubGet(config: Config, deps: Deps, path: string): Promise<FetchedResponse> {
  return deps.fetch(`https://api.github.com/repos/${config.repository}${path}`, {
    headers: GITHUB_HEADERS(config.githubToken),
  });
}

export async function fetchGithubRelease(
  config: Config,
  deps: Deps,
): Promise<GithubRelease | null> {
  const response = await githubGet(
    config,
    deps,
    `/releases/tags/${encodeURIComponent(config.tag)}`,
  );
  if (response.status === 404) return null;
  if (!response.ok) return fail("Reading the GitHub release", response);
  const data: unknown = await response.json();
  if (!isRecord(data)) throw new Error("GitHub release response was not an object");
  if (data["draft"] === true) return null;
  const url = field(data, "html_url");
  const publishedAt = field(data, "published_at");
  if (url === null || publishedAt === null)
    throw new Error("GitHub release response lacks html_url or published_at");
  return {
    tag: config.tag,
    url,
    body: field(data, "body") ?? "",
    prerelease: data["prerelease"] === true,
    publishedAt,
  };
}

export async function resolveSha(config: Config, deps: Deps): Promise<string> {
  const response = await githubGet(config, deps, `/commits/${encodeURIComponent(config.tag)}`);
  if (!response.ok) return fail(`Resolving the commit of ${config.tag}`, response);
  const data: unknown = await response.json();
  const sha = isRecord(data) ? field(data, "sha") : null;
  if (sha === null || !/^[0-9a-f]{40}$/u.test(sha))
    throw new Error(`Commit response for ${config.tag} has no valid sha`);
  return sha;
}

/** True when the newest status of some `production` deployment of this SHA is `success`. */
export async function hasProductionDeployment(
  config: Config,
  deps: Deps,
  sha: string,
): Promise<boolean> {
  const list = await githubGet(
    config,
    deps,
    `/deployments?sha=${sha}&environment=production&per_page=10`,
  );
  if (!list.ok) return fail("Listing deployments", list);
  const deployments: unknown = await list.json();
  if (!Array.isArray(deployments)) throw new Error("Deployments response was not a list");
  for (const deployment of deployments as unknown[]) {
    const id = isRecord(deployment) ? deployment["id"] : undefined;
    if (typeof id !== "number") continue;
    const statuses = await githubGet(config, deps, `/deployments/${id}/statuses?per_page=1`);
    if (!statuses.ok) return fail("Reading a deployment status", statuses);
    const latest: unknown = await statuses.json();
    const first: unknown = Array.isArray(latest) ? (latest as unknown[])[0] : undefined;
    if (isRecord(first) && first["state"] === "success") return true;
  }
  return false;
}

/** Renders release notes to sanitized HTML with GitHub's own markdown API. */
export async function renderNotes(config: Config, deps: Deps, notes: string): Promise<string> {
  const response = await deps.fetch("https://api.github.com/markdown", {
    method: "POST",
    headers: { ...GITHUB_HEADERS(config.githubToken), "content-type": "application/json" },
    body: JSON.stringify({ text: notes, mode: "gfm", context: config.repository }),
  });
  if (!response.ok) return fail("Rendering the release notes", response);
  return response.text();
}

function planeUrl(config: Config, suffix: string): string {
  const base = config.planeBase ?? "https://api.plane.so";
  return `${base}/api/v1/workspaces/${encodeURIComponent(config.workspace)}/releases/${suffix}`;
}

async function planeRequest(
  config: Config,
  deps: Deps,
  url: string,
  method: string,
  body?: unknown,
): Promise<FetchedResponse> {
  return deps.fetch(url, {
    method,
    headers: { "x-api-key": config.planeKey, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** Walks a Plane cursor-paginated list and returns the first item `pick` accepts. */
async function planeFind<T>(
  config: Config,
  deps: Deps,
  suffix: string,
  what: string,
  pick: (raw: unknown) => T | null,
): Promise<T | undefined> {
  let cursor = "";
  for (let page = 0; page < 20; page += 1) {
    const query = `?per_page=100${cursor === "" ? "" : `&cursor=${encodeURIComponent(cursor)}`}`;
    const response = await planeRequest(config, deps, planeUrl(config, `${suffix}${query}`), "GET");
    if (!response.ok) return fail(`Listing Plane ${what}`, response);
    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data["results"]))
      throw new Error(`Plane ${what} list had an unexpected shape`);
    for (const raw of data["results"] as unknown[]) {
      const found = pick(raw);
      if (found !== null) return found;
    }
    const next = field(data, "next_cursor");
    if (data["next_page_results"] !== true || next === null) return undefined;
    cursor = next;
  }
  throw new Error(`Plane ${what} list did not end after 20 pages`);
}

export function toRelease(raw: unknown, name: string): PlaneRelease | null {
  if (!isRecord(raw) || field(raw, "name") !== name) return null;
  const id = field(raw, "id");
  const status = field(raw, "status");
  if (id === null || status === null) return null;
  return {
    id,
    name,
    status,
    releaseDate: field(raw, "release_date"),
    isPrerelease: raw["is_prerelease"] === true,
    externalSource: field(raw, "external_source"),
    externalId: field(raw, "external_id"),
    tagId: field(raw, "tag"),
  };
}

export function toTag(raw: unknown, version: string): PlaneTag | null {
  if (!isRecord(raw) || field(raw, "version") !== version) return null;
  const id = field(raw, "id");
  if (id === null) return null;
  return {
    id,
    version,
    gitTag: field(raw, "git_tag"),
    commitHash: field(raw, "commit_hash"),
    description: field(raw, "description") ?? "",
  };
}

async function writeTag(
  config: Config,
  deps: Deps,
  existing: PlaneTag | undefined,
  sha: string,
  description: string,
): Promise<string> {
  const body = { version: config.tag, git_tag: config.tag, commit_hash: sha, description };
  const response =
    existing === undefined
      ? await planeRequest(config, deps, planeUrl(config, "tags/"), "POST", body)
      : await planeRequest(
          config,
          deps,
          planeUrl(config, `tags/${encodeURIComponent(existing.id)}/`),
          "PATCH",
          body,
        );
  if (!response.ok) return fail("Writing the Plane release tag", response);
  const data: unknown = await response.json();
  const id = isRecord(data) ? field(data, "id") : null;
  if (id === null) throw new Error("Plane release tag response has no id");
  return id;
}

export type Outcome = "created" | "updated" | "unchanged" | "skipped";

export async function syncRelease(config: Config, deps: Deps): Promise<Outcome> {
  validateTag(config.tag);
  const release = await fetchGithubRelease(config, deps);
  const sha = await resolveSha(config, deps);
  const existing = await planeFind(config, deps, "", "releases", (raw) =>
    toRelease(raw, config.tag),
  );
  const existingTag = await planeFind(config, deps, "tags/", "release tags", (raw) =>
    toTag(raw, config.tag),
  );
  const deployed =
    release !== null && !release.prerelease
      ? await hasProductionDeployment(config, deps, sha)
      : false;
  if (release !== null && !release.prerelease && !deployed) {
    deps.log(
      `No successful production deployment for ${sha}; ${config.tag} stays unreleased in Plane.`,
    );
  }
  let content: Content | null = null;
  if (release !== null) {
    const changelogHtml = await renderNotes(config, deps, release.body);
    content = {
      changelogHtml,
      hash: contentHash([sha, release.url, String(release.prerelease), release.body]),
    };
  }
  const decision = decide({
    tag: config.tag,
    sha,
    release,
    deployed,
    existing,
    existingTag,
    content,
  });
  if (decision.kind === "skip") {
    deps.log(`Skipped: ${decision.reason}.`);
    return "skipped";
  }
  if (decision.kind === "unchanged") {
    deps.log(`Plane release ${config.tag} already matches GitHub.`);
    return "unchanged";
  }
  const patch = { ...decision.patch };
  if (decision.writeTag && release !== null && content !== null) {
    patch.tag = await writeTag(
      config,
      deps,
      existingTag,
      sha,
      tagDescription(release, content.hash),
    );
  } else if (existingTag !== undefined && release !== null) {
    patch.tag = existingTag.id;
  }
  const response =
    decision.releaseId === null
      ? await planeRequest(config, deps, planeUrl(config, ""), "POST", patch)
      : await planeRequest(
          config,
          deps,
          planeUrl(config, `${encodeURIComponent(decision.releaseId)}/`),
          "PATCH",
          patch,
        );
  if (!response.ok)
    return fail(
      decision.create ? "Creating the Plane release" : "Updating the Plane release",
      response,
    );
  let releaseId = decision.releaseId;
  if (releaseId === null) {
    const created: unknown = await response.json();
    releaseId = isRecord(created) ? field(created, "id") : null;
    if (releaseId === null) throw new Error("Plane release response has no id");
  }
  if (decision.writeChangelog && content !== null) {
    const log = await planeRequest(
      config,
      deps,
      planeUrl(config, `${encodeURIComponent(releaseId)}/changelog/`),
      "PATCH",
      { description_html: content.changelogHtml },
    );
    if (!log.ok) return fail("Writing the Plane release log", log);
  }
  deps.log(
    `${decision.create ? "Created" : "Updated"} Plane release ${config.tag} (${patch.status}).`,
  );
  return decision.create ? "created" : "updated";
}

/** Process entry. The tag and credentials come from the environment, never from the command line. */
export async function releaseSyncMain(
  env: Readonly<Record<string, string | undefined>>,
  deps: Deps = { fetch: (url, init) => fetch(url, init), log: (m) => console.log(m) },
): Promise<void> {
  try {
    const required = (name: string): string => {
      const value = env[name];
      if (value === undefined || value.trim() === "")
        throw new Error(`${name} is required (set it on the sync step)`);
      return value;
    };
    const planeBase = env["PLANE_API_BASE"];
    const outcome = await syncRelease(
      {
        ...(planeBase === undefined || planeBase.trim() === ""
          ? {}
          : { planeBase: planeBase.trim() }),
        repository: required("GITHUB_REPOSITORY"),
        workspace: required("PLANE_WORKSPACE"),
        tag: required("RELEASE_TAG"),
        githubToken: required("GITHUB_TOKEN"),
        planeKey: required("PLANE_API_KEY"),
      },
      deps,
    );
    deps.log(`Release sync finished: ${outcome}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.main) await releaseSyncMain(process.env);

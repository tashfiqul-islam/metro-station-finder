import { isRecord } from "./guards.ts";
import {
  fail,
  field,
  githubGet,
  GITHUB_HEADERS,
  planeFindAll,
  planeRequest,
  planeUrl,
  single,
  toRelease,
  validateTag,
  type Config,
  type Deps,
} from "./release-sync.ts";

/**
 * Creates one DRAFT GitHub release for a Plane release that has no GitHub release yet.
 * METRO-24, docs/specifications/release-draft.md. The only mutating request is the draft POST: it
 * never publishes, never touches a git tag, and never writes to Plane. Publishing the draft starts
 * METRO-14's sync, which carries the return direction.
 */

export interface DraftConfig extends Config {
  /** Branch or SHA the draft will tag when it is published (GitHub ignores it if the tag exists). */
  target: string;
}

export type DraftOutcome = "created" | "unchanged" | "skipped";

const TARGET = /^[A-Za-z0-9._/-]{1,100}$/u;

export function validateTarget(target: string): string {
  if (!TARGET.test(target) || target.includes("..") || target.startsWith("-"))
    throw new Error(
      `Target must be a branch name or SHA (letters, digits . _ - /, no "..", at most 100), got ${JSON.stringify(target)}`,
    );
  return target;
}

/** True when GitHub has any release, draft or published, for the tag. The tag lookup hides drafts. */
async function githubReleaseExists(config: DraftConfig, deps: Deps): Promise<boolean> {
  for (let page = 1; page <= 20; page += 1) {
    const response = await githubGet(config, deps, `/releases?per_page=100&page=${page}`);
    if (!response.ok) return fail("Listing GitHub releases", response);
    const releases: unknown = await response.json();
    if (!Array.isArray(releases)) throw new Error("GitHub releases response was not a list");
    const items = releases as unknown[];
    // A draft made in the GitHub UI without a chosen tag is listed as `untagged-…`; its name still matches.
    if (
      items.some((r) => isRecord(r) && (r["tag_name"] === config.tag || r["name"] === config.tag))
    )
      return true;
    if (items.length === 0) return false;
  }
  throw new Error("GitHub release list did not end after 20 pages");
}

async function gitTagExists(config: DraftConfig, deps: Deps): Promise<boolean> {
  const response = await githubGet(config, deps, `/git/ref/tags/${encodeURIComponent(config.tag)}`);
  if (response.status === 404) return false;
  if (!response.ok) return fail("Looking up the git tag", response);
  return true;
}

async function readPlaneLog(config: DraftConfig, deps: Deps, releaseId: string): Promise<string> {
  const response = await planeRequest(
    config,
    deps,
    planeUrl(config, `${encodeURIComponent(releaseId)}/changelog/`),
    "GET",
  );
  if (!response.ok) return fail("Reading the Plane release log", response);
  const data: unknown = await response.json();
  const log = isRecord(data) ? data["changelog"] : undefined;
  if (!isRecord(log)) throw new Error("Plane release log response has no changelog object");
  // A log nobody has written yet has no HTML (null or empty); that is a valid, empty log.
  return field(log, "description_html") ?? "";
}

export async function draftRelease(config: DraftConfig, deps: Deps): Promise<DraftOutcome> {
  validateTag(config.tag);
  validateTarget(config.target);
  const plane = single(
    await planeFindAll(config, deps, "", "releases", (raw) => toRelease(raw, config.tag)),
    "releases",
    config.tag,
  );
  if (plane === undefined) throw new Error(`No Plane release named ${config.tag}`);
  if (plane.status !== "unreleased" || plane.externalSource !== null) {
    deps.log(
      `Skipped: Plane release ${config.tag} is ${plane.status}${plane.externalSource === null ? "" : ` and linked to ${plane.externalSource}`}; only an unlinked, unreleased release gets a draft.`,
    );
    return "skipped";
  }
  if (await githubReleaseExists(config, deps)) {
    deps.log(`GitHub already has a release for ${config.tag}; nothing to create.`);
    return "unchanged";
  }
  const body = await readPlaneLog(config, deps, plane.id);
  if (body.trim() === "")
    deps.log(`The Plane release log for ${config.tag} is empty; the draft body is empty.`);
  if (await gitTagExists(config, deps))
    deps.log(
      `Git tag ${config.tag} already exists; the draft will use it and ${config.target} is ignored. The tag is not touched.`,
    );
  const response = await deps.fetch(`https://api.github.com/repos/${config.repository}/releases`, {
    method: "POST",
    headers: { ...GITHUB_HEADERS(config.githubToken), "content-type": "application/json" },
    body: JSON.stringify({
      tag_name: config.tag,
      name: config.tag,
      target_commitish: config.target,
      body,
      draft: true,
      prerelease: plane.isPrerelease || config.tag.includes("-"),
    }),
  });
  if (!response.ok) return fail("Creating the draft GitHub release", response);
  deps.log(
    `Created a draft GitHub release for ${config.tag}. Review it, then publish it on GitHub.`,
  );
  return "created";
}

/** Process entry. Inputs and credentials come from the environment, never from the command line. */
export async function releaseDraftMain(
  env: Readonly<Record<string, string | undefined>>,
  deps: Deps = { fetch: (url, init) => fetch(url, init), log: (m) => console.log(m) },
): Promise<void> {
  try {
    const required = (name: string): string => {
      const value = env[name];
      if (value === undefined || value.trim() === "")
        throw new Error(`${name} is required (set it on the draft step)`);
      return value;
    };
    const planeBase = env["PLANE_API_BASE"]?.trim() ?? "";
    const outcome = await draftRelease(
      {
        ...(planeBase === "" ? {} : { planeBase }),
        repository: required("GITHUB_REPOSITORY"),
        workspace: required("PLANE_WORKSPACE"),
        tag: required("RELEASE_TAG"),
        target: env["RELEASE_TARGET"]?.trim() || "main",
        githubToken: required("GITHUB_TOKEN"),
        planeKey: required("PLANE_API_KEY"),
      },
      deps,
    );
    deps.log(`Release draft finished: ${outcome}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.main) await releaseDraftMain(process.env);

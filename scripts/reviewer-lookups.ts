import { isRecord } from "./guards.ts";

/**
 * GitHub REST reads for the Reviewer record check (METRO-134). Read-only: `pull-requests: read` with
 * `github.token`. Everything a response carries is untrusted data: it is only shape-checked here and the
 * caller never echoes it. A failure throws a LookupError carrying only an HTTP status, never response text.
 */

export type RecordKind = "issuecomment" | "pullrequestreview";

/** A comment or review as far as the check needs it: its text and the API URL of the thing it belongs to. */
export interface RecordText {
  readonly body: string;
  readonly target: string;
}

export interface PrCommit {
  readonly sha: string;
  readonly parents: readonly string[];
}

export interface Lookups {
  readonly record: (kind: RecordKind, id: string) => Promise<RecordText>;
  /** Commits of the pull request. GitHub lists at most 250. */
  readonly commits: () => Promise<readonly PrCommit[]>;
  /** True when the commit is an ancestor of (or equal to) the pull request's base commit. */
  readonly isBaseAncestor: (sha: string) => Promise<boolean>;
}

export interface PullRef {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
  readonly base: string;
}

export interface FetchedJson {
  readonly ok: boolean;
  readonly status: number;
  readonly json: () => Promise<unknown>;
}
export type FetchJson = (
  url: string,
  init: { readonly headers: Record<string, string>; readonly signal?: AbortSignal },
) => Promise<FetchedJson>;

/** A failed lookup. `status` is the HTTP status, or 0 when the request or the response shape failed. */
export class LookupError extends Error {
  readonly status: number;
  constructor(status: number) {
    super("GitHub lookup failed");
    this.status = status;
  }
}

const API = "https://api.github.com";
const PAGE_SIZE = 100;
/** GitHub returns at most 250 commits for a pull request: three pages of 100. */
const MAX_PAGES = 3;
const TIMEOUT_MS = 15_000;

function field(value: Record<string, unknown>, name: string): string {
  const found = value[name];
  if (typeof found !== "string") throw new LookupError(0);
  return found;
}

function toCommit(value: unknown): PrCommit {
  if (!isRecord(value) || !Array.isArray(value["parents"])) throw new LookupError(0);
  const parents = (value["parents"] as unknown[]).map((parent) => {
    if (!isRecord(parent)) throw new LookupError(0);
    return field(parent, "sha");
  });
  return { sha: field(value, "sha"), parents };
}

/**
 * Lookups over REST. `owner`, `repo`, `number` and `base` must already be validated (no path characters),
 * and `id` and `sha` arguments come from digit-only or hex-only matches.
 */
export function createLookups(fetchJson: FetchJson, token: string, pull: PullRef): Lookups {
  const repoPath = `/repos/${pull.owner}/${pull.repo}`;
  const get = async (path: string): Promise<unknown> => {
    const response = await fetchJson(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "metro-reviewer-record",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new LookupError(response.status);
    return response.json();
  };
  return {
    async record(kind, id) {
      const path =
        kind === "issuecomment"
          ? `${repoPath}/issues/comments/${id}`
          : `${repoPath}/pulls/${pull.number}/reviews/${id}`;
      const data = await get(path);
      if (!isRecord(data)) throw new LookupError(0);
      const body = data["body"] ?? "";
      if (typeof body !== "string") throw new LookupError(0);
      return {
        body,
        target: field(data, kind === "issuecomment" ? "issue_url" : "pull_request_url"),
      };
    },
    async commits() {
      const commits: PrCommit[] = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const data = await get(
          `${repoPath}/pulls/${pull.number}/commits?per_page=${PAGE_SIZE}&page=${page}`,
        );
        if (!Array.isArray(data)) throw new LookupError(0);
        commits.push(...(data as unknown[]).map(toCommit));
        if (data.length < PAGE_SIZE) break;
      }
      return commits;
    },
    async isBaseAncestor(sha) {
      const data = await get(`${repoPath}/compare/${sha}...${pull.base}?per_page=1`);
      if (!isRecord(data)) throw new LookupError(0);
      const status = field(data, "status");
      // Base is ahead of (or identical to) the commit exactly when the commit is an ancestor of base.
      return status === "ahead" || status === "identical";
    },
  };
}

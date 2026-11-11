import { readFileSync } from "node:fs";

import { isRecord } from "./guards.ts";

/**
 * Moves a planning ticket's project Status when a pull request in this repository changes
 * (metro-station-finder/planning#153, docs/agents/tracker.md):
 *
 * - opened, reopened or ready for review (not a draft): In Review;
 * - merged: Done, and the issue is closed as completed;
 * - closed without merging: back to In Progress, only when it was In Review.
 *
 * A Done or Cancelled ticket is never moved back. The ticket comes from the PR body's `Ticket ID:` line or the
 * branch name `ticket/metro-N-...`; when they disagree nothing is written and the job fails. No reference is not
 * an error: the job notes it and writes nothing.
 *
 * The event payload is untrusted: the body is only matched by bounded patterns, never echoed. The token is a
 * GitHub App installation token limited to the planning repository; it is only ever a request header. Every
 * message is fixed text plus numbers, so neither the body nor an API response can reach the log.
 */

export const OWNER = "metro-station-finder";
export const REPO = "planning";
export const PROJECT_NUMBER = 1;
export type Status = "In Progress" | "In Review" | "Done";

const API = "https://api.github.com";
/** The only accepted body line: `- Ticket ID: metro-station-finder/planning#N`, optional list marker. */
const TICKET_LINE =
  /^[ \t]{0,3}(?:[-*][ \t]+)?Ticket ID:[ \t]*metro-station-finder\/planning#([1-9]\d{0,5})[ \t]*$/gmu;
const BRANCH = /^ticket\/metro-([1-9]\d{0,5})-[a-z0-9][a-z0-9-]{0,80}$/u;
/** GitHub caps a body at 65,536 characters; anything longer is not scanned. */
const MAX_BODY = 65_536;
const FINAL = new Set(["Done", "Cancelled"]);

export interface PullEvent {
  readonly action: string;
  readonly number: number;
  readonly draft: boolean;
  readonly merged: boolean;
  readonly body: string;
  readonly branch: string;
}

/** A failure with a fixed, safe message. */
export class SyncError extends Error {}

/** Reads the fields the sync needs from a `pull_request` event payload; anything else is ignored. */
export function readEvent(payload: unknown): PullEvent {
  const pull = isRecord(payload) ? payload["pull_request"] : undefined;
  if (!isRecord(payload) || typeof payload["action"] !== "string" || !isRecord(pull))
    throw new SyncError("The event is not a pull_request event");
  const head = isRecord(pull["head"]) ? pull["head"] : {};
  const number = pull["number"];
  if (typeof number !== "number" || !Number.isSafeInteger(number) || number < 1)
    throw new SyncError("The event has no pull request number");
  return {
    action: payload["action"],
    number,
    draft: pull["draft"] === true,
    merged: pull["merged"] === true,
    body: typeof pull["body"] === "string" ? pull["body"] : "",
    branch: typeof head["ref"] === "string" ? head["ref"] : "",
  };
}

export type TicketRef =
  | { readonly kind: "none" }
  | { readonly kind: "ticket"; readonly number: number }
  | { readonly kind: "conflict" };

/** Every distinct ticket the body and branch name; more than one is a conflict, none is "none". */
export function findTicket(body: string, branch: string): TicketRef {
  const found = new Set<number>();
  if (body.length <= MAX_BODY)
    for (const match of body.matchAll(TICKET_LINE)) found.add(Number(match[1]));
  const fromBranch = BRANCH.exec(branch);
  if (fromBranch !== null) found.add(Number(fromBranch[1]));
  if (found.size > 1) return { kind: "conflict" };
  const [number] = found;
  return number === undefined ? { kind: "none" } : { kind: "ticket", number };
}

/** The Status an event asks for, or undefined when the event moves nothing. */
export function targetFor(event: PullEvent): Status | "Reopen" | undefined {
  if (event.action === "closed") return event.merged ? "Done" : "Reopen";
  if (["opened", "reopened", "ready_for_review"].includes(event.action) && !event.draft)
    return "In Review";
  return undefined;
}

export interface Response {
  readonly ok: boolean;
  readonly status: number;
  readonly text: () => Promise<string>;
}
export type Http = (
  url: string,
  init: {
    readonly method: "GET" | "POST" | "PATCH";
    readonly headers: Record<string, string>;
    readonly body?: string;
    readonly redirect: "error";
  },
) => Promise<Response>;

export interface Ticket {
  readonly issueId: string;
  readonly open: boolean;
  readonly itemId: string | undefined;
  readonly status: string | undefined;
}

export interface Board {
  readonly projectId: string;
  readonly fieldId: string;
  readonly options: ReadonlyMap<string, string>;
}

/** The GitHub calls the sync makes. Every failure is a SyncError naming the call and the HTTP status. */
export interface Tracker {
  readonly ticket: (number: number) => Promise<Ticket | null>;
  readonly board: () => Promise<Board>;
  readonly setStatus: (board: Board, itemId: string, status: Status) => Promise<void>;
  readonly close: (number: number) => Promise<void>;
}

async function send(
  http: Http,
  token: string,
  what: string,
  url: string,
  method: "POST" | "PATCH",
  payload: unknown,
): Promise<unknown> {
  let response: Response;
  try {
    response = await http(url, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(payload),
      redirect: "error",
    });
  } catch {
    throw new SyncError(`${what} failed: no response`);
  }
  if (!response.ok) throw new SyncError(`${what} failed: HTTP ${response.status}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await response.text());
  } catch {
    throw new SyncError(`${what} failed: the response is not JSON`);
  }
  // GraphQL reports errors with HTTP 200.
  if (isRecord(parsed) && parsed["errors"] !== undefined)
    throw new SyncError(`${what} failed: GraphQL error`);
  return parsed;
}

function path(value: unknown, ...keys: string[]): unknown {
  let current = value;
  for (const key of keys) current = isRecord(current) ? current[key] : undefined;
  return current;
}

function nodes(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as unknown[]).filter(isRecord) : [];
}

const TICKET_QUERY = `query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){issue(number:$number){id state projectItems(first:20){nodes{id project{owner{...on Organization{login}} number} status:fieldValueByName(name:"Status"){...on ProjectV2ItemFieldSingleSelectValue{name}}}}}}}`;
const BOARD_QUERY = `query($owner:String!,$number:Int!){organization(login:$owner){projectV2(number:$number){id field(name:"Status"){...on ProjectV2SingleSelectField{id options{id name}}}}}}`;
const SET_STATUS = `mutation($project:ID!,$item:ID!,$field:ID!,$option:String!){updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:{singleSelectOptionId:$option}}){clientMutationId}}`;

export function createTracker(http: Http, token: string): Tracker {
  const graphql = (what: string, query: string, variables: Record<string, unknown>) =>
    send(http, token, what, `${API}/graphql`, "POST", { query, variables });
  return {
    async ticket(number) {
      const data = await graphql("Reading the ticket", TICKET_QUERY, {
        owner: OWNER,
        repo: REPO,
        number,
      });
      const issue = path(data, "data", "repository", "issue");
      if (!isRecord(issue) || typeof issue["id"] !== "string") return null;
      const item = nodes(path(issue, "projectItems", "nodes")).find(
        (node) =>
          path(node, "project", "owner", "login") === OWNER &&
          path(node, "project", "number") === PROJECT_NUMBER,
      );
      const status = path(item, "status", "name");
      return {
        issueId: issue["id"],
        open: issue["state"] === "OPEN",
        itemId: typeof item?.["id"] === "string" ? item["id"] : undefined,
        status: typeof status === "string" ? status : undefined,
      };
    },
    async board() {
      const data = await graphql("Reading the project", BOARD_QUERY, {
        owner: OWNER,
        number: PROJECT_NUMBER,
      });
      const project = path(data, "data", "organization", "projectV2");
      const field = path(project, "field");
      const projectId = path(project, "id");
      const fieldId = path(field, "id");
      if (typeof projectId !== "string" || typeof fieldId !== "string")
        throw new SyncError("Reading the project failed: no Status field");
      const options = new Map<string, string>();
      for (const option of nodes(path(field, "options")))
        if (typeof option["name"] === "string" && typeof option["id"] === "string")
          options.set(option["name"], option["id"]);
      return { projectId, fieldId, options };
    },
    async setStatus(board, itemId, status) {
      const option = board.options.get(status);
      if (option === undefined)
        throw new SyncError(`Setting Status failed: the project has no ${status} option`);
      await graphql("Setting Status", SET_STATUS, {
        project: board.projectId,
        item: itemId,
        field: board.fieldId,
        option,
      });
    },
    async close(number) {
      await send(
        http,
        token,
        "Closing the ticket",
        `${API}/repos/${OWNER}/${REPO}/issues/${number}`,
        "PATCH",
        {
          state: "closed",
          state_reason: "completed",
        },
      );
    },
  };
}

/** Applies one event. Returns the line to log; throws SyncError for anything that must fail the job. */
export async function syncTicket(event: PullEvent, tracker: Tracker): Promise<string> {
  const target = targetFor(event);
  if (target === undefined) return `Pull request ${event.number}: nothing to sync for this event.`;
  const ref = findTicket(event.body, event.branch);
  if (ref.kind === "conflict")
    throw new SyncError(
      `Pull request ${event.number}: the Ticket ID line and the branch name name different tickets; nothing changed.`,
    );
  if (ref.kind === "none")
    return `Pull request ${event.number}: no planning ticket referenced; nothing changed.`;
  const where = `planning#${ref.number}`;
  const ticket = await tracker.ticket(ref.number);
  if (ticket === null) throw new SyncError(`${where} does not exist or is not readable.`);
  if (ticket.itemId === undefined) throw new SyncError(`${where} is not on the Metro project.`);
  if (ticket.status !== undefined && FINAL.has(ticket.status) && target !== "Done")
    return `${where} is ${ticket.status}; left unchanged.`;
  if (target === "Reopen") {
    if (ticket.status !== "In Review") return `${where} is not In Review; left unchanged.`;
    await tracker.setStatus(await tracker.board(), ticket.itemId, "In Progress");
    return `${where} moved to In Progress (pull request ${event.number} closed without merging).`;
  }
  if (target === "Done" && ticket.status === "Cancelled")
    return `${where} is Cancelled; left unchanged.`;
  if (target === "In Review" && !ticket.open) return `${where} is closed; left unchanged.`;
  // Close first: the project's close automation sets Done, and setting Done again is harmless.
  const closed = target === "Done" && ticket.open;
  if (closed) await tracker.close(ref.number);
  if (ticket.status === target)
    return closed
      ? `${where} closed as completed; Status was already Done (pull request ${event.number}).`
      : `${where} is already ${target}; nothing changed.`;
  await tracker.setStatus(await tracker.board(), ticket.itemId, target);
  return `${where} moved to ${target} (pull request ${event.number}).`;
}

export interface Deps {
  readonly readFile: (path: string) => string;
  readonly http: Http;
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
}

/** Process entry: `GITHUB_EVENT_PATH` (the runner's payload file) and `TRACKER_TOKEN` (the App token). */
export async function trackerSyncMain(
  env: Readonly<Record<string, string | undefined>>,
  deps: Deps = {
    readFile: (file) => readFileSync(file, "utf8"),
    http: (url, init) => fetch(url, init),
    log: (message) => console.log(message),
    error: (message) => console.error(message),
  },
): Promise<void> {
  try {
    const file = env["GITHUB_EVENT_PATH"] ?? "";
    const token = env["TRACKER_TOKEN"] ?? "";
    if (file === "" || token === "")
      throw new SyncError("GITHUB_EVENT_PATH and TRACKER_TOKEN must be set");
    let payload: unknown;
    try {
      payload = JSON.parse(deps.readFile(file));
    } catch {
      throw new SyncError("The event payload cannot be read");
    }
    deps.log(await syncTicket(readEvent(payload), createTracker(deps.http, token)));
  } catch (error) {
    // Only SyncError text is ours; anything else could carry response or payload text.
    deps.error(error instanceof SyncError ? error.message : "Tracker sync failed unexpectedly");
    process.exitCode = 1;
  }
}

if (import.meta.main) await trackerSyncMain(process.env);

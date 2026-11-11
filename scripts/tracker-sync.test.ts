import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expectRejection } from "./test-support";
import {
  createTracker,
  findTicket,
  readEvent,
  SyncError,
  syncTicket,
  targetFor,
  trackerSyncMain,
  type Board,
  type Deps,
  type Http,
  type PullEvent,
  type Status,
  type Ticket,
  type Tracker,
} from "./tracker-sync";

const event = (overrides: Partial<PullEvent> = {}): PullEvent => ({
  action: "opened",
  number: 7,
  draft: false,
  merged: false,
  body: "## Ticket\n\n- Ticket ID: metro-station-finder/planning#153\n",
  branch: "ticket/metro-153-tracker-sync",
  ...overrides,
});

const BOARD: Board = {
  projectId: "P",
  fieldId: "F",
  options: new Map([
    ["In Progress", "o-progress"],
    ["In Review", "o-review"],
    ["Done", "o-done"],
  ]),
};

/** A tracker that records every write. */
function fakeTracker(ticket: Ticket | null = null) {
  const writes: string[] = [];
  const tracker: Tracker = {
    ticket: async (number) => {
      writes.push(`read ${number}`);
      return ticket;
    },
    board: async () => BOARD,
    setStatus: async (_board, item, status: Status) => {
      writes.push(`status ${item} ${status}`);
    },
    close: async (number) => {
      writes.push(`close ${number}`);
    },
  };
  return { tracker, writes };
}

const open = (status: string | undefined): Ticket => ({
  issueId: "I",
  open: true,
  itemId: "item",
  status,
});

test("planning#153 the event payload is read field by field and malformed payloads fail", () => {
  expect(
    readEvent({
      action: "closed",
      pull_request: {
        number: 3,
        draft: true,
        merged: true,
        body: "b",
        head: { ref: "x" },
      },
    }),
  ).toEqual({
    action: "closed",
    number: 3,
    draft: true,
    merged: true,
    body: "b",
    branch: "x",
  });
  expect(readEvent({ action: "opened", pull_request: { number: 3, body: null } })).toEqual({
    action: "opened",
    number: 3,
    draft: false,
    merged: false,
    body: "",
    branch: "",
  });
  for (const bad of [null, {}, { action: 1, pull_request: {} }, { action: "opened" }])
    expect(() => readEvent(bad)).toThrow("The event is not a pull_request event");
  for (const number of [0, 1.5, "3", undefined])
    expect(() => readEvent({ action: "opened", pull_request: { number } })).toThrow(
      "The event has no pull request number",
    );
});

test("planning#153 the ticket comes only from the exact Ticket ID line or the ticket branch name", () => {
  expect(findTicket("- Ticket ID: metro-station-finder/planning#12", "")).toEqual({
    kind: "ticket",
    number: 12,
  });
  expect(findTicket("Ticket ID: metro-station-finder/planning#12  ", "main")).toEqual({
    kind: "ticket",
    number: 12,
  });
  expect(findTicket("", "ticket/metro-40-some-slug")).toEqual({
    kind: "ticket",
    number: 40,
  });
  expect(findTicket(event().body, event().branch)).toEqual({
    kind: "ticket",
    number: 153,
  });
  for (const body of [
    "- Ticket ID: METRO-12",
    "- Ticket ID: other/planning#12",
    "- Ticket ID: metro-station-finder/planning#12 and #13",
    "text - Ticket ID: metro-station-finder/planning#12",
    "- Ticket ID: metro-station-finder/planning#0",
  ])
    expect(findTicket(body, "feature/x"), body).toEqual({ kind: "none" });
  expect(findTicket("", "ticket/metro-40")).toEqual({ kind: "none" });
  expect(findTicket("", "ticket/metro-40-Upper")).toEqual({ kind: "none" });
});

test("planning#153 two different tickets are a conflict; a body over the size cap is not scanned", () => {
  expect(findTicket(event().body, "ticket/metro-9-x")).toEqual({
    kind: "conflict",
  });
  expect(
    findTicket(
      "- Ticket ID: metro-station-finder/planning#1\n- Ticket ID: metro-station-finder/planning#2",
      "",
    ),
  ).toEqual({ kind: "conflict" });
  const huge = `- Ticket ID: metro-station-finder/planning#5\n${"x".repeat(70_000)}`;
  expect(findTicket(huge, "")).toEqual({ kind: "none" });
});

test("planning#153 each event maps to one target, drafts and other actions to none", () => {
  expect(targetFor(event())).toBe("In Review");
  expect(targetFor(event({ action: "reopened" }))).toBe("In Review");
  expect(targetFor(event({ action: "ready_for_review" }))).toBe("In Review");
  expect(targetFor(event({ draft: true }))).toBeUndefined();
  expect(targetFor(event({ action: "synchronize" }))).toBeUndefined();
  expect(targetFor(event({ action: "closed", merged: true }))).toBe("Done");
  expect(targetFor(event({ action: "closed" }))).toBe("Reopen");
});

test("planning#153 an opened pull request moves its ticket to In Review", async () => {
  const { tracker, writes } = fakeTracker(open("In Progress"));
  expect(await syncTicket(event(), tracker)).toBe(
    "planning#153 moved to In Review (pull request 7).",
  );
  expect(writes).toEqual(["read 153", "status item In Review"]);
});

test("planning#153 a merge closes the ticket as completed and sets Done", async () => {
  const { tracker, writes } = fakeTracker(open("In Review"));
  expect(await syncTicket(event({ action: "closed", merged: true }), tracker)).toBe(
    "planning#153 moved to Done (pull request 7).",
  );
  expect(writes).toEqual(["read 153", "close 153", "status item Done"]);
  const done = fakeTracker({ ...open("Done"), open: false });
  await syncTicket(event({ action: "closed", merged: true }), done.tracker);
  expect(done.writes).toEqual(["read 153"]);
  const doneOpen = fakeTracker(open("Done"));
  expect(await syncTicket(event({ action: "closed", merged: true }), doneOpen.tracker)).toBe(
    "planning#153 closed as completed; Status was already Done (pull request 7).",
  );
  expect(doneOpen.writes).toEqual(["read 153", "close 153"]);
  const unset = fakeTracker({ issueId: "I", open: false, itemId: "item", status: undefined });
  await syncTicket(event({ action: "closed", merged: true }), unset.tracker);
  expect(unset.writes).toEqual(["read 153", "status item Done"]);
});

test("planning#153 closing unmerged returns an In Review ticket to In Progress and nothing else", async () => {
  const review = fakeTracker(open("In Review"));
  expect(await syncTicket(event({ action: "closed" }), review.tracker)).toBe(
    "planning#153 moved to In Progress (pull request 7 closed without merging).",
  );
  expect(review.writes).toEqual(["read 153", "status item In Progress"]);
  const progress = fakeTracker(open("Ready"));
  expect(await syncTicket(event({ action: "closed" }), progress.tracker)).toBe(
    "planning#153 is not In Review; left unchanged.",
  );
  expect(progress.writes).toEqual(["read 153"]);
});

test("planning#153 Done and Cancelled tickets never move back, and a closed ticket is not reviewed", async () => {
  for (const [status, ticketOpen, action, merged, line] of [
    ["Done", false, "opened", false, "planning#153 is Done; left unchanged."],
    ["Cancelled", false, "closed", false, "planning#153 is Cancelled; left unchanged."],
    ["Cancelled", false, "closed", true, "planning#153 is Cancelled; left unchanged."],
    ["In Progress", false, "opened", false, "planning#153 is closed; left unchanged."],
  ] as const) {
    const { tracker, writes } = fakeTracker({
      ...open(status),
      open: ticketOpen,
    });
    expect(await syncTicket(event({ action, merged }), tracker)).toBe(line);
    expect(writes).toEqual(["read 153"]);
  }
  const same = fakeTracker(open("In Review"));
  expect(await syncTicket(event({ action: "reopened" }), same.tracker)).toBe(
    "planning#153 is already In Review; nothing changed.",
  );
  expect(same.writes).toEqual(["read 153"]);
});

test("planning#153 no reference or an unrelated event writes nothing; a conflict or a missing ticket fails", async () => {
  const { tracker, writes } = fakeTracker(open("In Progress"));
  expect(await syncTicket(event({ action: "edited" }), tracker)).toBe(
    "Pull request 7: nothing to sync for this event.",
  );
  expect(await syncTicket(event({ body: "", branch: "feature/x" }), tracker)).toBe(
    "Pull request 7: no planning ticket referenced; nothing changed.",
  );
  await expectRejection(
    syncTicket(event({ branch: "ticket/metro-9-x" }), tracker),
    "the Ticket ID line and the branch name name different tickets",
  );
  expect(writes).toEqual([]);
  await expectRejection(
    syncTicket(event(), fakeTracker().tracker),
    "planning#153 does not exist or is not readable.",
  );
  await expectRejection(
    syncTicket(event(), fakeTracker({ ...open("Ready"), itemId: undefined }).tracker),
    "planning#153 is not on the Metro project.",
  );
});

interface Call {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

/** Answers each request with the next canned response and records what was sent. */
function fakeHttp(...responses: (readonly [number, string] | "throw")[]) {
  const calls: Call[] = [];
  const http: Http = async (url, init) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body === undefined ? undefined : JSON.parse(init.body),
    });
    const next = responses.shift();
    if (next === undefined || next === "throw") throw new Error("secret response text");
    const [status, text] = next;
    return { ok: status < 300, status, text: async () => text };
  };
  return { http, calls };
}

const json = (value: unknown): readonly [number, string] => [200, JSON.stringify(value)];
const issue = (items: unknown[], state = "OPEN") =>
  json({
    data: {
      repository: {
        issue: { id: "I1", state, projectItems: { nodes: items } },
      },
    },
  });
const item = (login: string, number: number, status?: string) => ({
  id: `item-${login}-${number}`,
  project: { owner: { login }, number },
  status: status === undefined ? null : { name: status },
});

test("planning#153 the ticket read finds the Metro project item and its Status", async () => {
  const { http, calls } = fakeHttp(
    issue([
      item("someone", 1, "Done"),
      item("metro-station-finder", 2),
      item("metro-station-finder", 1, "Ready"),
    ]),
  );
  expect(await createTracker(http, "tok").ticket(153)).toEqual({
    issueId: "I1",
    open: true,
    itemId: "item-metro-station-finder-1",
    status: "Ready",
  });
  expect(calls[0]?.url).toBe("https://api.github.com/graphql");
  expect(calls[0]?.method).toBe("POST");
  expect(calls[0]?.headers["Authorization"]).toBe("Bearer tok");
  expect(calls[0]?.body).toMatchObject({
    variables: { owner: "metro-station-finder", repo: "planning", number: 153 },
  });
});

test("planning#153 a ticket off the project, without Status, or missing reads as such", async () => {
  const off = fakeHttp(issue([item("someone", 1)], "CLOSED"));
  expect(await createTracker(off.http, "t").ticket(1)).toEqual({
    issueId: "I1",
    open: false,
    itemId: undefined,
    status: undefined,
  });
  const bare = fakeHttp(json({ data: { repository: { issue: { id: "I1", state: "OPEN" } } } }));
  expect((await createTracker(bare.http, "t").ticket(1))?.itemId).toBeUndefined();
  const noStatus = fakeHttp(issue([{ ...item("metro-station-finder", 1), id: 5 }]));
  expect(await createTracker(noStatus.http, "t").ticket(1)).toMatchObject({
    itemId: undefined,
    status: undefined,
  });
  const missing = fakeHttp(json({ data: { repository: { issue: null } } }));
  expect(await createTracker(missing.http, "t").ticket(1)).toBeNull();
});

test("planning#153 the board read keeps well-formed options and fails without a Status field", async () => {
  const { http } = fakeHttp(
    json({
      data: {
        organization: {
          projectV2: {
            id: "P",
            field: {
              id: "F",
              options: [{ id: "o1", name: "Done" }, { id: 2, name: "Bad" }, "x"],
            },
          },
        },
      },
    }),
  );
  expect(await createTracker(http, "t").board()).toEqual({
    projectId: "P",
    fieldId: "F",
    options: new Map([["Done", "o1"]]),
  });
  const none = fakeHttp(json({ data: { organization: { projectV2: { id: "P", field: {} } } } }));
  await expectRejection(
    createTracker(none.http, "t").board(),
    "Reading the project failed: no Status field",
  );
});

test("planning#153 Status and close send the documented requests", async () => {
  const { http, calls } = fakeHttp(json({ data: {} }), json({ number: 153 }));
  const tracker = createTracker(http, "t");
  await tracker.setStatus(BOARD, "item", "Done");
  await tracker.close(153);
  expect(calls[0]?.body).toMatchObject({
    variables: { project: "P", item: "item", field: "F", option: "o-done" },
  });
  expect(JSON.stringify(calls[0]?.body)).toContain(
    "updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:{singleSelectOptionId:$option}})",
  );
  expect(calls[1]).toMatchObject({
    url: "https://api.github.com/repos/metro-station-finder/planning/issues/153",
    method: "PATCH",
    body: { state: "closed", state_reason: "completed" },
  });
  await expectRejection(
    tracker.setStatus({ ...BOARD, options: new Map() }, "item", "Done"),
    "Setting Status failed: the project has no Done option",
  );
});

test("planning#153 API failures fail with the call and status only, never response text", async () => {
  const cases: [Parameters<typeof fakeHttp>[0], string][] = [
    ["throw", "Reading the ticket failed: no response"],
    [[502, "secret response text"], "Reading the ticket failed: HTTP 502"],
    [[200, "not json"], "Reading the ticket failed: the response is not JSON"],
    [
      json({ errors: [{ message: "secret response text" }] }),
      "Reading the ticket failed: GraphQL error",
    ],
  ];
  for (const [response, message] of cases) {
    const { http } = fakeHttp(response);
    const failure = await createTracker(http, "t")
      .ticket(1)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(SyncError);
    expect(failure instanceof SyncError ? failure.message : failure).toBe(message);
  }
});

function main(files: Record<string, string>, ...responses: Parameters<typeof fakeHttp>) {
  const out: string[] = [];
  const err: string[] = [];
  const { http, calls } = fakeHttp(...responses);
  const deps: Deps = {
    readFile: (file) => {
      const text = files[file];
      if (text === undefined) throw new Error("ENOENT secret path");
      return text;
    },
    http,
    log: (message) => out.push(message),
    error: (message) => err.push(message),
  };
  return { deps, out, err, calls };
}

const payload = JSON.stringify({
  action: "opened",
  pull_request: {
    number: 7,
    body: "- Ticket ID: metro-station-finder/planning#153\nsecret body text",
    head: { ref: "ticket/metro-153-x" },
  },
});
const board = json({
  data: {
    organization: {
      projectV2: {
        id: "P",
        field: { id: "F", options: [{ id: "o", name: "In Review" }] },
      },
    },
  },
});

test("planning#153 the entry reads the payload file, syncs and logs one fixed line", async () => {
  const run = main(
    { "/event.json": payload },
    issue([item("metro-station-finder", 1, "In Progress")]),
    board,
    json({ data: {} }),
  );
  const before = process.exitCode;
  await trackerSyncMain({ GITHUB_EVENT_PATH: "/event.json", TRACKER_TOKEN: "tok" }, run.deps);
  expect(process.exitCode).toBe(before);
  expect(run.out).toEqual(["planning#153 moved to In Review (pull request 7)."]);
  expect(run.err).toEqual([]);
  expect(run.calls).toHaveLength(3);
});

test("planning#153 the entry fails visibly on missing settings, bad payloads and unexpected errors", async () => {
  const cases: [Record<string, string | undefined>, Record<string, string>, string][] = [
    [{}, {}, "GITHUB_EVENT_PATH and TRACKER_TOKEN must be set"],
    [{ GITHUB_EVENT_PATH: "/e" }, {}, "GITHUB_EVENT_PATH and TRACKER_TOKEN must be set"],
    [{ GITHUB_EVENT_PATH: "/missing", TRACKER_TOKEN: "t" }, {}, "The event payload cannot be read"],
    [
      { GITHUB_EVENT_PATH: "/e", TRACKER_TOKEN: "t" },
      { "/e": "{" },
      "The event payload cannot be read",
    ],
    [
      { GITHUB_EVENT_PATH: "/e", TRACKER_TOKEN: "t" },
      { "/e": "[]" },
      "The event is not a pull_request event",
    ],
  ];
  const before = process.exitCode;
  try {
    for (const [env, files, message] of cases) {
      process.exitCode = 0;
      const run = main(files);
      await trackerSyncMain(env, run.deps);
      expect(run.err).toEqual([message]);
      expect(process.exitCode).toBe(1);
    }
    process.exitCode = 0;
    const run = main({ "/e": payload });
    await trackerSyncMain(
      { GITHUB_EVENT_PATH: "/e", TRACKER_TOKEN: "t" },
      {
        ...run.deps,
        log: () => {
          throw new Error("secret body text");
        },
      },
    );
    expect(run.err).toEqual(["Reading the ticket failed: no response"]);
    process.exitCode = 0;
    const odd = main(
      { "/e": payload },
      issue([item("metro-station-finder", 1, "Ready")]),
      board,
      json({ data: {} }),
    );
    await trackerSyncMain(
      { GITHUB_EVENT_PATH: "/e", TRACKER_TOKEN: "t" },
      {
        ...odd.deps,
        log: () => {
          throw new Error("secret body text");
        },
      },
    );
    expect(odd.err).toEqual(["Tracker sync failed unexpectedly"]);
    expect(process.exitCode).toBe(1);
  } finally {
    process.exitCode = before;
  }
});

test("planning#153 the default dependencies read the real file and use the console and fetch (stubbed)", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tracker-sync-"));
  const file = join(dir, "event.json");
  await writeFile(
    file,
    JSON.stringify({
      action: "opened",
      pull_request: {
        number: 7,
        body: "",
        head: { ref: "ticket/metro-153-x" },
      },
    }),
  );
  const out: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalFetch = globalThis.fetch;
  const previous = process.exitCode;
  console.log = (m: string) => void out.push(`log:${m}`);
  console.error = (m: string) => void out.push(`error:${m}`);
  globalThis.fetch = Object.assign(
    (): Promise<Response> => Promise.resolve(new Response("{}", { status: 503 })),
    { preconnect: originalFetch.preconnect },
  );
  try {
    process.exitCode = 0;
    await trackerSyncMain({
      GITHUB_EVENT_PATH: file,
      TRACKER_TOKEN: "tok-default",
    });
    expect(process.exitCode).toBe(1);
    await trackerSyncMain({
      GITHUB_EVENT_PATH: file.replace("event", "missing"),
      TRACKER_TOKEN: "t",
    });
    process.exitCode = 0;
    await writeFile(file, JSON.stringify({ action: "edited", pull_request: { number: 7 } }));
    await trackerSyncMain({ GITHUB_EVENT_PATH: file, TRACKER_TOKEN: "t" });
    expect(process.exitCode).toBe(0);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    globalThis.fetch = originalFetch;
    process.exitCode = previous;
    await rm(dir, { recursive: true, force: true });
  }
  expect(out).toEqual([
    "error:Reading the ticket failed: HTTP 503",
    "error:The event payload cannot be read",
    "log:Pull request 7: nothing to sync for this event.",
  ]);
});

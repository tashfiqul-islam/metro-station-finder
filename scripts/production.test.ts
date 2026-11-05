import { expect, spyOn, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { previewWorkerName } from "./preview";
import {
  PRODUCTION_WORKER,
  assertProductionWorker,
  checkDeployRequest,
  currentVersionId,
  releaseLabel,
  runProductionCli,
  productionMain,
  uploadedVersionId,
  versionOverrideHeader,
} from "./production";
import { expectRejection } from "./test-support";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const OLD = "11111111-2222-4333-8444-555555555555";
const NEW = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const deployment = (versions: unknown) => ({ id: "d", versions });
const ok = {
  PRODUCTION_DEPLOY_ENABLED: "true",
  REF_TYPE: "tag",
  REF_NAME: "v1.0.0",
  PRODUCTION_URL: "https://metro.example.com",
  CLOUDFLARE_API_TOKEN: "t",
  CLOUDFLARE_ACCOUNT_ID: "a",
};

test("METRO-57 the production Worker is the config name and can never be a preview Worker", () => {
  expect(PRODUCTION_WORKER).toBe("metro-scaffold");
  expect(PRODUCTION_WORKER.startsWith("metro-scaffold-pr-")).toBe(false);
  expect(PRODUCTION_WORKER).not.toBe(previewWorkerName("1"));
  expect(() => assertProductionWorker("metro-scaffold")).not.toThrow();
  for (const bad of ["metro-scaffold-pr-7", "metro-scaffold-preview", "", "other"])
    expect(() => assertProductionWorker(bad)).toThrow("production Worker");
});

test("METRO-57 the gate fails closed unless the owner enabled production deploys", () => {
  expect(checkDeployRequest(ok)).toEqual({ kind: "tag", ref: "v1.0.0" });
  for (const value of [undefined, "", "false", "TRUE", "1", " true"])
    expect(() => checkDeployRequest({ ...ok, PRODUCTION_DEPLOY_ENABLED: value })).toThrow(
      "PRODUCTION_DEPLOY_ENABLED",
    );
});

test("METRO-57 only stable v* tags and the main branch may deploy", () => {
  expect(checkDeployRequest({ ...ok, REF_TYPE: "branch", REF_NAME: "main" })).toEqual({
    kind: "branch",
    ref: "main",
  });
  const refused: [string, string][] = [
    ["tag", "v1.0.0-rc.1"],
    ["tag", "v0.0.0-sync-test"],
    ["tag", "1.0.0"],
    ["tag", "v1.0"],
    ["branch", "feature/metro-rebuild"],
    ["branch", "master"],
    ["branch", "ticket/metro-57"],
    ["pull_request", "main"],
    ["", ""],
  ];
  for (const [type, name] of refused)
    expect(() => checkDeployRequest({ ...ok, REF_TYPE: type, REF_NAME: name })).toThrow(
      "not allowed",
    );
});

test("METRO-57 the production URL must be an https origin and the secrets must exist", () => {
  const bad = [
    "",
    "http://metro.example.com",
    "https://metro.example.com/path",
    "https://metro.example.com/?q=1",
    "https://user@metro.example.com",
    "https://metro-scaffold-pr-7.acct.workers.dev",
    "not a url",
  ];
  for (const url of bad)
    expect(() => checkDeployRequest({ ...ok, PRODUCTION_URL: url })).toThrow("PRODUCTION_URL");
  expect(() => checkDeployRequest({ ...ok, CLOUDFLARE_API_TOKEN: " " })).toThrow(
    'environment "production"',
  );
  expect(() => checkDeployRequest({ ...ok, CLOUDFLARE_ACCOUNT_ID: undefined })).toThrow(
    "CLOUDFLARE_ACCOUNT_ID",
  );
});

test("METRO-57 the release label is derived from digits and hex only", () => {
  expect(releaseLabel(SHA, "12345")).toBe("0123456789ab-12345");
  expect(() => releaseLabel("zz", "1")).toThrow("commit SHA");
  expect(() => releaseLabel(SHA, "1; rm")).toThrow("run id");
});

test("METRO-57 the uploaded version id comes from the Wrangler output file for this Worker", () => {
  const line = (extra: object) =>
    JSON.stringify({
      type: "version-upload",
      version: 1,
      worker_name: PRODUCTION_WORKER,
      version_id: NEW,
      ...extra,
    });
  expect(uploadedVersionId(`${JSON.stringify({ type: "wrangler-session" })}\n${line({})}\n`)).toBe(
    NEW,
  );
  expect(() => uploadedVersionId("")).toThrow("version-upload");
  expect(() => uploadedVersionId(line({ worker_name: "metro-scaffold-pr-7" }))).toThrow(
    "version-upload",
  );
  expect(() => uploadedVersionId(line({ version_id: "not-a-uuid" }))).toThrow("version id");
  expect(() => uploadedVersionId(`${line({})}\n${line({ version_id: OLD })}`)).toThrow(
    "exactly one",
  );
  expect(() => uploadedVersionId("{not json")).toThrow();
});

test("METRO-57 the current version is the single one serving 100 percent", () => {
  const one = [{ version_id: OLD, percentage: 100 }];
  expect(currentVersionId(JSON.stringify(deployment(one)))).toBe(OLD);
  expect(currentVersionId(JSON.stringify([deployment(one)]))).toBe(OLD);
  expect(currentVersionId(JSON.stringify({ result: { deployments: [deployment(one)] } }))).toBe(
    OLD,
  );
  const split = [
    { version_id: OLD, percentage: 90 },
    { version_id: NEW, percentage: 10 },
  ];
  for (const bad of [
    "[]",
    "{}",
    "null",
    JSON.stringify(deployment(split)),
    JSON.stringify(deployment([{ version_id: "x", percentage: 100 }])),
    JSON.stringify(deployment([])),
  ])
    expect(() => currentVersionId(bad)).toThrow();
  expect(() => currentVersionId(JSON.stringify(deployment(split)))).toThrow("gradual deployment");
});

test("METRO-57 the override header targets the production Worker and a valid version id only", () => {
  expect(versionOverrideHeader(NEW)).toEqual({
    "Cloudflare-Workers-Version-Overrides": `${PRODUCTION_WORKER}="${NEW}"`,
  });
  expect(() => versionOverrideHeader('x"; y="z')).toThrow("version id");
});

test("METRO-57 the CLI wires guard, label, version, current and smoke", async () => {
  const dir = await mkdtemp(join(tmpdir(), "metro-production-"));
  try {
    expect(await runProductionCli(["guard"], ok)).toContain("v1.0.0");
    expect(await runProductionCli(["label"], { GITHUB_SHA: SHA, GITHUB_RUN_ID: "9" })).toBe(
      "0123456789ab-9",
    );
    const upload = join(dir, "upload.ndjson");
    await writeFile(
      upload,
      JSON.stringify({ type: "version-upload", worker_name: PRODUCTION_WORKER, version_id: NEW }),
    );
    expect(await runProductionCli(["version", upload], {})).toBe(NEW);
    const status = join(dir, "status.json");
    await writeFile(status, JSON.stringify({ versions: [{ version_id: OLD, percentage: 100 }] }));
    expect(await runProductionCli(["current", status], {})).toBe(OLD);
    for (const args of [["version"], ["current"], ["smoke"], ["nope"], []])
      await expectRejection(runProductionCli(args, {}));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("METRO-57 the production smoke is the preview smoke with a version override", async () => {
  const seen: { url: string; headers: Record<string, string> | undefined }[] = [];
  const result = await runProductionCli(
    ["smoke", "https://metro.example.com", SHA, NEW],
    {},
    {
      attempts: 1,
      delayMs: 0,
      fetch: (url, init) => {
        seen.push({ url, headers: init?.headers });
        return Promise.reject(new Error("offline"));
      },
    },
  ).catch((error: unknown) => String(error));
  expect(result).toContain("Smoke failed after 1 attempts");
  expect(seen[0]?.headers).toEqual(versionOverrideHeader(NEW));
  await expectRejection(runProductionCli(["smoke", "http://x.test", SHA], {}), "PRODUCTION_URL");
});

test("METRO-57 productionMain prints results, writes step outputs and fails the step on error", async () => {
  const dir = await mkdtemp(join(tmpdir(), "metro-production-"));
  const out = join(dir, "output");
  const log = spyOn(console, "log").mockImplementation(() => {});
  const error = spyOn(console, "error").mockImplementation(() => {});
  const before = process.exitCode;
  try {
    await productionMain(["label"], { GITHUB_SHA: SHA, GITHUB_RUN_ID: "9", GITHUB_OUTPUT: out });
    expect(await readFile(out, "utf8")).toBe("label=0123456789ab-9\n");
    expect(process.exitCode).toBe(before);
    await productionMain(["guard"], {});
    expect(process.exitCode).toBe(1);
    expect(error).toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  } finally {
    process.exitCode = before;
    log.mockRestore();
    error.mockRestore();
    await rm(dir, { recursive: true, force: true });
  }
});

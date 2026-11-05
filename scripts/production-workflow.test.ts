import { expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";

import { isRecord } from "./guards";
import { PRODUCTION_WORKER } from "./production";

const DIR = ".github/workflows";
const workflow = readFileSync(`${DIR}/production-deploy.yml`, "utf8");

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${what} is not an object`);
  return value;
}

function job(name: string) {
  const doc = record(Bun.YAML.parse(workflow), "workflow");
  const found = record(record(doc["jobs"], "jobs")[name], `jobs.${name}`);
  const steps = found["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  return { doc, job: found, steps: (steps as unknown[]).map((s, i) => record(s, `step ${i}`)) };
}

const stepNamed = (steps: Record<string, unknown>[], start: string) => {
  const found = steps.find((s) => String(s["name"]).startsWith(start));
  if (found === undefined) throw new Error(`No step named ${start}`);
  return found;
};

test("METRO-57 the workflow runs only on pushed v* tags and manual dispatch", () => {
  const { doc } = job("deploy");
  const triggers = record(doc["on"], "on");
  expect(new Set(Object.keys(triggers))).toEqual(new Set(["push", "workflow_dispatch"]));
  expect(record(triggers["push"], "push")).toEqual({
    tags: ["v[0-9]+.[0-9]+.[0-9]+"],
  });
  for (const trigger of ["pull_request", "pull_request_target", "workflow_run", "schedule"])
    expect(workflow).not.toContain(trigger);
});

test("METRO-57 the deploy job holds the production environment and is off until the owner enables it", () => {
  const { job: deploy } = job("deploy");
  expect(record(deploy["environment"], "environment")["name"]).toBe("production");
  expect(deploy["if"]).toBe("${{ vars.PRODUCTION_DEPLOY_ENABLED == 'true' }}");
  const { steps } = job("deploy");
  const guard = stepNamed(steps, "Refuse unless");
  expect(guard["run"]).toBe("node scripts/production.ts guard");
  expect(steps.indexOf(guard)).toBeLessThan(steps.indexOf(stepNamed(steps, "Build")));
  expect(String(record(guard["env"], "env")["PRODUCTION_DEPLOY_ENABLED"])).toContain(
    "vars.PRODUCTION_DEPLOY_ENABLED",
  );
  expect(JSON.stringify(guard["env"])).not.toContain("CLOUDFLARE_");
});

test("METRO-57 permissions are minimal and nothing else gets write access", () => {
  const { doc, job: deploy } = job("deploy");
  expect(doc["permissions"]).toEqual({});
  expect(deploy["permissions"]).toEqual({ contents: "read" });
  expect(record(job("sync").job["permissions"], "sync.permissions")).toEqual({ actions: "write" });
  expect(workflow).not.toMatch(/id-token|pull-requests|contents: write|deployments:/u);
});

test("METRO-57 only one production deploy runs at a time and it is never cancelled midway", () => {
  const { doc } = job("deploy");
  expect(doc["concurrency"]).toEqual({ group: "production-deploy", "cancel-in-progress": false });
});

test("METRO-57 the production Worker is the only target and never a metro-scaffold-pr-* Worker", () => {
  expect(workflow).not.toContain("metro-scaffold-pr");
  expect(workflow.replaceAll("PREVIEW_SHA", "")).not.toMatch(/preview/iu);
  expect(workflow).not.toMatch(/CLOUDFLARE_ENVs*:/u);
  const { job: deploy } = job("deploy");
  expect(record(deploy["env"], "env")["WORKER"]).toBe(PRODUCTION_WORKER);
  const config = readFileSync("apps/api/wrangler.jsonc", "utf8");
  expect(config).toContain(`"name": "${PRODUCTION_WORKER}",`);
  for (const line of workflow
    .split("\n")
    .filter((l) => /wrangler (versions|rollback|deploy)/u.test(l)))
    expect(line).toContain('--name "$WORKER"');
  expect(workflow).not.toMatch(/wrangler deploy\b/u);
  expect(workflow).not.toMatch(/wrangler delete/u);
});

test("METRO-57 preview jobs never target the production Worker", () => {
  for (const file of readdirSync(DIR).filter((name) => name !== "production-deploy.yml")) {
    const text = readFileSync(`${DIR}/${file}`, "utf8");
    expect(text).not.toMatch(/WORKER:\s*metro-scaffold\s*$/mu);
    expect(text).not.toMatch(/--name\s+"?metro-scaffold"?(\s|$)/u);
    expect(text).not.toContain("environment: production");
    expect(text).not.toMatch(/name:\s*production\b/u);
  }
  const quality = readFileSync(`${DIR}/quality.yml`, "utf8");
  expect(quality).toContain("scripts/preview.ts name");
  expect(readFileSync("scripts/preview.ts", "utf8")).toContain('"metro-scaffold-pr-"');
});

test("METRO-57 the rollout uploads a version, stages it, smokes it, then rolls it out and smokes again", () => {
  const { steps } = job("deploy");
  const order = [
    "Record the version that serves production now",
    "Upload the new version",
    "Stage the new version at 0 percent",
    "Smoke the staged version",
    "Roll the new version out to 100 percent",
    "Smoke production and prove",
    "Soak",
    "Smoke production again",
  ].map((start) => steps.indexOf(stepNamed(steps, start)));
  expect(order.every((index, i) => index > (order[i - 1] ?? -1))).toBe(true);
  expect(String(stepNamed(steps, "Upload the new version")["run"])).toContain(
    "wrangler versions upload",
  );
  expect(String(stepNamed(steps, "Upload the new version")["run"])).toContain("--tag");
  expect(String(stepNamed(steps, "Stage the new version")["run"])).toContain(
    'versions deploy "$PREVIOUS@100%" "$VERSION@0%"',
  );
  expect(String(stepNamed(steps, "Roll the new version out")["run"])).toContain(
    'versions deploy "$VERSION@100%"',
  );
  for (const start of ["Stage", "Roll the new version out", "Roll back"])
    expect(String(stepNamed(steps, start)["run"])).toContain("--yes");
  expect(String(stepNamed(steps, "Smoke the staged")["run"])).toBe(
    'node scripts/production.ts smoke "$PRODUCTION_URL" "$COMMIT" "$VERSION"',
  );
});

test("METRO-57 a failed step rolls back to the previous version and smokes it", () => {
  const { steps } = job("deploy");
  const rollback = stepNamed(steps, "Roll back");
  expect(String(rollback["if"])).toContain("(failure() || cancelled())");
  expect(String(rollback["if"])).toContain("steps.stage.outcome != 'skipped'");
  expect(String(rollback["if"])).toContain("steps.previous.outputs.current != ''");
  expect(String(rollback["run"])).toBe(
    'bunx wrangler rollback "$PREVIOUS" --name "$WORKER" --message "Automatic rollback of $COMMIT after a failed deploy" --yes',
  );
  expect(steps.indexOf(rollback)).toBeGreaterThan(
    steps.indexOf(stepNamed(steps, "Smoke production again")),
  );
  expect(String(stepNamed(steps, "Smoke production after the rollback")["if"])).toContain(
    "(failure() || cancelled())",
  );
  // A run cancelled or timed out before staging has nothing to undo.
  expect(String(rollback["if"])).not.toContain("always()");
  expect(deployTimeout()).toBeGreaterThanOrEqual(15);
});

test("METRO-57 the Cloudflare token is set only on steps that call Wrangler, in a cache-free job", () => {
  const { job: deploy, steps } = job("deploy");
  expect(workflow).not.toContain("actions/cache");
  expect(JSON.stringify(deploy["env"])).not.toContain("CLOUDFLARE_");
  const holders = steps.filter((s) =>
    JSON.stringify(s["env"] ?? {}).includes("CLOUDFLARE_API_TOKEN"),
  );
  expect(holders.length).toBeGreaterThanOrEqual(5);
  for (const step of holders) {
    const run = typeof step["run"] === "string" ? step["run"] : "";
    expect(run).toMatch(/^(bunx wrangler|test -n)/u);
    expect(run).not.toMatch(/\b(node|bun run|bun install|npm)\b/u);
  }
  expect(holders.map((s) => s["name"]).join("\n")).not.toMatch(/Build|Install|Check out/u);
  const [checkout = {}] = steps;
  const tools = stepNamed(steps, "Install pinned tools");
  expect(record(checkout["with"], "checkout.with")["persist-credentials"]).toBe(false);
  expect(record(tools["with"], "tools.with")["cache"]).toBe(false);
  for (const step of steps)
    expect(typeof step["name"] === "string" && step["name"] !== "").toBe(true);
});

test("METRO-57 untrusted values reach shell code only through environment variables", () => {
  for (const name of ["deploy", "sync"])
    for (const step of job(name).steps)
      if (typeof step["run"] === "string") expect(step["run"]).not.toContain("${{");
});

test("METRO-57 release-sync is dispatched only after a successful tag deploy, without secrets", () => {
  const { job: sync, steps } = job("sync");
  expect(sync["needs"]).toEqual(["deploy"]);
  expect(String(sync["if"])).toContain("needs.deploy.result == 'success'");
  expect(String(sync["if"])).toContain("github.ref_type == 'tag'");
  expect(sync["environment"]).toBeUndefined();
  expect(JSON.stringify(steps)).not.toContain("secrets.");
  expect(String(steps[0]?.["run"])).toBe(
    'gh workflow run release-sync.yml --ref "$TAG" -f tag="$TAG"',
  );
});

function deployTimeout(): number {
  const value = job("deploy").job["timeout-minutes"];
  if (typeof value !== "number") throw new Error("timeout-minutes is not a number");
  return value;
}

test("METRO-57 the tagged commit must be on main before any tool or repository script runs", () => {
  const { steps } = job("deploy");
  const [checkout = {}, lineage = {}] = steps;
  expect(String(checkout["uses"])).toStartWith("actions/checkout@");
  expect(record(checkout["with"], "checkout.with")["fetch-depth"]).toBe(0);
  expect(record(checkout["with"], "checkout.with")["persist-credentials"]).toBe(false);
  expect(String(lineage["name"])).toStartWith("Require the commit to be merged to main");
  const run = typeof lineage["run"] === "string" ? lineage["run"] : "";
  expect(run).toContain('git fetch --no-tags origin "+refs/heads/main:refs/remotes/origin/main"');
  expect(run).toContain('git merge-base --is-ancestor "$COMMIT" origin/main');
  expect(run).toContain("exit 1");
  expect(run).not.toMatch(/\b(node|bun|bunx|mise)\b/u);
  expect(record(lineage["env"], "lineage.env")).toEqual({ COMMIT: "${{ github.sha }}" });
  expect(JSON.stringify(lineage)).not.toMatch(/secrets\.|CLOUDFLARE_/u);
  const executors = steps.filter(
    (step) => typeof step["run"] === "string" && /\b(node|bun|bunx)\b/u.test(step["run"]),
  );
  for (const step of executors) expect(steps.indexOf(step)).toBeGreaterThan(1);
  expect(steps.indexOf(stepNamed(steps, "Install pinned tools"))).toBeGreaterThan(1);
  expect(JSON.stringify(steps.slice(0, 2))).not.toContain("secrets.");
});

test("METRO-57 no step that runs Node or Bun ever receives the Cloudflare token", () => {
  const { steps } = job("deploy");
  for (const step of steps) {
    const run = typeof step["run"] === "string" ? step["run"] : "";
    if (/\b(node|bun)\b/u.test(run))
      expect(JSON.stringify(step["env"] ?? {})).not.toContain("secrets.");
  }
  const credentials = stepNamed(steps, "Require the Cloudflare credentials");
  expect(String(credentials["run"])).toContain('test -n "$CLOUDFLARE_API_TOKEN"');
  expect(steps.indexOf(credentials)).toBeGreaterThan(
    steps.indexOf(stepNamed(steps, "Refuse unless")),
  );
  expect(steps.indexOf(credentials)).toBeLessThan(steps.indexOf(stepNamed(steps, "Build")));
});

test("METRO-57 the Wrangler outputs are parsed by steps that hold no secret", () => {
  const { steps } = job("deploy");
  for (const name of [
    "Record the version that serves production now",
    "Read the uploaded version id",
  ]) {
    const step = stepNamed(steps, name);
    expect(String(step["run"])).toStartWith("node scripts/production.ts ");
    expect(step["env"]).toBeUndefined();
  }
});

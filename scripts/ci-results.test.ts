import { requiredJobsSucceeded } from "./ci-results";

const passing = {
  changes: { result: "success", outputs: { docs_only: "false" } },
  checks: { result: "success" },
  build: { result: "success" },
  security: { result: "success" },
};
test("aggregate accepts all required successes", () =>
  expect(requiredJobsSucceeded(passing)).toBe(true));
for (const job of Object.keys(passing)) {
  for (const result of ["failure", "cancelled", "skipped", "", "unknown"]) {
    test(`aggregate rejects ${job}: ${result}`, () =>
      expect(requiredJobsSucceeded({ ...passing, [job]: { result } })).toBe(false));
  }
  test(`aggregate rejects missing ${job}`, () => {
    const incomplete: Record<string, unknown> = { ...passing };
    delete incomplete[job];
    expect(requiredJobsSucceeded(incomplete)).toBe(false);
  });
}
const docsOnly = { ...passing, changes: { result: "success", outputs: { docs_only: "true" } } };
test("METRO-62 a build skipped because the change is docs-only passes", () =>
  expect(requiredJobsSucceeded({ ...docsOnly, build: { result: "skipped" } })).toBe(true));
test("METRO-62 a successful build on a docs-only change still passes", () =>
  expect(requiredJobsSucceeded(docsOnly)).toBe(true));
for (const docs_only of ["false", "", "TRUE", "1"]) {
  test(`METRO-62 an unexpected build skip fails when docs_only is ${JSON.stringify(docs_only)}`, () =>
    expect(
      requiredJobsSucceeded({
        ...passing,
        changes: { result: "success", outputs: { docs_only } },
        build: { result: "skipped" },
      }),
    ).toBe(false));
}
test("METRO-62 an unexpected build skip fails when changes has no outputs", () =>
  expect(
    requiredJobsSucceeded({
      ...passing,
      changes: { result: "success" },
      build: { result: "skipped" },
    }),
  ).toBe(false));
for (const result of ["failure", "cancelled"]) {
  test(`METRO-62 a ${result} build fails even on a docs-only change`, () =>
    expect(requiredJobsSucceeded({ ...docsOnly, build: { result } })).toBe(false));
}
for (const job of ["checks", "security"]) {
  test(`METRO-62 a skipped ${job} fails even on a docs-only change`, () =>
    expect(requiredJobsSucceeded({ ...docsOnly, [job]: { result: "skipped" } })).toBe(false));
}
test("METRO-62 a docs-only claim cannot excuse a skipped build when changes did not succeed", () => {
  for (const result of ["failure", "cancelled", "skipped"])
    expect(
      requiredJobsSucceeded({
        ...docsOnly,
        changes: { result, outputs: { docs_only: "true" } },
        build: { result: "skipped" },
      }),
    ).toBe(false);
});
test("aggregate rejects an extra job that did not succeed", () =>
  expect(requiredJobsSucceeded({ ...passing, extra: { result: "failure" } })).toBe(false));
test("aggregate accepts an extra job that succeeded", () =>
  expect(requiredJobsSucceeded({ ...passing, extra: { result: "success" } })).toBe(true));
for (const value of [null, undefined, [], "success", {}, { checks: null }]) {
  test(`aggregate rejects malformed ${JSON.stringify(value)}`, () =>
    expect(requiredJobsSucceeded(value)).toBe(false));
}

const script = new URL("./ci-results.ts", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/u,
  "$1",
);
function runAggregate(value: string | undefined) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  delete env["REQUIRED_JOB_RESULTS"];
  if (value !== undefined) env["REQUIRED_JOB_RESULTS"] = value;
  return Bun.spawnSync(["node", script], { env });
}
test("aggregate CLI exits zero when every required job succeeded", () =>
  expect(runAggregate(JSON.stringify(passing)).exitCode).toBe(0));
for (const [name, value] of [
  ["a failed job", JSON.stringify({ ...passing, build: { result: "failure" } })],
  ["invalid JSON", "{bad"],
  ["JSON null", "null"],
  ["an unset variable", undefined],
] as const) {
  test(`aggregate CLI exits nonzero for ${name}`, () =>
    expect(runAggregate(value).exitCode).not.toBe(0));
}

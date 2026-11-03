import { expect, test } from "bun:test";
import { requiredJobsSucceeded } from "./ci-results";

const passing = {
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
for (const value of [null, undefined, [], "success", {}, { checks: null }]) {
  test(`aggregate rejects malformed ${JSON.stringify(value)}`, () =>
    expect(requiredJobsSucceeded(value)).toBe(false));
}

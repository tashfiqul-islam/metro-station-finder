import { expect, test } from "bun:test";

import { expectRejection } from "./test-support";

/** Runs `check` and returns what it threw, so these tests can assert that the helper fails correctly. */
async function failure(check: () => Promise<void>): Promise<Error> {
  try {
    await check();
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error("expected the check to fail");
}

test("expectRejection passes when the promise rejects, with or without a message", async () => {
  await expectRejection(Promise.reject(new Error("boom")));
  await expectRejection(Promise.reject(new Error("boom happened")), "boom");
  await expectRejection(Promise.reject("plain string"), "plain");
});

test("expectRejection fails when the promise fulfils", async () => {
  const error = await failure(() => expectRejection(Promise.resolve(1)));
  expect(error.message).toContain("Expected the promise to reject");
});

test("expectRejection fails when the message does not match, and says what it saw", async () => {
  const error = await failure(() => expectRejection(Promise.reject(new Error("actual")), "other"));
  expect(error.message).toContain("other");
  expect(error.message).toContain("actual");
});

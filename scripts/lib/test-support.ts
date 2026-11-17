/**
 * Test helper for asynchronous rejections.
 *
 * Bun's `expect(promise).rejects.toThrow(...)` returns a promise at run time, but its typings declare
 * `void`, so `await expect(...).rejects...` trips `typescript/await-thenable` now that test files are
 * typed against the real Bun types (METRO-26). This helper awaits the promise itself, so the `await`
 * is real in the types as well, and fails with a message that shows what was expected and seen.
 */

function describe(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * Passes when `promise` rejects (and, when `message` is given, the rejection's text contains it).
 * Fails when the promise fulfils.
 */
export async function expectRejection(promise: Promise<unknown>, message?: string): Promise<void> {
  const outcome = await promise.then(
    () => ({ rejected: false as const }),
    (reason: unknown) => ({ rejected: true as const, reason }),
  );
  if (!outcome.rejected) throw new Error("Expected the promise to reject, but it fulfilled");
  const seen = describe(outcome.reason);
  if (message !== undefined && !seen.includes(message))
    throw new Error(
      `Expected the rejection to contain ${JSON.stringify(message)}, got ${JSON.stringify(seen)}`,
    );
}

/**
 * The fastest of `rounds` runs of `work`, in milliseconds, for a test that guards an algorithm against a
 * quadratic blow-up with a time budget (METRO-125). A loaded machine delays some rounds; an algorithm that is
 * too slow is slow in every round, so the minimum keeps the budget exact and makes it independent of load.
 */
export function fastestMs(work: () => unknown, rounds = 5): number {
  let best = Number.POSITIVE_INFINITY;
  for (let round = 0; round < rounds; round += 1) {
    const started = performance.now();
    work();
    best = Math.min(best, performance.now() - started);
  }
  return best;
}

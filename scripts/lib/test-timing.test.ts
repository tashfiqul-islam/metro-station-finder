import { fastestMs } from "./test-timing";

function spin(ms: number): void {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // Busy wait: a sleep would let the timer, not the work, decide the duration.
  }
}

test("fastestMs runs the work once per round and reports the fastest round, not a slow first one", () => {
  let calls = 0;
  const fastest = fastestMs(() => {
    calls += 1;
    if (calls === 1) spin(100);
  }, 4);
  expect(calls).toBe(4);
  expect(fastest).toBeLessThan(100);
});

test("fastestMs does not hide work that is slow in every round", () => {
  expect(fastestMs(() => spin(30), 3)).toBeGreaterThanOrEqual(29);
});

test("fastestMs defaults to five rounds", () => {
  let calls = 0;
  fastestMs(() => {
    calls += 1;
  });
  expect(calls).toBe(5);
});

import {
  CLS_LIMIT,
  LCP_LIMIT_MS,
  cumulativeLayoutShift,
  describeVitals,
  evaluateVitals,
  type LayoutShift,
} from "./vitals-lab.ts";

const shift = (startTime: number, value: number, hadRecentInput = false): LayoutShift => ({
  startTime,
  value,
  hadRecentInput,
});

test("the limits are the web.dev good thresholds", () => {
  expect(LCP_LIMIT_MS).toBe(2500);
  expect(CLS_LIMIT).toBe(0.1);
});

test("no shifts score zero", () => expect(cumulativeLayoutShift([])).toBe(0));

test("shifts with recent input are ignored", () =>
  expect(cumulativeLayoutShift([shift(10, 0.5, true), shift(20, 0.02)])).toBeCloseTo(0.02, 10));

test("shifts less than 1 s apart share a session window", () =>
  expect(
    cumulativeLayoutShift([shift(100, 0.04), shift(1000, 0.04), shift(1900, 0.04)]),
  ).toBeCloseTo(0.12, 10));

test("a gap of 1 s or more starts a new window and the largest window wins", () =>
  expect(
    cumulativeLayoutShift([shift(100, 0.06), shift(1100, 0.05), shift(1200, 0.02)]),
  ).toBeCloseTo(0.07, 10));

test("a window closes after 5 s even without a 1 s gap", () => {
  const steady = Array.from({ length: 8 }, (_, index) => shift(index * 900, 0.03));
  // Shifts at 0 to 4500 ms share the first window (6 x 0.03); the 5400 ms shift starts a new one.
  expect(cumulativeLayoutShift(steady)).toBeCloseTo(0.18, 10);
});

test("values at the limits pass", () =>
  expect(evaluateVitals({ lcp: 2500, shifts: [shift(5, 0.1)] }).problems).toEqual([]));

test("an LCP over 2500 ms fails", () => {
  const verdict = evaluateVitals({ lcp: 3100.4, shifts: [] });
  expect(verdict.problems).toEqual(["LCP 3100 ms exceeds 2500 ms"]);
});

test("a CLS over 0.1 fails", () => {
  const verdict = evaluateVitals({ lcp: 800, shifts: [shift(5, 0.11)] });
  expect(verdict.problems).toEqual(["CLS 0.1100 exceeds 0.1"]);
});

test("a missing LCP fails instead of passing silently", () =>
  expect(evaluateVitals({ lcp: null, shifts: [] }).problems).toEqual([
    "LCP: the browser reported no largest-contentful-paint",
  ]));

test("both failures are reported together", () =>
  expect(evaluateVitals({ lcp: 9000, shifts: [shift(1, 0.5)] }).problems).toHaveLength(2));

test("the log line is stable", () => {
  expect(describeVitals(evaluateVitals({ lcp: 812.6, shifts: [shift(1, 0.0123)] }))).toBe(
    "web-vitals-lab LCP=813ms (limit 2500ms) CLS=0.0123 (limit 0.1)",
  );
  expect(describeVitals(evaluateVitals({ lcp: null, shifts: [] }))).toBe(
    "web-vitals-lab LCP=none (limit 2500ms) CLS=0.0000 (limit 0.1)",
  );
});

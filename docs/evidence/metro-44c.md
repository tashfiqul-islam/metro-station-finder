# METRO-44 part C evidence: lab web-vitals check and entry-chunk budget

Recorded 2026-11-08 on branch `ticket/metro-44c-lab-perf`, cut from `1aeef64` (tip of `feature/metro-rebuild` then). Labels: Repo-verified (read or run in this repository), Hosted-measured (read from a hosted run log), Web-verified (official web source), Unverified.

## What the lab check measures

`e2e/web-vitals-lab.e2e.ts` loads the built app (`vite build` then `vite preview`, the same server as every journey) with the Maps script stubbed, so no Google request is made. It reports and enforces:

| Vital | Limit (fails above)        | Source                                                         |
| ----- | -------------------------- | -------------------------------------------------------------- |
| LCP   | 2500 ms                    | web.dev Core Web Vitals "good" threshold at p75 (Web-verified) |
| CLS   | 0.1 (session-window score) | web.dev Core Web Vitals "good" threshold at p75 (Web-verified) |

How it collects (Repo-verified): an init script starts `PerformanceObserver`s for `largest-contentful-paint` and `layout-shift` with `buffered: true` before any page script runs. LCP is the `startTime` of the last LCP entry. Layout shifts with `hadRecentInput` are dropped, the rest are grouped into session windows (1 s gap, 5 s cap) and the largest window sum is the CLS (`scripts/vitals-lab.ts`, 100 percent covered by Bun tests). A page with no LCP entry fails.

Settle strategy (Repo-verified): wait for `load`, the shell heading to be visible, `document.fonts.ready` and two animation frames; then the page counts as settled when no new LCP or layout-shift entry has arrived for 500 ms. The check is on observed entries, not a fixed sleep, and is capped at 10 s: reaching the cap fails the test, so a page that never goes quiet cannot be measured by accident. No input is sent, so nothing is excluded as input-driven and LCP is not cut short by an interaction.

Proof it can fail (Repo-verified, same helper, same run): one control delays the main script 3 s with `page.route` and asserts LCP above 2500 ms is reported; one inserts a 400 px block at the top of the settled page and asserts CLS above 0.1 is reported. The threshold rules also have Bun unit tests with measured-value fixtures. Retries stay at 0.

## Limits

- Lab and synthetic: one machine class, one Chromium device profile (Desktop Chrome), a local static server, a stubbed Maps script, no network latency, no throttling. The numbers are a regression tripwire, not what users get. The wide margin below is the CI-noise tolerance.
- No INP: it needs real user interactions, which this check deliberately has none of. INP and field LCP/CLS come from the real-user beacon of part B.
- Chromium only. The Layout Instability API (`layout-shift`) is implemented by Chromium browsers; MDN labels it "Limited availability", and for Firefox and Safari support of both entry types the fetched page gave no versions (Unverified here). Firefox, WebKit and the mobile-chrome project therefore ignore the spec through `testIgnore` in `playwright.config.ts`; nothing in their projects was loosened.

## How to read a failure

The log line `web-vitals-lab LCP=<ms> (limit 2500ms) CLS=<score> (limit 0.1)` is printed by every run (also an annotation in the HTML report). A failure names the vital and the limit. A high LCP means the first large paint came late: look for a bigger entry chunk (`bun run bundle:check` prints every asset), a new blocking request or a changed hero element. A high CLS means something moved after first paint: look for content inserted above existing content, or an element without reserved size. The trace in `test-results/` shows the page. A "stayed quiet" failure means entries kept arriving for 10 s: something animates or re-renders continuously. Do not raise a limit to pass; the limits are the public thresholds.

## Entry-chunk budget

`bun run bundle:check` prints every emitted JS/CSS asset (largest first, raw and gzip bytes), the unchanged totals line, and `Entry chunk <path>: <raw> bytes raw; <gzip> bytes gzip (budget <raw> / <gzip>)`. The entry chunk is the module script named by `index.html`; a build with none fails closed.

| Number                        | Value                                                          |
| ----------------------------- | -------------------------------------------------------------- |
| Totals (unchanged)            | 250000 raw / 80000 gzip                                        |
| Entry budget (new)            | 247500 raw / 78500 gzip                                        |
| Entry on `1aeef64`            | 238537 raw / 75555 gzip (Repo-verified)                        |
| Entry on `eefd080` (merged)   | 240264 raw / 76109 gzip (Repo-verified)                        |
| Entry with part B, per ticket | 243513 raw / 77335 gzip (relayed in the task, not re-measured) |

The new budget is about 1.6 percent (raw) and 1.5 percent (gzip) above the relayed part B figure and 3.7 percent above this base. A new dependency of several kilobytes fails the entry check first.

## Measured numbers

Local (Windows 11, Playwright 1.64.1 Chromium, Desktop Chrome, `--workers=1 --repeat-each=5`, Repo-verified):

| Run | LCP (ms) | CLS    |
| --- | -------- | ------ |
| 1   | 80       | 0.0016 |
| 2   | 64       | 0.0037 |
| 3   | 68       | 0.0016 |
| 4   | 72       | 0.0037 |
| 5   | 140      | 0.0016 |

Controls (one run each, local): delayed script LCP 3088 ms; inserted block CLS 0.3152.

Hosted-measured (GitHub-hosted `ubuntu-24.04`, run 42486347140, job `Build and smoke`, Chromium, PR #106 as first pushed; read from the job log): the real check logged `web-vitals-lab LCP=128ms CLS=0.0037` (limits 2500 ms and 0.1). Controls in the same run: delayed script `LCP=3096ms`, inserted block `CLS=0.3129`. One hosted run only; it shows the margin (about 20 times under the LCP limit and 27 times under the CLS limit), not a distribution. The same job reported 46 passed and 1 skipped; the skip is not in the new spec.

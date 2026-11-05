# CI job timings, November 2026 (METRO-59)

Baseline of the `Quality` workflow, measured via `gh api` on 2026-11-05 (read-only calls), so CI speed work starts from numbers. The per-run, per-job data is committed in [ci-timings-2026-11.json](ci-timings-2026-11.json), so every figure below can be recomputed from the repository.

## Method

- Runs: `gh run list --workflow quality.yml --status completed --limit 60 --json databaseId,conclusion,event,headBranch,createdAt,headSha`, then the 20 most recent. Jobs: `gh api repos/tashfiqul-islam/metro-station-finder/actions/runs/<id>/jobs?per_page=100`.
- Duration of a job is `completed_at - started_at` of the job record, so queue time is excluded. The JSON holds `conclusion` and `seconds` per job (a skipped job has a meaningless value of 0 or -1).
- Only jobs whose conclusion is `success` or `failure` are counted. Skipped jobs (docs-only pull requests, pull requests without a preview, push runs, which never run the preview) and `cancelled` jobs are excluded and shown in the "Excluded" column.
- Failed runs are included, on purpose, and they bias the medians low: a job that failed stopped early. The 5 failed runs all failed in `Checks` (81 to 112 s) and 3 more runs were cancelled, so the `Checks` median of 110 s is below the success-only median of 128.5 s (12 runs, max 149 s). `Build and smoke` never failed in this sample.
- Cancelled runs: in the 3 cancelled runs `Checks` and `Build and smoke` were cancelled (excluded), while `Changes` and `Security` had already finished successfully and are counted. `Quality gates` runs with `always()`, so in a cancelled run it ran, saw the cancelled results and ended `failure`; that is why it is counted 20 times with 0 excluded (12 success, 8 failure; 5 failed runs and 3 cancelled runs). Its success-only median is also 9 s.
- Twenty runs is a small sample taken within one day (2026-11-05 06:57Z to 10:26Z), mixing pull request and `feature/metro-rebuild` push runs with warm and cold caches. Treat the numbers as a baseline, not a distribution.
- The runs predate METRO-47, so `Cloudflare preview` includes a restored Bun cache. It will be slower now that credentialed jobs run with `cache: false`; re-measure after this change lands (not measured).

Run ids (newest first): 42010765013, 42009477347, 41988900500, 41988456309, 41987648496, 41986946711, 41986873608, 41986830733, 41986369187, 41985898961, 41985812675, 41985785316, 41985270791, 41985216111, 41985174520, 41984993343, 41984966681, 41984508034, 41984330348, 41983910147. Conclusions: 12 success, 5 failure, 3 cancelled.

## Results

| Job                | Counted | Excluded | Median   | Max      |
| ------------------ | ------- | -------- | -------- | -------- |
| Changes            | 20      | 0        | 10 s     | 16 s     |
| Checks             | 17      | 3        | 1 m 50 s | 2 m 29 s |
| Build and smoke    | 17      | 3        | 2 m 49 s | 3 m 39 s |
| Security           | 20      | 0        | 19 s     | 29 s     |
| Cloudflare preview | 8       | 12       | 36 s     | 42 s     |
| Quality gates      | 20      | 0        | 9 s      | 15 s     |

## Decision on sharding

No job dominates, so no sharding or browser matrix is proposed.

- The `Quality gates` aggregate needs `changes`, `checks`, `build` and `security`. The `Cloudflare preview` job is outside that aggregate, so it is not on the gate path.
- The longest path to the gate is `Changes`, then `Build and smoke`, then `Quality gates`: 10 s + 169 s + 9 s = 188 s as a sum of medians. A sum of medians is not a median path time; computed per run (17 runs where all three finished) the median is 190 s and the maximum 237 s.
- `Build and smoke` is about 1.5 times `Checks` (110 s, or 128.5 s success-only), and the two run in parallel after `Changes`. `Security` (19 s) is far off the path.
- A browser matrix could save part of the 169 s in `Build and smoke`, but the split between the build and the Chromium, Firefox and WebKit smoke run inside that job was not measured (step durations were not collected), so the saving is unknown. Revisit if `Build and smoke` exceeds roughly twice `Checks`, or after measuring step durations.

No gate was weakened: `Quality gates` still needs `changes`, `checks`, `build` and `security`.

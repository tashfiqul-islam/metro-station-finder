# CI job timings, November 2026 (METRO-59)

Repo-verified baseline of the `Quality` workflow, measured 2026-11-05 so CI speed work starts from numbers.

## Method

- Runs: `gh run list --workflow quality.yml --status completed --limit 60 --json databaseId,conclusion,event,headBranch,createdAt,headSha`, then the 20 most recent. Jobs: `gh api repos/tashfiqul-islam/metro-station-finder/actions/runs/<id>/jobs`. Read-only calls.
- Duration of a job is `completed_at - started_at` of the job record, so queue time is excluded.
- Only jobs that ended `success` or `failure` count. Skipped jobs (docs-only pull requests and pull requests without a preview) and cancelled jobs have no meaningful duration and are counted in the "excluded" column.
- Median and maximum are over the counted jobs. Twenty runs is a small sample taken within one day (2026-11-05 06:57Z to 10:26Z), mixing pull request and `feature/metro-rebuild` push runs with warm and cold caches. Treat the numbers as a baseline, not a distribution.
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

No job dominates, so no sharding or browser matrix is proposed. `Build and smoke` is the longest job at a median of 169 s, about 1.5 times `Checks` (110 s), and the two run in parallel after `Changes` (10 s). The critical path is `Changes`, then `Build and smoke`, then `Cloudflare preview` (36 s), then `Quality gates` about 4 minutes in total at the median, with `Security` (19 s) far off the path. A browser matrix could save at most part of the 169 s, and the split between build and the Chromium, Firefox and WebKit smoke run inside that job is not measured here (step durations were not collected), so the saving is unknown. Revisit if `Build and smoke` exceeds roughly twice `Checks`, or after measuring step durations.

No gate was weakened: `Quality gates` still needs `changes`, `checks`, `build` and `security`.

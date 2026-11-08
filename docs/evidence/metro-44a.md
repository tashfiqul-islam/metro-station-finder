# METRO-44 part A evidence: uptime probe

Frozen record, 2026-11-08. Pull request 105, revision of branch `ticket/metro-44a-uptime-probe`. Labels: Repo-verified, Hosted-measured, Unverified. Operating detail: [uptime runbook](../agents/uptime-runbook.md).

## Repo-verified

- `mise exec -- bun run check` exit 0 (1,182+ Bun tests, per-file 100 percent lines and functions for `scripts/uptime-probe.ts` and `scripts/api-envelope.ts`, vitest, `tsc -b`, workflow lint); `mise exec -- bun run build` exit 0. The preview smoke tests (`scripts/preview.test.ts`) pass unchanged.
- Failure modes with a negative fixture (local 127.0.0.1 server or fake fetch): page status (500, 204), page content type, wrong or missing page security header, empty CSP; API status (200, 500), envelope mismatch (JSON and non-JSON), missing `x-request-id`, wrong API security header; redirect (302 to another origin, 301, opaque status 0); timeout (server that never answers, abort error); refused connection; DNS failure; bad base URL (http, localhost, credentials, path, query, fragment); missing base URL. A planted marker in a body, a header and an error text never appears in the output.
- The workflow is covered by `scripts/uptime-probe-workflow.test.ts` and, as an uncredentialed job, by the existing policy in `scripts/ci-hardening.test.ts` (cache stays on, pins, concurrency); no policy file changed.

## Hosted-measured

- `Cloudflare preview` job of pull request 105 (run 42486228021) deployed `https://metro-scaffold-pr-105.tashfiq61.workers.dev`. `bun scripts/uptime-probe.ts` run from a developer machine against that URL printed "Uptime probe passed" and exited 0. Run without a base URL it exited 1 with the not-configured message.

## Unverified

- Dispatching the workflow from the pull request branch is impossible: `gh workflow run uptime-probe.yml --ref ticket/metro-44a-uptime-probe` answered HTTP 404 "workflow uptime-probe.yml not found on the default branch" (the default branch is `master`). So no hosted run of `uptime-probe.yml` exists, and no run id can be recorded. The first hosted run is possible once the file is on the default branch, by dispatch with a `base-url`.
- Scheduled runs, notification delivery, the Workers Logs steps of the triage runbook, and GitHub's scheduling behaviour and billing for this public repository.
- The probe against the production origin: it does not exist before the v1.0.0 cutover.

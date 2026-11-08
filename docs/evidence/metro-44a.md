# METRO-44 part A evidence: uptime probe

Frozen record, 2026-11-08. Pull request 105, revision of branch `ticket/metro-44a-uptime-probe`. Labels: Repo-verified, Hosted-measured, Unverified. Operating detail: [uptime runbook](../agents/uptime-runbook.md).

## Repo-verified

- `mise exec -- bun run check` exit 0 (1,182+ Bun tests, per-file 100 percent lines and functions for `scripts/uptime-probe.ts` and `scripts/api-envelope.ts`, vitest, `tsc -b`, workflow lint); `mise exec -- bun run build` exit 0. The preview smoke tests (`scripts/preview.test.ts`) pass unchanged.
- Failure modes with a negative fixture (local 127.0.0.1 server or fake fetch): page status (500, 204), page content type, wrong or missing page security header, empty CSP; API status (200, 500), envelope mismatch (JSON and non-JSON), missing `x-request-id`, wrong API security header; redirect (302 to another origin, 301, opaque status 0); timeout (server that never answers, abort error); refused connection; DNS failure; bad base URL (http, localhost, credentials, path, query, fragment); missing base URL. A planted marker in a body, a header and an error text never appears in the output.
- The workflow is covered by `scripts/uptime-probe-workflow.test.ts` and, as an uncredentialed job, by the existing policy in `scripts/ci-hardening.test.ts` (cache stays on, pins, concurrency); no policy file changed.

## Hosted-measured

- `Cloudflare preview` job of pull request 105 (run 42486228021) deployed `https://metro-scaffold-pr-105.tashfiq61.workers.dev`. `bun scripts/uptime-probe.ts` run from a developer machine against that URL printed "Uptime probe passed" and exited 0. Run without a base URL it exited 1 with the not-configured message.

## Review round (same day, script revision after the independent review)

- Added and tested: the echoed `x-request-id` must equal the id sent (mode `api-request-id-mismatch`); the API body is read up to 16 KB (mode `api-body-too-large`, fixture with a body one byte over and with an endless stream; a body of exactly 16 KB passes); a stalled body ends as `timeout` (fixture: headers and one byte, then silence), a body that errors while read as `network`; https hosts that are IP literals (including `0x7f.1`, IPv6), `localhost`, `.local`, `.internal` and single labels are refused; `http://127.0.0.1` needs `PROBE_ALLOW_LOOPBACK=1` (the CLI refuses it without, tested). A test compares the four expected header values with `apps/web/public/_headers` and with `apps/api/src/security-headers.test.ts`.
- The workflow job has `if: github.event_name != 'schedule' || vars.PRODUCTION_URL != ''`; the test asserts that exact text. Dispatch never skips.
- `scripts/preview.test.ts` has no assertion on the old valibot message (grep for `valibot`, `Unknown API` and `envelope` found nothing).
- `docs/agents/observability.md` is 3,579 bytes after the edit (cap 6,144).
- `bun run check` exit 0 (Bun coverage 100 percent per file), `bun run build` exit 0.
- Hosted-measured again: `bun scripts/uptime-probe.ts https://metro-scaffold-pr-105.tashfiq61.workers.dev` (the pull request's own preview, deployed from the earlier head; the app code is unchanged since) printed "Uptime probe passed", exit 0, so the live Worker echoes the probe's id. Against `http://127.0.0.1:1` without the flag: exit 1, bad-URL message.
- The job-level `if` with an unset variable (`null != ''` in the expression language) is Repo-verified only as text and by `actionlint`; its hosted evaluation is Unverified.

## Unverified

- Dispatching the workflow from the pull request branch is impossible: `gh workflow run uptime-probe.yml --ref ticket/metro-44a-uptime-probe` answered HTTP 404 "workflow uptime-probe.yml not found on the default branch" (the default branch is `master`). So no hosted run of `uptime-probe.yml` exists, and no run id can be recorded. The first hosted run is possible once the file is on the default branch, by dispatch with a `base-url`.
- Scheduled runs, notification delivery, the Workers Logs steps of the triage runbook, and GitHub's scheduling behaviour and billing for this public repository.
- The probe against the production origin: it does not exist before the v1.0.0 cutover.

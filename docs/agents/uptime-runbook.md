# Uptime probe, SLO and triage runbook

Status: written for METRO-44 part A on 2026-11-08; the hosted scheduled behaviour is Unverified until the default-branch switch. Labels: Repo-verified (read in this repository), Unverified (not run or not checked here). Standing log rules: [observability](observability.md). Rollback: [deploy runbook](deploy-runbook.md), section 7. Evidence: [metro-44a](../evidence/metro-44a.md).

## What the probe is (Repo-verified)

`.github/workflows/uptime-probe.yml` runs `bun scripts/uptime-probe.ts` with no secret, no environment and `contents: read`. The script makes two requests and nothing else:

1. `GET /` must be 200, `text/html`, with `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy` at the values in `apps/web/public/_headers` and a non-empty `content-security-policy`.
2. `GET /api/uptime-probe-does-not-exist` with a generated `x-request-id` (`uptime-probe-<base36 time>`) must be the 404 error envelope, echo that exact `x-request-id`, and carry the four fixed security headers of `apps/api/src/app.ts`. The envelope check is shared with the preview smoke (`scripts/api-envelope.ts`).

The four expected header values are compared by a test with `_headers` and with `apps/api/src/security-headers.test.ts`, so a header change fails a test first. Each request has a 10 s limit that also covers reading the body (a server that sends headers and then stalls ends as a timeout); the body is read up to 16 KB; redirects are not followed (any 3xx fails). Every failure is one fixed message; the script never prints a body, a header value, an error text or the URL beyond its origin. The base URL must be a bare https origin with a DNS name: IP literals, `localhost` and local suffixes are refused, and `http://127.0.0.1` is accepted only when `PROBE_ALLOW_LOOPBACK=1`, which only the tests set.

## Set it up

- `PRODUCTION_URL` is one repository variable shared with `production-deploy.yml` (its environment URL and its smoke read it). It is created in [deploy runbook](deploy-runbook.md) section 5 (`gh variable set PRODUCTION_URL --repo $R --body "https://<domain>"`, origin only). Do not change it for the probe's sake: a trailing path or query breaks the deploy smoke, and a value the deploy needs but the probe refuses (an IP address, a local name) breaks the probe. This document records no URL.
- A dispatched run may pass `base-url` instead; it wins over the variable.
- Unset variable: a scheduled run skips the whole job (job-level `if`). GitHub shows it as Skipped, not green, with no notification. A dispatch with no URL, and a variable that is set but invalid, still fail loudly.
- The window to know: the default-branch switch ([cutover runbook](cutover-runbook.md) step 3) comes before `PRODUCTION_URL` is set, so from the switch until the variable exists the schedule runs and every run is Skipped. Nothing is watching production in that window.
- Residual risk: someone deletes or blanks the variable later and the probe goes quiet, because skipped runs raise no alarm. Mitigations: the cutover gate in the cutover runbook (variable set, dispatch green, a recent non-skipped scheduled run) and the monthly check below.
- The schedule is inert until the default-branch switch (GitHub runs schedules only from the default branch). Dispatch needs the file on the default branch too (a dispatch from a pull request branch answered HTTP 404), so before the switch run the script by hand: `bun scripts/uptime-probe.ts <origin>`. After the switch: `gh workflow run uptime-probe.yml --repo $R --ref main` or Actions, Uptime probe, Run workflow (Unverified until run).
- A failed run is announced only by GitHub's normal workflow-failure notifications (same decision as the token check, [maintenance runbook](maintenance-runbook.md)); routing to the owner depends on their notification settings (Unverified). No pager exists.

## Monthly owner check

GitHub disables scheduled workflows in a repository with no activity for 60 days (GitHub documentation, Unverified here), and a deleted variable makes every run Skipped. Once a month:

```powershell
gh run list --repo $R --workflow uptime-probe.yml --event schedule --limit 1 --json conclusion,createdAt
```

The newest run must be `success` and less than 2 hours old; `skipped` means the variable is missing, and no recent run means schedules stopped. Fix the variable ([deploy runbook](deploy-runbook.md) section 5) or run `gh workflow enable uptime-probe.yml --repo $R`, then dispatch once. No existing owner-run check script fits this (`cutover-preflight` and `github-settings` run at other moments), so none was extended.

## SLO

- Objective: 99.5 percent of EXECUTED probe runs in a calendar month pass, measured by this probe only. Skipped runs (variable unset) are excluded from the denominator and from the budget: a skipped run observed nothing, so counting it as up would invent availability and counting it as down would charge an outage nobody measured.
- Error budget: 0.5 percent of a 29 to 31 day month is 216 to 223 minutes, which at a nominal 30 minutes per failed run is 7 failed runs (6 in a 28 day February). The 8th failed run in a 29 to 31 day month, or the 7th in February, breaches.
- Why 99.5: one Worker with static assets, one owner, no on-call, no paid monitoring. It allows about 3.6 hours a month, enough for a bad deploy found and rolled back in business hours, strict enough that a day-long outage is a breach. Revisit after three months of data; this is a target, not a promise to anyone.
- Cadence: nominally every 30 minutes at :07 and :37 (about 1,440 runs a month, each under a minute). 15 minutes doubles the runs for little gain at this SLO. The repository is public, so standard runners should not be billed (Unverified here). GitHub schedules drift and can be delayed or dropped under load (GitHub documentation, Unverified here), so the cadence is nominal; read the failure count together with the number of executed runs.
- Accounting is coarse and approximate in both directions. A failed run is charged 30 minutes, which overstates a short blip the probe happened to catch (a 2 minute outage costs 30) and understates an outage that fell between runs (a 25 minute outage can be missed entirely, and one failed run can stand for up to about 60 minutes of real downtime).
- The probe sees the site from GitHub's network, not users' browsers, and checks reachability and headers, not the station search (that needs the visitor's Google key and location, which the probe never uses).

## Triage: failing run to the request id

1. Open the failed run. The log has the fixed message and, when a request was sent, the line `x-request-id sent to the API route: uptime-probe-...`. That id is generated by the script, not taken from the network, and is the search key.
2. Read the message and pick the row.

| Message                                                                                                                                    | Meaning                                                                                           | First check                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| no base URL, or base URL must be a bare https origin                                                                                       | configuration (a scheduled run with the variable unset is Skipped instead)                        | the `PRODUCTION_URL` variable or the dispatch input                                                                                     |
| request timed out, or could not connect                                                                                                    | Worker, DNS or TLS unreachable, or a body that stalls                                             | open the site from a browser; Cloudflare's status page; Workers Metrics for the Worker (no log line is written if the Worker never ran) |
| got a redirect                                                                                                                             | a redirect rule or domain change sits in front of the Worker                                      | the custom domain and redirect rules                                                                                                    |
| GET / did not return 200 / text/html / missing a security header                                                                           | static assets or `_headers` changed                                                               | the last production deploy run; a page request writes no Workers Logs line, so there is nothing to search                               |
| Unknown API route did not return 404 / the error envelope / no x-request-id / missing a security header / body larger than the probe reads | the Worker code or its routing changed                                                            | step 3                                                                                                                                  |
| did not echo the x-request-id the probe sent                                                                                               | something in front of or inside the Worker replaces the id, so logs cannot be matched to requests | step 3, then the middleware in `apps/api/src/app.ts`                                                                                    |

3. Workers Logs: in the Cloudflare dashboard open the Worker's Logs and filter on `requestId` equal to the printed id (the app echoes a client id that matches `^[A-Za-z0-9_-]{8,64}$` and logs it). A healthy request is one line with `path` `/api/*` and `status` 404. A `status` of 5xx, or a line with `event` `error` and an `errorName`, shows the app failed. No line at all means the request never reached the app: `invocation_logs` is off by design, so turn it on to diagnose such an outage ([observability](observability.md)). Search soon: Workers Logs keeps 3 to 7 days. The dashboard path is not recorded here (Unknown).
4. If the last deploy is the likely cause, roll back first and investigate after: [deploy runbook](deploy-runbook.md), section 7. Re-dispatch the probe to confirm recovery; a green dispatch is the observation that proves it.
5. Count the incident's failed runs against the month's budget.

## Not verified

- Hosted scheduled runs, the job-level skip when the variable is unset, notification delivery and the Workers Logs dashboard steps: Unverified until the default-branch switch and a live production URL.

# METRO-123 evidence: `fetch("/favicon.ico")` under Playwright Chromium

Date: 2026-11-10. Base: `c74d80c` plus the later merge of `feature/metro-rebuild`. Windows 11, Node 25.1.0, Playwright 1.64.1 (the same version when METRO-106 saw the failure; `bun.lock` is unchanged for it since 2026-11-03). Labels: Repo-verified, Unverified.

## Outcome

Cause found (Repo-verified): Playwright's own network layer aborts any `/favicon.ico` request while request interception is active. It is a test-tool artefact; the Worker, `_headers`, the CSP, nosniff and the content type are not involved. `favicon.ico` stays out of the precache anyway (decision below). The offline tab icon comes from `favicon.svg`, which is precached.

## The cause

`playwright-core@1.64.1`, `lib/coreBundle.js`: a request whose URL ends with `/favicon.ico` is flagged `_isFavicon` (line 14221). In the frame network code (line 24598), when the request arrives through interception (`route2` exists, which is the case as soon as the page or context has any `route`), it is aborted with `route2.abort("aborted")`, and the request, response and `requestfailed` events are suppressed for favicon requests (lines 24609 to 24629). A page `fetch("/favicon.ico")` therefore rejects with a `TypeError` and no event fires, while `/favicon.ico?x=1` (the URL no longer ends with `/favicon.ico`) works.

Minimal reproduction (throwaway script, not committed), Chromium, the built app on `vite preview`:

| Setup                                                                                                  | `fetch("/favicon.ico")` | `fetch("/favicon.ico?x=1")` |
| ------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------------- |
| no route                                                                                               | 200                     | 200                         |
| `page.route` for a host that never matches                                                             | `TypeError`             | 200                         |
| `context.route` for a host that never matches                                                          | `TypeError`             | 200                         |
| `page.route("**/*", continue)`                                                                         | `TypeError`             | 200                         |
| any of the routes above, page without the icon link (`/robots.txt`), `cache: "reload"` or `"no-store"` | `TypeError`             | not tried                   |
| the repository's shared e2e fixture (it routes the Google hosts), workers blocked, then allowed        | `TypeError`             | 200                         |

This is why METRO-106 saw it only in its e2e tests (the shared fixture in `e2e/fixtures.ts` always installs a route) and why a plain Node server made no difference. Earlier standalone attempts in this ticket (no route) all returned 200, which is the control.

## Difference from METRO-106's history

METRO-106 never committed its probe (commits `eda9c2d`, `adf71ba`, `ef5a9dd`, `c9ea5ff`, `39c8f7c` hold only the conclusions). What they record: a page or worker `fetch("/favicon.ico")` fails under Playwright Chromium, `?x=1` works, a Node server answering 200 everywhere behaves the same, no `requestfailed` event fires. All four match the cause above. METRO-106 also wrote that the failure "made the whole install fail"; the same commit `eda9c2d` fixed the worker's detached `fetch` ("Illegal invocation", every install failed), so that install failure was most likely the detached fetch and not the icon (Unverified: the probe is not in the history). Playwright and Chromium are the same versions then and now.

## What was tried (Repo-verified, `vite preview` on port 4199, Chromium)

| Attempt                                                                                                                                                 | Result                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Page at `/robots.txt` and at `/`, workers blocked and allowed, no route                                                                                 | all 200; `image/vnd.microsoft.icon`, 3,474 bytes, nosniff, the app CSP |
| `context.request.get("/favicon.ico")`                                                                                                                   | 200, same headers                                                      |
| Plain Node server, page declaring the icon, headless and headed, two fetches per page right after `commit`                                              | all 200 (10 of 10 pages)                                               |
| Worker install with `favicon.ico` forced into the precache, 13 fresh contexts, and `e2e/offline-shell.e2e.ts` (17 tests) with the shared fixture routes | the cache held `/favicon.ico` every time, 17 of 17 passed              |
| The routes table above                                                                                                                                  | the cause                                                              |

So the worker's own `fetch` is not stopped by page routes (Repo-verified by the last two rows); the artefact hits page-side fetches in tests.

## Decision: do not precache `/favicon.ico`

- `installShell` (`apps/web/src/sw/worker.ts`, lines 137 to 156) is all or nothing: `fetchShellFile` (lines 105 to 114) throws unless a file is a plain 200 that is not redirected and not HTML (except `/`), `Promise.allSettled` collects the failures, and the first one rejects the install, so the old worker stays and no update ever installs. One file that fails for a reason nobody has found in production would block the offline shell and every update for everyone.
- The cost of leaving it out is cosmetic: the page declares `favicon.svg`, which is precached (a browser that prefers the `.ico` shows no tab icon offline).
- A precached file also takes part in the cache version: `scripts/sw-plugin.ts` hashes every shell path and its bytes, so an icon edit would change the version. Not precached, `/favicon.ico` is a plain network request (`route` kind `pass`, `worker.ts` line 98) online and fails offline.
- What would change the decision: a best-effort optional-paths list in the worker, fetched after a successful install and ignored on failure. That is a worker change and needs its own ticket.

## Changes in this ticket

Docs and one comment only: this file, the ADR-0024 precache sentence and Unverified line, and the `NOT_SHELL` comment in `scripts/sw-plugin.ts`. No behaviour, test or limit changed. An earlier commit on this branch precached the file (with a unit test and an offline assertion); a later commit on this branch reverts it.

## Unverified

- Whether any production browser fails on `/favicon.ico` (not observed; not ruled out).
- That METRO-106's install failure was the detached `fetch` rather than anything about the icon (its probe is not in the history).
- Firefox and WebKit: whether they abort favicon requests under interception (Playwright's code is browser-neutral, not run).

# METRO-123 evidence: `fetch("/favicon.ico")` under Playwright Chromium

Date: 2026-11-10. Base: `c74d80c` (`feature/metro-rebuild`). Windows 11, Node 25.1.0, Playwright 1.64.1, Chromium from the matching Playwright download. Labels: Repo-verified, Unverified.

## Outcome

The failure METRO-106 recorded does not reproduce (Repo-verified). `favicon.ico` is now part of the precache, with a unit test and an offline end-to-end assertion. The original cause stays Unverified: with the same Playwright version nothing fails, so there is nothing left to bisect.

## What METRO-106 saw

[metro-106](metro-106.md): a script `fetch("/favicon.ico")` from a page failed under Playwright Chromium, `/favicon.ico?x=1` and other names worked, even against a plain Node server answering 200 everywhere, and no `requestfailed` event fired. The file was left out of the precache so the install could not fail on it.

## Reproduction attempts (Repo-verified)

All against the built app served by `vite preview` (Worker in workerd) on port 4199, Chromium via Playwright 1.64.1, throwaway scripts that are not committed.

| Attempt                                                                                                                                                                                                                        | Result                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page at `/robots.txt`, `fetch` of `/favicon.ico`, `?x=1`, `/./favicon.ico`, `/favicon.svg`, workers blocked                                                                                                                    | all 200; `/favicon.ico` is `image/vnd.microsoft.icon`, 3,474 bytes, `x-content-type-options: nosniff`, the app CSP; no `requestfailed`, no console error |
| Page at `/` (declares `<link rel="icon" href="/favicon.ico">`), workers blocked, then allowed                                                                                                                                  | all 200                                                                                                                                                  |
| `context.request.get("/favicon.ico")`                                                                                                                                                                                          | 200, same headers                                                                                                                                        |
| Plain Node server answering `/favicon.ico` with 200 and the page declaring the icon, headless and headed, 5 fresh pages each, two fetches per page right after `commit` (while the browser's own favicon request is in flight) | all 200 (10 of 10 pages)                                                                                                                                 |
| Worker install with `favicon.ico` in the precache, 13 fresh contexts                                                                                                                                                           | the cache holds `/favicon.ico` every time; the request is made by the worker and gets 200                                                                |
| `e2e/offline-shell.e2e.ts`, Chromium, `favicon.ico` in the precache                                                                                                                                                            | 17 of 17 pass                                                                                                                                            |

Eliminated by these runs: Worker routing, `_headers` (nosniff, content type for `.ico`, cache control), the CSP, the preview server, the service worker intercepting, and the browser's own favicon request racing the script fetch. What remains is something about the original test environment (an older Chromium build, a page state or route handler of that test, load); which one is Unverified.

## Change

- `scripts/sw-plugin.ts`: `favicon.ico` leaves `NOT_SHELL`. Cost: +3,474 bytes in the precache, `sw.js` 3,977 bytes raw (limit 6,000).
- `scripts/sw-plugin.test.ts`: the expected shell list gains `/favicon.ico`.
- `e2e/offline-shell.e2e.ts`: with the network off, `fetch("/favicon.ico")` returns 200 with an icon content type. Mutation check: with `favicon.ico` excluded again, this test fails; restored.
- ADR-0024 updated to say the file is precached.

## Unverified

- The original cause, and whether real Chrome ever behaved that way.
- Firefox and WebKit offline behaviour of the new assertion (the test skips Firefox like its neighbours; WebKit and Pixel 7 Chromium not run locally).
- The full gate, bundle gate and smoke on this head (see the pull request for what was run).

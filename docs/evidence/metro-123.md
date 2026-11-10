# METRO-123 evidence: `fetch("/favicon.ico")` under Playwright Chromium

Date: 2026-11-10. Base: `4e209ab` (`feature/metro-rebuild`, merge of METRO-130); the change is the tip of `ticket/metro-123-favicon-ico`, whose SHA is in the pull request (a commit cannot name itself). Windows 11, Node 25.1.0, Playwright 1.64.1 (the version METRO-106 used; `bun.lock` has not changed it since 2026-11-03). Labels: Repo-verified, Inferred, Unverified.

## Outcome

- Cause (Repo-verified): Playwright aborts every `/favicon.ico` request while the request is intercepted. It is a test-tool behaviour; the Worker, `_headers`, the CSP, nosniff and the content type are not involved.
- Decision: `favicon.ico` joins the precache. `index.html` declares it (`<link rel="icon" href="/favicon.ico" sizes="48x48" />`, Repo-verified), so a browser that picks that icon keeps it offline; `favicon.svg` and `apple-touch-icon.png` were already cached.
- A test reads the cache; it never fetches the file from a page, because that is the call Playwright aborts.

## Cause (Repo-verified from source)

`playwright-core@1.64.1`, `lib/coreBundle.js`: a request whose URL ends with `/favicon.ico` is flagged `_isFavicon` (line 14221). When the request is intercepted (a `route2` exists, as soon as the page or context has any `route`), it is aborted with `route2.abort("aborted")` (line 24598), and the request, response, request-finished and `requestfailed` events are suppressed for it (lines 24609 to 24629). A page `fetch("/favicon.ico")` rejects with `TypeError` and no event fires; `/favicon.ico?x=1` does not end with `/favicon.ico`, so it passes.

## Reproduction (Repo-verified)

Built app on `vite preview`, port 4199, Chromium. The scripts were throwaway and are not committed.

| Setup                                                                                             | `fetch("/favicon.ico")`                      | `fetch("/favicon.ico?x=1")` |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------- |
| no route, page at `/` or `/robots.txt`, workers blocked or allowed                                | 200, `image/vnd.microsoft.icon`, 3,474 bytes | 200                         |
| `page.route` for a host that never matches                                                        | `TypeError`                                  | 200                         |
| `context.route` for a host that never matches                                                     | `TypeError`                                  | 200                         |
| `page.route("**/*", continue)`                                                                    | `TypeError`                                  | 200                         |
| any route, page without the icon link, `cache: "reload"` or `"no-store"`                          | `TypeError`                                  | not tried                   |
| the shared e2e fixture (it routes the Google hosts)                                               | `TypeError`                                  | 200                         |
| `context.request.get("/favicon.ico")` (not a page fetch)                                          | 200                                          | not tried                   |
| plain Node server answering 200, page declaring the icon, no route, headless and headed, 10 pages | 200                                          | not tried                   |

The shared fixture in `e2e/fixtures.ts` always installs a route, which is why only the e2e tests saw it. The worker's own `fetch` is not intercepted by page routes: with `favicon.ico` in the precache and the fixture routes active, 13 fresh worker installs cached it, and the 17 tests of `e2e/offline-shell.e2e.ts` passed (Repo-verified).

## Inferred

- METRO-106's probe is not in the history (`eda9c2d`, `adf71ba`, `ef5a9dd`, `c9ea5ff`, `39c8f7c` hold only conclusions). Every symptom it recorded matches the cause above: a page fetch fails, `?x=1` works, a plain Node server behaves the same, no `requestfailed` event.
- METRO-106 wrote that the icon "made the whole install fail". The same commit (`eda9c2d`) fixed the worker's detached `fetch` ("Illegal invocation", every install failed), so the install failure was most likely that bug, not the icon.

## Risk note

`installShell` (`apps/web/src/sw/worker.ts`) is all or nothing for every shell file: `fetchShellFile` throws unless the response is a plain 200, not redirected, and HTML only for `/`; the first rejection fails the install and no update installs. `favicon.ico` carries the same risk as any other file in the list, no more. No production failure of it was seen; none is ruled out.

Cost: +3,474 bytes in the precache. `sw.js` is 3,977 raw / 1,790 gzip (limits 6,000 / 2,800); first-visit JS and CSS are unchanged. No limit changed.

## Tests

- `scripts/sw-plugin.test.ts`: the expected shell list gains `/favicon.ico`.
- `e2e/offline-shell.e2e.ts` (deep-link test): the keys of the shell cache include `/favicon.ico`, read with `caches.open(...).keys()`. Mutation check: with `favicon.ico` excluded again in `NOT_SHELL`, this assertion fails (result in the pull request); restored.

## Unverified

- Whether Firefox and WebKit abort favicon requests under interception (Playwright's code is browser-neutral; not run).
- Any production failure of `/favicon.ico` in a real browser.
- That the detached `fetch` was METRO-106's install failure (its probe is not in the history).

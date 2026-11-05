# Browser test tool spike: Playwright Test vs WebdriverIO (METRO-76)

Measured 2026-11-05/06 on Windows 11 (10.0.26300), Node 26.13.0 and Bun 1.4.4 through `mise exec`, against repo revision `c98f407` (`feature/metro-rebuild`). Decision: [ADR-0017](../adr/0017-browser-test-tool.md). Labels: Repo-verified (read or ran in this repo), Context7-verified, Web-verified (official page fetched), Measured (my own run), Unverified.

## Method

The spike lived outside the repository (a scratch directory, never committed; the repo's `package.json`, `bun.lock` and configs are untouched). It served the same built app as `playwright.config.ts` does: `mise exec -- bun run build`, then `node ../../node_modules/vite/bin/vite.js preview` in `apps/web` on `http://127.0.0.1:4173` (the Worker running in workerd). Three representative tests were ported to WebdriverIO 10.1.0: an ARIA snapshot test (`accessibility.e2e.ts`, success and error state), the axe scan (target-size rule and a zero-violation scan of the app page), and the request-header and CSP checks (`headers.e2e.ts`). Result: 8 WebdriverIO tests in 3 spec files, all passing on Chrome 156, Firefox and Chrome mobile emulation. The port is a spike, not a migration: it does not carry the console and page error guard, the per-test axe guard, or the WebKit noise handling.

Install: `mise exec -- bun add --cwd <scratch> -d --exact webdriverio@10.1.0 @wdio/cli@10.1.0 @wdio/local-runner@10.1.0 @wdio/mocha-framework@10.1.0 @wdio/spec-reporter@10.1.0 @axe-core/webdriverio@4.14.0`. The scratch directory has no `bunfig.toml`, so the 3-day cooldown was not applied there; every version used is older than three days (10.1.0 was published 2026-10-18). Run: `node node_modules/@wdio/cli/bin/wdio.js run wdio.conf.js` with `WDIO_BROWSER=chrome|firefox|mobile`.

## Baseline: Playwright Test in this repo (Measured)

| Run                                       | Command                                                                              | Result                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Local Chromium, 3 runs                    | `mise exec -- bun run smoke`                                                         | 31 passed in 3.9 s, 4.1 s, 4.3 s (wall 4.4 s, 4.7 s, 4.9 s)                                          |
| Full CI matrix, shuffled                  | `CI=true`, `bun run smoke -- --shuffle`                                              | 124 tests, 10 workers, shuffle seed 690028522: 121 passed, 3 skipped, 29.5 s (wall 30.0 s)           |
| Same tests as the spike, Chromium, 3 runs | `playwright test e2e/headers.e2e.ts e2e/accessibility.e2e.ts -g <the ported titles>` | 7 passed in 3.1 s, 3.5 s, 2.8 s (wall 3.7 s, 4.3 s, 3.3 s, including Playwright starting the server) |

The axe zero-violation scan is a per-test auto fixture in Playwright and an explicit test in the spike, so the counts are 7 versus 8.

## WebdriverIO runs (Measured)

| Browser                                                              | Run     | Wall time           | Result                                                                                                                  |
| -------------------------------------------------------------------- | ------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Chrome 156.0.8078.80                                                 | 1, 2, 3 | 3.9 s, 3.9 s, 3.9 s | 3 spec files passed (runner reports 2 s)                                                                                |
| Firefox (headless)                                                   | 1       | 22.9 s              | passed; the first run fetched Firefox and geckodriver (size and split not measured)                                     |
| Firefox                                                              | 2, 3    | 6.7 s, 6.1 s        | passed (the BiDi network mock works on Firefox too)                                                                     |
| Chrome, `mobileEmulation: { deviceName: "Pixel 7" }`                 | 1, 2, 3 | 3.7 s, 3.7 s, 3.6 s | passed                                                                                                                  |
| Chrome, empty driver cache (`cacheDir` pointed at a fresh directory) | 1       | 7.8 s               | chromedriver downloaded (25 MB); Chrome was already installed on this host, so a cold browser download was not measured |

The server was started beforehand for WebdriverIO and by the config for Playwright, so the two differ by about 0.5 s. At this size the tools are at parity on speed. The spike has 3 spec files, so WebdriverIO opens 3 sessions; Playwright runs each test in a fresh context of one shared browser. Scaling to the full suite is not measured.

## Comparison

| Point                                    | Playwright Test 1.64.1 (in repo)                                                                                                                                                                                                 | WebdriverIO 10.1.0 (spike)                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup and config size                    | `playwright.config.ts` 33 lines; shared fixtures give console, page-error and axe guards to every test (Repo-verified)                                                                                                           | `wdio.conf.js` 20 lines plus `helpers.ts` 11, for a spike with none of the fixtures (Measured)                                                                                                                                                                                                                                                                                                                                                                       |
| Packages installed                       | 5 packages (`@playwright/test`, `playwright`, `playwright-core`, `@axe-core/playwright`, `axe-core`), 21.2 MB, no runtime dependencies in the lock (Repo-verified: `bun.lock`, `node_modules/.bun`)                              | 312 packages installed by Bun, 241 top-level directories, 97 MB, for the minimal mocha stack (Measured). `bun.lock` has 354 entries                                                                                                                                                                                                                                                                                                                                  |
| Install scripts                          | none                                                                                                                                                                                                                             | 1 blocked postinstall: `edgedriver@8.0.0` (`bun pm untrusted`). The repo's `trustedDependencies` is `[]`, so it would stay blocked; the Chrome and Firefox drivers were downloaded at run time by WebdriverIO, not by install scripts (Measured)                                                                                                                                                                                                                     |
| Browsers and cold CI cost                | `playwright install` fetches pinned Chromium, Firefox and WebKit; ADR-0005 states about 40 s cold, cached otherwise (Repo-verified, document)                                                                                    | Uses system browsers. The ubuntu-24.04 image lists Chrome 156.0.8078.47, ChromeDriver, Firefox 158.0.1 and Geckodriver 0.37.1 (Web-verified: actions/runner-images `Ubuntu2404-Readme.md`), so no browser download, but versions float with the runner image instead of being pinned to the library version. No WebKit                                                                                                                                               |
| Parallelism and isolation                | `fullyParallel`: every test in its own context, 10 workers on the CI matrix (Repo-verified)                                                                                                                                      | One worker process and one browser session per spec file; tests in a file share the session (Measured: 3 session IDs for 3 files). Cookies and storage leak between tests in a file unless reset by hand                                                                                                                                                                                                                                                             |
| ARIA snapshots                           | `toMatchAriaSnapshot` with YAML templates, regexes, `/children: equal`, `--update-snapshots` (Web-verified: playwright.dev aria-snapshots; used in `accessibility.e2e.ts`)                                                       | No equivalent. `webdriverio` 10.1.0 and `expect-webdriverio` 8.0.0 contain no `toMatchAriaSnapshot` or aria-snapshot API (Measured: searched the installed packages). The Emulation page mentions only the `aria/` selector strategy (Web-verified). The port asserts role, accessible name and child count by hand (`toHaveComputedRole`, `toHaveComputedLabel`), which is weaker: no tree structure, no regex template, no snapshot update workflow                |
| axe                                      | `@axe-core/playwright` 4.14.0 through one `axeBuilder` helper (Repo-verified)                                                                                                                                                    | `@axe-core/webdriverio` 4.14.0 declares `webdriverio ^5 \|\| ... \|\| ^9` (Measured, its `package.json`) and fails on WebdriverIO 10.1.0 with `TypeError: client.executeAsync is not a function` at `axeSourceInject` (Measured). Workaround: inject `axe.source` with `browser.execute` and call `axe.run` with the same `runOnly` tag list; the `target-size` positive control and the zero-violation scan then passed. The result is our own adapter, not Deque's |
| Request and header tests                 | `request` fixture (APIRequestContext)                                                                                                                                                                                            | No equivalent; the port used Node `fetch` (works, but is not the browser's network stack). Browser-side mocking worked through `browser.mock` over BiDi on Chrome and Firefox (Measured; Context7-verified: BiDi features need `webSocketUrl: true`)                                                                                                                                                                                                                 |
| Console error and CSP report-only checks | `page.on("console")`                                                                                                                                                                                                             | Not exercised: the port only re-checked the "no inline style" half of the CSP test. BiDi log events exist but were not tried (Unverified)                                                                                                                                                                                                                                                                                                                            |
| WebKit / Safari                          | Playwright's patched WebKit builds run on Windows, macOS and Linux; the CI matrix runs it (Repo-verified)                                                                                                                        | WebdriverIO drives `safaridriver`. The docs say Safari has no headless mode and no WebDriver BiDi (Web-verified: webdriver.io capabilities and emulation pages). That safaridriver is macOS-only is Unverified from official text (Apple's page returned no content), though it is widely known. Today's WebKit coverage on Linux CI would be lost or moved to a macOS runner (cost not measured)                                                                    |
| Mobile                                   | `devices["Pixel 7"]` emulation in the CI matrix; Android is experimental and iOS is not mentioned (Web-verified: playwright.dev `class-android`)                                                                                 | Chrome `mobileEmulation` worked (Measured). `browser.emulate('device', 'iPhone 15')` needs BiDi, so not Safari (Web-verified). Real devices go through Appium (Web-verified: the WebdriverIO Appium page recommends it and warns that setup can be tricky). Appium was not installed in this spike; real-device behavior is untested here                                                                                                                            |
| Trace and debug                          | Trace viewer: actions, DOM snapshots, network, console per step; `retain-on-failure` plus HTML report configured (Web-verified; Repo-verified config)                                                                            | Spec reporter and logs only in the spike; `browser.debug()` and screenshots exist. Nothing equal to a trace with DOM snapshots was found in the installed packages (Unverified beyond that)                                                                                                                                                                                                                                                                          |
| Flake handling and retries               | `retries: 0`, policy that a flaky test is a defect (Repo-verified)                                                                                                                                                               | `specFileRetries` for a whole file and mocha-level retries (Context7-verified). Both can stay at 0; no difference in policy                                                                                                                                                                                                                                                                                                                                          |
| Randomized order with printed seed       | `--shuffle` prints `shuffle seed N`, reproducible with `--shuffle N` (Measured: seed 690028522)                                                                                                                                  | Jasmine has a `random` option, off by default in WebdriverIO (Context7-verified). The mocha framework used in the spike has no seed option that I found; spec-file order was not randomized or seeded. A seeded shuffle would have to be written (Unverified for mocha internals)                                                                                                                                                                                    |
| Run under Bun                            | The repo runs `node node_modules/@playwright/test/cli.js` (Repo-verified)                                                                                                                                                        | `bun node_modules/@wdio/cli/bin/wdio.js run` failed with `TypeError: The superclass is not a constructor` in all 3 workers; Node works (Measured). The repo already launches Playwright through Node, so this is not a blocker                                                                                                                                                                                                                                       |
| Node 26.13                               | `engines.node >=20` (Web-verified: npm)                                                                                                                                                                                          | `engines.node >=22.19.0`; worked on 26.13.0 (Measured)                                                                                                                                                                                                                                                                                                                                                                                                               |
| oxlint rules                             | `bun run lint` covers `e2e` and `playwright.config.ts`, type-aware (Repo-verified)                                                                                                                                               | The repo `.oxlintrc.json` with `typeAware` switched off and `--deny-warnings` exited 0 on the spike files. The type-aware pass could not start outside the repo (`tsgolint` not found), so type-aware rules were not run. Global `browser`, `$` and `$$` would need types and an import policy. Partial                                                                                                                                                              |
| Maintenance and governance               | Microsoft; 99,381 stars, pushed 2026-11-05; releases 1.62.0 (2026-07-24), 1.62.1 (07-30), 1.63.0 (09-04), 1.64.0 (10-07), 1.64.1 (10-14), 1.65.0 (11-05) (Measured: `gh api`). `open_issues_count` 33 (counts pull requests too) | OpenJS Foundation "At-Large" project (Web-verified: openjsf.org/projects); 9,870 stars, pushed 2026-11-05; v10.0.0 2026-10-05, 10.1.0 2026-10-18, 10.1.1 2026-11-02, v9.33.1 2026-11-03 (Measured: `gh api`, `npm view`); `open_issues_count` 230 (counts pull requests too); three npm maintainers. Both are actively maintained. The repo is one minor behind Playwright (1.64.1 vs 1.65.0, Renovate's job)                                                        |
| Supply-chain and cooldown                | 1.64.1 is pinned; Renovate groups it with the axe package (Repo-verified `.github/renovate.json5`)                                                                                                                               | WebdriverIO publishes many alpha builds (dozens of `10.1.0-alpha.N` on 2026-10-06 and 10-07) and a `next` tag with a sha version; the 3-day cooldown filters them. The 312-package tree is a larger review surface for `bun audit` and Renovate (not measured)                                                                                                                                                                                                       |
| Credentialed CI jobs                     | The browser job holds no secrets and restores the Playwright cache (Repo-verified `quality.yml`; policy in `docs/agents/maintenance.md#credentialed-ci-jobs-metro-47`)                                                           | A device lane that reaches a cloud device farm holds a vendor key, so it would be a credentialed job: no restored caches, so a cold install of a 312-package tree plus drivers each run (not measured), and one more secret to manage                                                                                                                                                                                                                                |

## Native Android and iOS apps (future)

- WebdriverIO's selling point is one API for web, Android and iOS through Appium (Web-verified: the Appium page says WebdriverIO tests mobile applications on iOS, Android or Tizen and recommends Appium). That value exists only if native apps exist; there is no native app in the repository or in an approved ticket (Unverified beyond this brief, which says "may later").
- Appium drives native UI; it does not reuse web page tests. A native lane means new tests either way, so adopting WebdriverIO for the web suite now removes no future work. A lane can be added beside Playwright later without a migration.
- Real iOS devices in practice need a Mac with Xcode. Unverified: the page I fetched did not state requirements.

## Failures and surprises

1. `@axe-core/webdriverio@4.14.0` does not work with WebdriverIO 10.1.0 (`client.executeAsync is not a function`); its peer range stops at 9.
2. No ARIA snapshot matcher exists in WebdriverIO; that is the METRO-41 check.
3. The WebdriverIO CLI does not run under Bun here (`The superclass is not a constructor`).
4. `edgedriver@8.0.0` has an install script, and the minimal stack is 312 packages.
5. Not tried: Safari or WebKit (no macOS here), Appium and real devices, `@wdio/browser-runner`, the visual service, a full 31-test port, type-checking WebdriverIO globals under `tsconfig.e2e.json`, console-log capture over BiDi.

## Spike sources (scratch, not committed)

`wdio.conf.js`:

```js
const browserName = process.env.WDIO_BROWSER ?? "chrome";
const caps = {
  chrome: {
    browserName: "chrome",
    webSocketUrl: true,
    "goog:chromeOptions": { args: ["--headless=new", "--no-sandbox"] },
  },
  firefox: {
    browserName: "firefox",
    webSocketUrl: true,
    "moz:firefoxOptions": { args: ["-headless"] },
  },
  mobile: {
    browserName: "chrome",
    webSocketUrl: true,
    "goog:chromeOptions": { args: ["--headless=new"], mobileEmulation: { deviceName: "Pixel 7" } },
  },
}[browserName];
export const config = {
  runner: "local",
  cacheDir: process.env.WDIO_CACHE ?? undefined,
  specs: ["./test/*.spec.ts"],
  maxInstances: Number(process.env.WDIO_WORKERS ?? 4),
  capabilities: [caps],
  logLevel: "warn",
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: { ui: "bdd", timeout: 60000 },
  waitforTimeout: 5000,
};
```

`test/helpers.ts` (axe adapter, because the official one fails):

```ts
import axe from "axe-core";
export const origin = "http://127.0.0.1:4173";
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
export async function axeScan() {
  await browser.execute(axe.source);
  return browser.execute(
    async (tags) => await window.axe.run(document, { runOnly: { type: "tag", values: tags } }),
    AXE_TAGS,
  );
}
```

The three spec files (`aria.spec.ts` 33 lines, `axe.spec.ts` 22, `headers.spec.ts` 34) asserted the same values as the Playwright originals: heading text, paragraph text, status label and regex, the alert text and count, the four shared headers, report-only CSP present on pages and absent on the API, no enforcing CSP, no HSTS, and one stylesheet with no inline style. `axe-core` was imported directly although it is only a transitive dependency of `@axe-core/webdriverio`; it would have to become a direct pin.

## Sources

- Playwright: <https://playwright.dev/docs/aria-snapshots>, <https://playwright.dev/docs/api/class-android>, <https://playwright.dev/docs/trace-viewer-intro> (fetched 2026-11-06).
- WebdriverIO: <https://webdriver.io/docs/emulation>, <https://webdriver.io/docs/capabilities>, <https://webdriver.io/docs/appium>; retry and framework options via Context7 (`/websites/webdriver_io`); axe wrappers via Context7 (`/dequelabs/axe-core-npm`).
- <https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md>, <https://openjsf.org/projects>, `gh api repos/webdriverio/webdriverio`, `gh api repos/microsoft/playwright`, `npm view` (2026-11-06).
- Web text was treated as data. Third-party blog claims were not used.

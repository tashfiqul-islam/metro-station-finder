# METRO-16 configuration evidence

Date: 2026-11-03. Base: d5f8b3bd3addba4e0555ab782fb1a916ece026e6. Scope: configuration hardening; no product, CI, deployment or default-branch change.

## Version provenance

**Confirmed / Web-verified:** official release/registry sources checked on 2026-11-03. Exact manifest and lockfile pins are Repo-verified. Registry `latest` is a dated observation, not a future guarantee.

| Pin | Official source |
| --- | --- |
| Bun 1.4.4 | https://github.com/oven-sh/bun/releases/tag/bun-v1.4.4 |
| Node 26.13.0 | https://nodejs.org/en/blog/release/v26.13.0 |
| TypeScript 7.0.2 | https://registry.npmjs.org/typescript/latest |
| TypeScript compiler API 6.0.2 | https://registry.npmjs.org/@typescript/typescript6/latest |
| Hono 4.13.16 | https://registry.npmjs.org/hono/latest |
| React / React DOM 19.3.1 | https://registry.npmjs.org/react/latest ; https://registry.npmjs.org/react-dom/latest |
| React / React DOM types 19.3.0 | https://registry.npmjs.org/@types/react/latest ; https://registry.npmjs.org/@types/react-dom/latest |
| Bun types 1.4.4 | https://registry.npmjs.org/@types/bun/latest |
| Node types 26.6.6 | https://registry.npmjs.org/@types/node/latest |
| Worker types 5.20261103.1 | https://registry.npmjs.org/@cloudflare/workers-types/latest |
| Oxfmt 0.75.0 | https://registry.npmjs.org/oxfmt/latest |
| Playwright 1.64.1 | https://registry.npmjs.org/playwright/latest |
| Vite 8.3.5 | https://registry.npmjs.org/vite/latest |
| Wrangler 4.156.2 | https://registry.npmjs.org/wrangler/latest |

TypeScript 7 compiler/API separation: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ . Oxfmt language coverage: https://oxc.rs/docs/guide/usage/formatter/language-support . Context7 consulted official TypeScript v7.0.2 strict/compiler documentation and Bun install configuration documentation. Actual pinned compiler/formatter executions provide the compatibility evidence.

## Checks and limits

**Confirmed / Repo-verified:** full check passed 80 tests, 134 expectations, five compiler projects; frozen bootstrap, Vite build, Wrangler dry-run, preparation validation (30 skill pins, two tickets, eleven rejection cases), browser shared-result smoke and Worker status/404 HTTP smoke passed. Fresh source export frozen bootstrap also passed after trusting its copied mise configuration. Raw outputs preserved in ignored `.superpowers/sdd/metro-16/` logs for controller review. After these initial runs, fixture-parent setup and a trailing blank line were corrected; full check passed again in the working checkout and fresh export. Build/smoke implementation was unchanged.

Configuration tests reject malformed/missing files, missing/drifted required values and effective runtime mismatches. Real compiler programs prove safe controls, strictness failures and rejected foreign globals. Real formatter tests cover JSON, JSONC and TOML syntax rejection, no-write checks and idempotent writes. Formatter syntax/layout checks do not assert arbitrary configuration schema semantics. Runtime/install semantics have explicit guards; compiler/build tools validate their own configurations.

## Narrow declaration exception

**Confirmed / Repo-verified:** only Node tools set `skipLibCheck: true`; all application, core and Bun projects retain false. With false, pinned Miniflare 5.20261102.0-beta+6896990797d7a805 declarations produce TS2307 for `@cloudflare/workers-shared`, `@cloudflare/config`, `./shared`, `@puppeteer/browsers`, `zod`, plus TS7016 for `ws`. Playwright-core 1.64.1 declarations produce TS2304 for DOM names including Node, HTMLElement and SVGElement. Exact diagnostics remain in `upstream-declarations.log`.

Explicit Node type inclusion already limits ambient types but cannot exclude declarations reached through real Wrangler/Playwright imports. Adding DOM would expose browser globals to Node code; dropping typed imports or stubbing vendor modules would replace API checking. The exception skips vendor declarations only; real source checking and foreign-global rejection tests remain strict. Revisit on dependency upgrades. No claim that arbitrary vendor declarations are valid.

**Unknown:** remote review/integration and future branch/release gates are controller-owned; these local checks do not establish product parity or deployment readiness.

Fresh export full check first exposed missing local fixture-parent setup. Tests now create that ignored directory explicitly before temporary fixtures; assertions unchanged. Export uses its own initialized Git index, not the parent repository. Git checkout/index is required by configuration enumeration. Later verification outputs supersede initial failed export check.

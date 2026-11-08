# ADR-0020: Budget the first visit, cap all files, and load features lazily

- Status: Accepted
- Date: 2026-11-08
- Ticket and specification: METRO-104 (Plane); no separate specification, the ticket's owner decision of 2026-11-08 (gate policy, approved with "ok") is the contract.

## Context

The bundle gate summed every JS and CSS file against 250,000 bytes raw and 80,000 gzip (METRO-12). After METRO-44 part B the build was 248,941 / 79,213, so the next feature of any size would fail, and a lazy chunk could not help because it counted the same as the entry. The budget exists to bound how much a first visit must download and parse, not how many files a product has. Part C added an entry-chunk check, then the orchestrator equalised it to the totals as an interim step ([ADR-0019](0019-telemetry-endpoint.md), [METRO-44c evidence](../evidence/metro-44c.md)), which left it inert.

- Context7-verified (Vite 8.3.5 docs): `build.manifest: true` writes `.vite/manifest.json` into the output directory. A chunk lists its static `imports` and its `dynamicImports` as manifest keys, and its `css` files. The HTML entry has key `index.html` and `isEntry: true`.
- Repo-verified: the client build writes `apps/web/dist/client/.vite/manifest.json`. The asset directory read by `wrangler deploy --dry-run` grew from 7 to 9 files with the manifest enabled, so it is treated as published (the second new file was not identified). It lists hashed file names only, which `index.html` already exposes, so serving it is harmless and it is not excluded.

## Decision

We will apply the existing limits, 250,000 raw and 80,000 gzip, to the first-visit set and add a separate ceiling for all emitted JS and CSS.

- First-visit set (`scripts/bundle-budget.ts`): the `index.html` manifest entry, the transitive closure of its `imports`, and the `css` of each, every file once. `dynamicImports` are never followed, so a lazy chunk and its CSS stay out. Gzip is computed per file, as before. Neither limit is raised.
- Ceiling for all files: 400,000 raw and 125,000 gzip, the owner's recommendation. After this change all files measure 250,781 / 80,239; the ceiling is about 1.6 times that, room for a few lazy features while a runaway still fails. It is a growth tripwire, not a load budget. Revisit when half is used; do not raise it to pass.
- `bun run bundle:check` lists every file marked `first-visit` or `lazy`, then prints both totals with their limits. It fails closed, with one fixed message, when the manifest is missing, unparsable, has no `index.html` entry, names an import the manifest lacks, or names a file that is not on disk. An import cycle terminates through a visited set. The interim entry check is removed; the first-visit check subsumes it.
- Pattern: a feature beyond the landing route is loaded with `lazyFeature(() => import("./features/x/X"))` from `apps/web/src/lazy-feature.tsx`: `React.lazy` inside `Suspense`, a fixed pending status (`<output>`, visible text, no spinner and no animation, so nothing depends on reduced-motion handling), and a fixed failure message with a Retry button that builds a fresh `lazy` component and so asks the network once per click. The error is never rendered; the root callbacks log only its built-in class name. Dynamic imports must be literal `import()` calls so Vite can split them.
- First use: `web-vitals` is loaded with `import()` once the page has loaded and is idle (`requestIdleCallback`, 3 s timeout; a 2 s timer where it is missing). A failed load or registration is dropped with no log. The landing nearest-station feature stays in the entry chunk and no screen is added.

## Consequences

- Easier: a feature can be added without touching the limits as long as it is a lazy chunk; the first-visit figure then does not move. The first visit gained 7,181 raw and 2,819 gzip bytes of headroom.
- Harder: the gate depends on the Vite manifest format and on `index.html` being the entry key. A custom build input or a manifest key change fails closed and needs a script change.
- The vitals chunk costs more in total than it saved from the entry: the first-visit set fell 6,122 raw / 2,032 gzip while the chunk is 7,962 / 3,058 (separate-chunk and import-helper overhead). Less than the ticket's estimate of about 10 KB; the numbers are in [METRO-104 evidence](../evidence/metro-104.md).
- Real-user metrics now register after idle. The observers read buffered entries, so LCP and CLS history is kept, but an input that happens before registration cannot finalise LCP early; LCP is then sent when the page is hidden. The vitals e2e now waits for the chunk before its simulated hide, because a page already hidden when the library starts drops earlier entries.
- Unverified: the effect of the late chunk on real users' reported LCP, INP and CLS; the lab check cannot show it. Browsers without `requestIdleCallback` use the timer, not measured here. Whether Cloudflare serves the manifest with other asset headers was not tested.
- `modulePreload` interplay: Vite adds a preload helper to the entry for dynamic imports. This change keeps the default (`build.modulePreload` on); turning it off saved about 0.5 KB in ADR-0019's measurement on an earlier build, but also drops preloading for future lazy routes.

## Alternatives considered

- Raise the totals: rejected by the owner; it hides growth and does not bound the first visit.
- Sum a directory such as `assets/` as the first visit: rejected, it counts lazy chunks and penalises code splitting, which is the opposite of the goal.
- Parse `index.html` for scripts and preload links: rejected, it misses static chunk imports and CSS of imported chunks; the manifest is the build's own record.
- Keep a tighter entry-only budget beside the first-visit check: rejected, the entry is a subset of the first-visit set, so it adds a second number without protecting more.
- Static import of `web-vitals` (ADR-0019's choice under the old gate): superseded, the old gate could not reward splitting.

## Confirmation

- `scripts/bundle-budget.test.ts` (Bun, 100 percent): first-visit over, ceiling over, a lazy chunk that leaves the first visit unchanged, manifest missing, garbage, no entry and missing file, transitive imports and shared chunks counted once, cycles, lazy CSS excluded, a dynamic import inside a static chunk, per-file gzip and ordering. `scripts/gates.test.ts` runs `scripts/bundle.ts` on built fixtures.
- `apps/web/src/lazy-feature.test.tsx` and `apps/web/src/vitals.test.ts` (Vitest, 100 percent): pending then content, failure copy without the error text, Retry, roles; no load before the scheduler runs, failures swallowed without a log.
- `e2e/vitals.e2e.ts` and `e2e/web-vitals-lab.e2e.ts`: beacons still arrive and the lab LCP and CLS stay under their limits.

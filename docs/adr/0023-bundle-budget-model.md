# ADR-0023: Bundle budget model: first-visit JS and CSS limits, per-screen and shared lazy limits

- Status: Proposed (the owner accepts by merging; the numbers below are the owner's to confirm)
- Date: 2026-11-09
- Ticket and specification: METRO-116 (Plane); no separate specification, the ticket and the owner's approval of 2026-11-09 ("both changes") are the contract. Supersedes the combined first-visit limit and the all-files ceiling of [ADR-0020](0020-first-visit-budget-and-lazy-features.md); the rest of ADR-0020 (first-visit set, manifest rules, `lazyFeature`) stands.

## Context

- Repo-verified (METRO-116 evidence, `docs/evidence/metro-116.md`, head `061d771`): the all-files ceiling of ADR-0020 (400,000 raw / 125,000 gzip) was 90 percent used by raw bytes and 87 percent by gzip with one screen built (358,628 / 109,053). Route, Line, Station or Settings would each fail it for a reason unrelated to a first visit.
- Repo-verified: the first-visit limit of 250,000 raw / 80,000 gzip counted JS and CSS together. The entry JS and head script were 235,420 raw and the entry CSS 14,141 raw, so a CSS change could fail a limit that was specified as a JS cap, and the design system was limited for the wrong reason.
- The owner approved both changes on 2026-11-09: split the first visit into JS and CSS, and replace the single ceiling by a per-screen allowance. No limit the owner set for JS gets looser.

## Decision

We will replace the two limits of ADR-0020 by the four limits in this table, each in raw and gzip bytes, all checked by `scripts/bundle-budget.ts` (`bun run bundle:check`). The first-visit set is computed as before (manifest `index.html` entry, its static closure, their CSS, plus the public head script).

| Bucket                    | Counts                                                         | Raw     | Gzip   |
| ------------------------- | -------------------------------------------------------------- | ------- | ------ |
| First-visit JS            | every first-visit `.js` file, `theme-boot.js` included         | 250,000 | 80,000 |
| First-visit CSS           | every first-visit `.css` file                                  | 20,000  | 6,000  |
| Each lazy screen (Nearby) | the screen's chunk, its CSS and the chunks only it imports     | 120,000 | 30,000 |
| Shared lazy allowance     | the shared roots and every chunk that two or more roots import | 27,000  | 12,000 |

- First-visit JS is the old first-visit limit, unchanged, applied to JS only. `theme-boot.js` stays in it: it is JavaScript, and the ticket's own entry figure (about 235.4 KB) includes it.
- First-visit CSS is new. Measured 14,141 raw / 3,975 gzip; 20,000 / 6,000 leaves about 41 percent raw and 51 percent gzip. The CSS is the shell, tokens, base and theme; a screen's CSS is lazy and counts against that screen.
- A lazy screen is a lazy chunk listed in `LAZY_SCREEN_LIMITS` by its manifest key (its source path, `src/features/nearby/Nearby.tsx`; hashed file names are never used). It owns its own file, its CSS and the static `imports` closure below it (Rollup's `_` common chunks), minus first-visit files. Nearby measures 90,842 raw / 22,798 gzip (JS 41,730 / 14,647, CSS 49,112 / 8,151); 120,000 / 30,000 is 32 percent above both. A new screen adds its own entry, with its own limits, in the PR that adds it, and the owner approves those numbers.
- Shared lazy allowance: the named shared roots and everything two or more roots reach. The shared roots are `src/theme/reveal.ts`, `src/adapters/maps/index.ts` and the `web-vitals` chunk. A chunk is shared only when it is a shared root, below a shared root, or reached from two or more roots (screens or shared roots); a chunk only one screen reaches is that screen's. A file two roots list (for example one CSS file named by two screens) is shared too, not given to whichever screen is read last. Measured 18,225 raw / 8,121 gzip (web-vitals 7,962 / 3,058, maps 5,805 / 2,843, the core `_src` chunk Nearby and the Maps adapter both import 3,802 / 1,789, reveal 656 / 431); 27,000 / 12,000 is about 48 percent above both.
- Raw and gzip are both limited for lazy buckets. Gzip is what a visitor downloads on first use; raw is what the browser must parse and keep. An earlier draft of this change limited gzip only, which made raw size of lazy code unbounded, looser than the old 400,000 raw ceiling; review caught it.
- Fail closed: a manifest chunk with JS or CSS that is not first-visit and is reached by no screen and no shared root is unclassified. The gate prints one fixed message naming the keys and fails, whatever the chunk's size, and prints no listing. This includes a new screen, a lookalike key, a `_` chunk nothing reaches, and the chunks only an unclassified chunk imports. Failure messages name the bucket that is over: `Lazy screen limit exceeded for <name>` or `Shared lazy allowance exceeded`.
- `bundle:check` prints each bucket's raw and gzip use as percent with one decimal. The ADR-0020 "growth tripwire" note, which served the ceiling, is removed with it.
- Manifest key format (Repo-verified, 2026-11-09, a real build with Vite 8 and Bun 1.4.4's isolated install under `node_modules/.bun/`): the web-vitals chunk's key is `../../node_modules/.bun/web-vitals@6.2.3/node_modules/web-vitals/dist/web-vitals.js` (relative to `apps/web`), the other roots' keys are source paths (`src/theme/reveal.ts`, `src/adapters/maps/index.ts`, `src/features/nearby/Nearby.tsx`), and Rollup's common chunks have keys like `_src-<hash>.js`. The web-vitals pattern ignores the version and any directory before `web-vitals/dist`. If a Vite, Bun or package change alters the key format so that it no longer matches, the chunk is unclassified and the gate fails closed; the fix is a pattern change in `scripts/bundle-budget.ts` with its test.

## Consequences

- Easier: a new screen needs its own limits, not a share of a common ceiling; CSS and JS can no longer trade off against each other on the first visit; a heavy private chunk of one screen fails that screen, by name.
- Harder: every new lazy screen needs a gate-policy edit (a line in `LAZY_SCREEN_LIMITS` and the owner's agreement), and a new shared helper must be a named shared root or fail until one is added. This is intended: nothing ships unbudgeted.
- JS headroom on the first visit is now 14,580 raw and 5,841 gzip, since the 14,141 raw CSS bytes no longer count against the 250,000.
- Worst case that passes today, gzip: 80,000 first-visit JS + 6,000 first-visit CSS + 30,000 Nearby + 12,000 shared = 128,000. That is 3,000 more than the old all-files ceiling of 125,000 gzip. This is intended and is for the owner to confirm: the old ceiling bounded a total that included every future screen, which is the reason it blocked the design system; the new model bounds each part, and each added screen raises the worst case by that screen's own, owner-approved limit. Measured use today is 109,053 gzip and unchanged; only the permitted ceiling differs. In raw bytes the worst case is 250,000 + 20,000 + 120,000 + 27,000 = 417,000 against the old 400,000.
- A lazy screen's size is no longer visible in a single total; the per-bucket lines show it.
- Unverified: whether 120,000 / 30,000 is right for a screen heavier than Nearby (Route, Station); the first such screen is expected to need its own numbers.
- Not covered, as in ADR-0020: font files, and third-party scripts.
- Not covered, future (METRO-106, service worker): `sw.js` is expected to be copied from `public/` unhashed and absent from the manifest, so today the gate fails it closed as an unlisted emitted file (the stale-manifest message). It is not part of the first-visit JS by intent: a browser does not fetch it until the page registers it after load, so it is not on the path of the first render. It must still be classified deliberately, not exempted. Proposed rule, not implemented here and not touching `HEAD_SCRIPTS`: give it its own small limit (for example a `PUBLIC_SCRIPTS` entry with raw and gzip limits sized from its measured size) counted in neither first-visit bucket, and fail closed when `index.html` registers a script the build lacks, as `HEAD_SCRIPT_MISSING` does for head scripts. The ticket that adds `sw.js` makes that change, with the owner's approval of the numbers.

## Alternatives considered

- Keep the ceiling and raise it: rejected by the owner; the ceiling would grow with every screen.
- One shared limit for all lazy chunks including screens: rejected, one screen could take the room of the others and the failure would not name it.
- Gzip-only limits for lazy buckets (the first draft): rejected, raw size would be unbounded.
- Give every `_` common chunk to the shared allowance (the first draft): rejected, a screen's heavy private chunk would eat shared room and the failure would blame "shared"; reachability from two or more roots decides instead.
- Count `theme-boot.js` in the CSS budget or in neither: rejected, it is JS and the JS limit must not get looser.
- Classify by hashed file name or by chunk `name`: rejected; file names change on every build, and a chunk `name` can collide with another feature.
- Default unknown chunks to the shared allowance: rejected; fail closed is the point, and a new screen would hide inside shared room.

## Confirmation

- `scripts/bundle-budget.test.ts` (Bun, 100 percent): each limit fails one byte over (raw and gzip where both apply) and passes at the limit; JS and CSS do not count against each other; the screen's CSS counts toward its limits; a screen and the shared allowance fail alone and neither borrows from the other; a heavy private `_` chunk fails its screen and a chunk two screens import fails shared; a file two screens list is shared in either manifest order; an unclassified chunk fails closed with no listing, including look-alikes of each shared pattern; the web-vitals key matches across versions and layouts. `scripts/gates.test.ts` runs `scripts/bundle.ts` on built fixtures for the screen, shared and unclassified failures.
- Mutation checks are recorded in `docs/evidence/metro-116.md`.

Amendment (2026-11-09, METRO-106, [ADR-0024](0024-offline-app-shell.md)): the gate gained a worker bucket for `sw.js` (an exact-name file from outside the manifest, never first-visit, its own limit, fail-closed when the app registers a worker the build lacks) and the service worker registration chunk became a shared lazy root. No existing limit changed.

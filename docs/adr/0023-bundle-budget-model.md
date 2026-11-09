# ADR-0023: Bundle budget model: first-visit JS and CSS limits, per-screen and shared lazy limits

- Status: Proposed (the owner accepts by merging; the numbers below are the owner's to confirm)
- Date: 2026-11-09
- Ticket and specification: METRO-116 (Plane); no separate specification, the ticket and the owner's approval of 2026-11-09 ("both changes") are the contract. Amends [ADR-0020](0020-first-visit-budget-and-lazy-features.md).

## Context

- Repo-verified (METRO-116 evidence, `docs/evidence/metro-116.md`, head `061d771`): the all-files ceiling of ADR-0020 (400,000 raw / 125,000 gzip) was 90 percent used by raw bytes and 87 percent by gzip with one screen built (358,628 / 109,053). Route, Line, Station or Settings would each fail it for a reason unrelated to a first visit.
- Repo-verified: the first-visit limit of 250,000 raw / 80,000 gzip counted JS and CSS together. The entry JS and head script were 235,420 raw and the entry CSS 14,141 raw, so a CSS change could fail a limit that was specified as a JS cap, and the design system was limited for the wrong reason.
- The owner approved both changes on 2026-11-09: split the first visit into JS and CSS, and replace the single ceiling by a per-screen allowance. No limit the owner set for JS gets looser.

## Decision

We will replace the two limits of ADR-0020 by five, all checked by `scripts/bundle-budget.ts` (`bun run bundle:check`). The first-visit set is computed as before (manifest `index.html` entry, its static closure, their CSS, plus the public head script).

| Limit                     | Counts                                                 | Raw         | Gzip   |
| ------------------------- | ------------------------------------------------------ | ----------- | ------ |
| First-visit JS            | every first-visit `.js` file, `theme-boot.js` included | 250,000     | 80,000 |
| First-visit CSS           | every first-visit `.css` file                          | 20,000      | 6,000  |
| Each lazy screen (Nearby) | the screen's dynamic-entry chunk and that chunk's CSS  | not limited | 30,000 |
| Shared lazy allowance     | every other lazy chunk (below)                         | not limited | 12,000 |

- First-visit JS is the old first-visit limit, unchanged, applied to JS only. `theme-boot.js` stays in it: it is JavaScript, and the ticket's own entry figure (about 235.4 KB) includes it.
- First-visit CSS is new. Measured 14,141 raw / 3,975 gzip; 20,000 / 6,000 leaves about 41 percent raw and 51 percent gzip. The CSS is the shell, tokens, base and theme; a screen's CSS is lazy and counted against that screen.
- A lazy screen is a lazy chunk listed in `LAZY_SCREEN_LIMITS` by its manifest key (its source path, `src/features/nearby/Nearby.tsx`; hashed file names are never used). Its limit is gzip only. Nearby measures 22,798 gzip (JS 14,647 plus CSS 8,151); 30,000 is about 32 percent above it. A new screen adds its own entry, with its own limit, in the PR that adds it, and the owner approves that number.
- Shared lazy allowance: the lazy chunks that are not screens, matched by key: `src/theme/reveal.ts`, `src/adapters/maps/index.ts`, the `web-vitals` chunk (matched without its version, so a Renovate bump does not break the gate) and Rollup common chunks (a key starting with `_`, such as the core chunk both the entry and Nearby import). Measured 8,121 gzip; 12,000 is about 48 percent above it.
- Fail closed: a lazy chunk that is neither a listed screen nor a shared match is unclassified. The gate prints one fixed message naming the keys and fails, whatever the chunk's size, and prints no listing. A file counted in two lazy chunks is counted once, in the screen's bucket.
- Raw bytes of a lazy chunk are not limited. The old raw ceiling bounded nothing a visitor waits for; a screen's gzip transfer is what it costs on first use. `bundle:check` prints each bucket's use as a percent. The ADR-0020 "growth tripwire" note, which served the ceiling, is removed with it.

## Consequences

- Easier: a new screen needs its own limit, not a share of a common ceiling; CSS and JS can no longer trade off against each other on the first visit.
- Harder: every new lazy screen needs a gate-policy edit (a line in `LAZY_SCREEN_LIMITS` and the owner's agreement), and a new shared helper must match a shared rule or fail until a rule is added. This is intended: nothing ships unbudgeted.
- JS headroom on the first visit is now 14,580 raw and 5,841 gzip, since the 14,141 raw CSS bytes no longer count against the 250,000.
- The total of all limits is no longer a single number. With Nearby only, the worst case that passes is 80,000 + 6,000 gzip first visit, 30,000 for Nearby and 12,000 shared.
- Unverified: whether 30,000 is right for a screen heavier than Nearby (Route, Station); the first such screen is expected to need its own number.
- Not covered, as in ADR-0020: font files, and third-party scripts.

## Alternatives considered

- Keep the ceiling and raise it: rejected by the owner; the ceiling would grow with every screen.
- One shared limit for all lazy chunks including screens: rejected, one screen could take the room of the others and the failure would not name it.
- Count `theme-boot.js` in the CSS budget or in neither: rejected, it is JS and the JS limit must not get looser.
- Classify by hashed file name or by chunk `name`: rejected; file names change on every build, and a chunk `name` can collide with another feature.
- Default unknown chunks to the shared allowance: rejected; fail closed is the point, and a new screen would hide inside shared room.

## Confirmation

- `scripts/bundle-budget.test.ts` (Bun, 100 percent): each limit fails one byte over (raw and gzip where both apply) and passes at the limit; JS and CSS do not count against each other; the screen's CSS counts toward its limit; a screen and the shared allowance do not borrow from each other; an unclassified chunk fails closed with no listing, including look-alikes of shared keys; the web-vitals key matches across versions; a file listed by two chunks counts once. `scripts/gates.test.ts` runs `scripts/bundle.ts` on built fixtures for the screen, shared and unclassified failures.
- Mutation checks are recorded in `docs/evidence/metro-116.md`.

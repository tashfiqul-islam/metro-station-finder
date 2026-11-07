# Golden path

Read when: starting a new feature, slice, adapter or screen. Copy the reference slice, nearest station from a searched place ([specification](../specifications/nearest-station-slice.md)), and explain any deviation in the PR.

## Rules

- The scaffold page at `/` is only a placeholder until METRO-93 removes it; copy the `/nearest` slice, not the scaffold.
- Flow: pure rule in `packages/core` (browser-safe, public entry only) → port and adapter in `apps/web/src/adapters/<provider>` → feature in `apps/web/src/features/<name>` → wiring in `AppRoutes.tsx`. Files to copy:
  - `adapters/maps/context.ts` (the port types a feature sees, `useMaps`), `provider.tsx` (loads once), `place-search.tsx`, `routes.ts`, `libraries.ts`, `config.ts` (pinned version, key reader).
  - `features/nearest-station/NearestStation.tsx` (receives `MapsAdapter` as a prop), `copy.ts`, `format.ts`, `geolocate.ts`.
- Only `adapters/maps` imports Google libraries or touches `google.maps` and `window.google`. A feature gets the adapter by prop and reads status and routes through `useMaps()`; tests pass a fake and never load Google. Convert every Google value to a plain `Coordinate` or number before it leaves the adapter.
- Core runs in the browser, so the position and the chosen place never reach `/api/*` or a log. Device position only after a button press, with the consent line next to it.
- Cover every state: idle, loading, success, empty, geolocation denied, Maps or Places failure, Routes failure. All copy is fixed in `copy.ts`; render and log no `error.message`. A failed part shows its own `role="alert"`; the rest of the result stays. Derive a stale answer away (key the result by its inputs) instead of clearing it.
- Be frugal, the free tier is the budget: request only `location` for a place (Essentials), one `fetchFields` per selection, one route per (origin, station) pair with an in-memory cache, no retry, no request per render or keystroke of ours, and load the API only while the slice is mounted. A missing key shows the unavailable state and loads nothing.
- The key is `VITE_GOOGLE_MAPS_API_KEY`, set by the owner in the root `.env`. Never read, print or commit it. Unit tests blank it; `bun run smoke` rebuilds with `fake-key-for-tests`.
- Tests sit next to the code (Vitest, happy-dom; `vitest.config.ts` gates every file at 90% lines, functions and branches, and this slice is at 100%). The journey is `e2e/<name>.e2e.ts`: `installMapsStub` serves a fake API at the real `https://maps.googleapis.com` URL, so the enforced CSP is exercised, and aborts every other Google host. Add `expectTabReachesEveryControl` and an axe scan (the fixture runs it).
- The CSP is enforced from `apps/web/public/_headers` with exact hosts. Add a host, `'unsafe-eval'`, `blob:` or inline styles only with the message that proves the need from the owner-run `bun run smoke:live` ([runbook](maps-live-check-runbook.md)), and update `headers.test.ts` in the same PR.
- A new pattern needs an ADR ([template](../adr/0000-template.md)). A new dependency needs the owner's approval and a bundle-budget measurement (`bun run bundle:check`).

## Enforced by

- `.dependency-cruiser.mts` rule `maps-library-only-in-maps-adapter`, proven red per import form in `scripts/layering.test.ts`: fix the import, not the rule.
- `apps/web/src/headers.test.ts` and `e2e/headers.e2e.ts`: the enforced header, its exact hosts, and a blocked image that must log a console error and fail the fixture.
- `e2e/fixtures.ts`: console errors and axe violations fail every journey. `e2e/nearest-station.e2e.ts`: no coordinate in any `/api/*` request, one Essentials fetch, one route.
- `scripts/google-containment.test.ts`: fails on `google.maps` or `window.google` outside the adapter (the types are ambient, so the import rule alone cannot see it); it is a text guard, so an alias is not caught.
- Vitest per-file 90% thresholds and `scripts/agent-docs-size.test.ts` (this file stays within 6,144 bytes).

## Read more

- [Specification](../specifications/nearest-station-slice.md), [ADR-0009](../adr/0009-maps-provider-design.md), [ADR-0011](../adr/0011-security-headers.md), [ADR-0018](../adr/0018-where-core-runs.md).
- [UI](ui.md), [security](security.md), [testing](testing.md), [architecture](architecture.md).

# Metro Station Finder

> Find the nearest Dhaka MRT-6 metro station, calculate fares between any two stations, and browse the line — from your phone, offline, for free.

A PWA built on TanStack Start, React 19, Tailwind v4, Base UI, and MapLibre + OpenFreeMap tiles. Zero-cost hosting on Cloudflare Workers (Static Assets).

---

## Quick start

```bash
bun install     # install dependencies + set up git hooks
bun run dev     # dev server at http://localhost:3000
bun run ci      # typecheck → lint → test → build
```

Requires **Bun ≥ 1.3** and **Node ≥ 22**.

## Tech stack

| Layer         | Choice                                                             |
| ------------- | ------------------------------------------------------------------ |
| Runtime       | Bun 1.3+                                                           |
| Framework     | [TanStack Start](https://tanstack.com/start) (RC 1.167+) on Vite 8 |
| Language      | TypeScript 6 strict                                                |
| UI primitives | [Base UI](https://base-ui.com) via [shadcn](https://ui.shadcn.com) |
| Styling       | Tailwind CSS v4 (Oxide engine)                                     |
| Icons         | Phosphor Icons                                                     |
| Data / state  | TanStack Router + TanStack Query                                   |
| Maps          | [mapcn](https://mapcn.dev) (MapLibre GL + OpenFreeMap tiles)       |
| Validation    | [Valibot](https://valibot.dev) (Standard Schema, edge-sized)       |
| Lint + format | [Ultracite](https://ultracite.ai) (Oxlint + Oxfmt)                 |
| Tests         | Vitest 4 (unit + integration) + Playwright 1.59 (E2E)              |
| Perf budgets  | Lighthouse CI (≥ 95 perf, ≥ 90 a11y/BP/SEO)                        |
| Git hooks     | Lefthook 2.x                                                       |
| Releases      | semantic-release 25 (Conventional Commits)                         |
| Deploy        | Cloudflare Workers (Static Assets) — zero-cost                     |

## Features

- **Find nearest station** — geolocation or address → haversine distance → walking directions on map
- **Fare calculator** — symmetric fare matrix lookup between any two stations
- **17 MRT-6 stations** from Uttara North to Kamalapur (including under-construction)
- **Offline-first PWA** — station list and fare lookup work without network; map tiles and routes degrade gracefully
- **WCAG AA** accessible — keyboard navigation, ARIA landmarks, screen-reader tested
- **Lighthouse ≥ 95** performance budget enforced in CI

## Project structure

```
metro-station-finder/
├── AGENTS.md              # AI coding agent instructions (Claude, Cursor, Copilot, Codex)
├── src/
│   ├── routes/            # File-based routes (TanStack Router)
│   ├── components/        # Shared components (shadcn UI + custom)
│   ├── features/          # Feature-folder colocation (finder, fares, home, about)
│   ├── data/              # Static station + fare datasets (Valibot-validated)
│   ├── lib/               # Utilities, helpers, schemas
│   └── styles.css         # Tailwind entry, design tokens
├── tests/
│   ├── unit/              # Vitest unit tests (node env)
│   ├── integration/       # Vitest integration tests (jsdom env)
│   └── e2e/               # Playwright E2E tests
└── public/                # Static assets (favicon, manifest, icons)
```

## Scripts

```bash
bun run dev                 # Vite dev server (port 3000)
bun run build               # Production build (prerendered SSG)
bun run preview             # Serve built output locally

bun run typecheck           # tsc --noEmit
bun run lint                # ultracite check (oxlint + oxfmt)
bun run lint:fix            # ultracite fix (auto-fix safe issues)

bun run test                # all vitest projects
bun run test:unit           # unit project only (node env)
bun run test:integration    # integration project only (jsdom env)
bun run test:watch          # watch mode
bun run test:ui             # vitest UI at http://localhost:51204
bun run test:coverage       # v8 coverage with thresholds (80%)

bun run test:e2e            # Playwright across all browsers
bun run test:e2e:ui         # Playwright UI mode
bun run test:e2e:headed     # headed mode
bun run test:e2e:debug      # step debugger

bun run lighthouse          # Lighthouse CI budgets

bun run commit              # commitizen interactive commit
bun run release             # semantic-release (CI only)
bun run release:dry         # dry-run semantic-release

bun run ci                  # full gate: typecheck → lint → test → build
bun run clean               # remove build artifacts
```

## Contributing

1. Conventional Commits enforced — use `bun run commit` for an interactive prompt.
2. Every PR must pass `bun run ci` locally (and in CI).
3. Coverage threshold is 80% lines/functions/statements, 75% branches.
4. New features start with a spec in `specs/` per the project constitution.

## License

[MIT](LICENSE) © Tashfiqul Islam

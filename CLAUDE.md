# CLAUDE.md

This project's full agent instructions live in **[AGENTS.md](./AGENTS.md)**. Read that file top to bottom at the start of every session. It is the single source of truth for stack, architecture, safety boundaries, style, testing, and current milestones.

## Claude-specific notes

- **Behavior contract** — AGENTS.md §2 encodes the Karpathy coding-behavior framework (think before coding, simplicity first, surgical changes, goal-driven execution, push back when warranted). Every tool call and every response follows those rules. When they conflict with default instincts, the framework wins.

- **Session handoff** — every session starts by reading `docs/HANDOFF.md` (short, ~400 words, overwritten each sprint) to get the current state, active sprint, and next action. Every session ends by updating it. If a sprint boundary was reached, append a paragraph to `docs/SPRINT_LOG.md` recording the merge commit SHA. Version tags are owned by semantic-release — never create manual sprint or milestone tags. Full protocol + model routing: `docs/IMPLEMENTATION_PLAN.md` Appendix F.

- **Memory system** — persistent notes for this project live under `C:\Users\Tashfiq\.claude\projects\D--Projects-metro-station-finder-v1\memory\`. Write to `MEMORY.md` (index) + individual `.md` files when a user preference, feedback item, or durable project fact surfaces. Never duplicate what AGENTS.md already says — memory is for things that aren't in the repo.

- **Skills** — prefer `agent-skills:*` and `superpowers:*` workflows when they apply (brainstorming, planning, TDD, debugging, code review, git workflow). For open-ended codebase questions use the `Explore` subagent; for implementation design use `Plan`; for post-edit review use `code-reviewer`, `security-reviewer`, or `tdd-guide` proactively.

- **Parallel tool calls** — batch independent reads, greps, and globs into a single message.

- **Context7 MCP** — use it for library docs (TanStack Start, mapcn, Valibot, MapLibre GL, OpenRouteService, shadcn, Base UI) before guessing APIs. Context7 beats training-data recall for anything on a fast release cycle.

- **GitHub MCP** — use it (not `gh` shell commands, not inferred URLs) when inspecting the v0 repo at `tashfiqul-islam/metro-station-finder` or the legacy chrome at `D:/Projects/metro-station-finder`.

- **Secrets** — `ORS_KEY` lives in `.env.local` (gitignored). Never print it, log it, commit it, include it in any tool-call argument, or expose it to the client bundle. See AGENTS.md §5.6.

- **Verification before completion** — AGENTS.md §4 requires `bun run ci` to pass before any task is marked done. Don't claim "should work" — run the gate.

Everything else: **AGENTS.md**.

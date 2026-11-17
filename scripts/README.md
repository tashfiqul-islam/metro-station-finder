# scripts

Repository tooling, one folder per concern. Each script sits next to its test (`name.ts`, `name.test.ts`).
Tests that pin one rule across the repository, with no single script, live in `policy/`. A layout test (`policy/script-layout.test.ts`) keeps every `.ts` file in `scripts/<folder>/` and every folder listed here.
Run scripts from the repository root (`node scripts/gates/links.ts`); most are wired in `package.json`,
`hk.pkl` or `.github/workflows/`. Folders are one level deep.

| Concern            | Folder     | What is in it                                                                                                                                                                          |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository checks  | `gates/`   | The gates of `bun run check` and the scans: links, boundaries, bundle budget, configuration, docs and routing rules, secrets, tool pins, formatting, tool preflight.                   |
| CI and review      | `ci/`      | Changed-files and CI result checks, commit-message and Reviewer record checks, workflow lint and policy, timed check, tracker sync, and the tests that pin the workflow files.         |
| Release and deploy | `release/` | Release draft and sync, preview and production deploy helpers, cutover preflight, API envelope check, GitHub settings, Cloudflare token check, uptime probe, and their workflow tests. |
| Browser checks     | `smoke/`   | `bun run smoke`, the owner-run live check, its report, the smoke port and the lab web-vitals rules.                                                                                    |
| Build steps        | `build/`   | Brand assets, image size, site origin and the offline shell worker plugin used by the web build.                                                                                       |
| Shared helpers     | `lib/`     | Type guards, clean Git environment, test support, the `gh` stand-in and test timing.                                                                                                   |
| Repository rules   | `policy/`  | Repo-wide tests with no single script: type and tsc projects, layering, hooks, test order, lint and ignore rules, docs and design rules.                                               |
| Windows            | `windows/` | PowerShell preparation checks.                                                                                                                                                         |

`tsconfig.json` here is the scripts project (see ADR-0015); it covers every folder.

# Metro rebuild

This branch starts independent Git history. It contains agent guidance, parity/glossary documents and a minimal executable workspace. No legacy application, dependency lockfile, assets, deployment workflow or Git ancestry was imported.

Legacy baseline: `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, retained on `master`. Original reviewed work: PR #9 (METRO-8) and PR #10 (METRO-9); former integration head `d128fb714be68e9cefbefa463fd299eb948ed814`. Their checks are historical evidence, not checks of a new application. Run legacy reproduction snippets only in a separate checkout of the recorded baseline.

Start ticket branches from `feature/metro-rebuild`; merge reviewed ticket PRs back here and delete merged ticket branches. The owner explicitly permits Done after verified integration merge for the authorized tickets. This overrides the older main-only completion wording in preserved guidance for those tickets only.

METRO-11 prepares `main` from the reviewed independent rebuild lineage. Keep the repository default unchanged until v1.0.0 is fully ready to release. The release-time checklist in [development](docs/development.md#release-time-branch-transition) governs that later switch. Do not merge `master` or another legacy descendant into this lineage. Removal/archive of `master` requires separate authorization.

**Confirmed / Repo-verified:** React/Vite web and a Hono Worker consume a dependency-free shared synthetic status result. No station or fare features exist yet. See [development commands](docs/development.md) and [METRO-11 evidence](docs/evidence/metro-11.md). Local preparation checks remain documented in the [dry run](docs/examples/plane-preparation/README.md). Follow [agent guidance](AGENTS.md), [parity](docs/product/feature-parity.md) and [glossary](docs/product/glossary.md). Quality gates are described in [quality gates](docs/agents/quality-gates.md); METRO-13/14 own preview/release automation.

Project policy: [license](LICENSE) (MIT), [security reporting](SECURITY.md), [contributing](CONTRIBUTING.md), [pull request template](.github/pull_request_template.md) and architecture decisions ([0001](docs/adr/0001-foundation-baseline.md), [0002](docs/adr/0002-runtime-topology.md), [0003](docs/adr/0003-contracts.md), [0004](docs/adr/0004-supply-chain-and-ci-policy.md), [0005](docs/adr/0005-test-strategy.md)).

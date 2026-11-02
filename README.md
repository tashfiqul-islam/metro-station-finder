# Metro rebuild

This branch starts independent Git history. It contains the METRO-8 agent guidance and METRO-9 parity/glossary documents, with historical source links pinned to their audited revision. No legacy application, dependency lockfile, assets, deployment workflow or Git ancestry is included.

Legacy baseline: `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, retained on `master`. Original reviewed work: PR #9 (METRO-8) and PR #10 (METRO-9); former integration head `d128fb714be68e9cefbefa463fd299eb948ed814`. Their checks are historical evidence, not checks of a new application. Run legacy reproduction snippets only in a separate checkout of the recorded baseline.

Start ticket branches from `feature/metro-rebuild`; merge reviewed ticket PRs back here and delete merged ticket branches. The owner explicitly permits Done after verified integration merge for the authorized tickets. This overrides the older main-only completion wording in preserved guidance for those tickets only.

METRO-11 owns the authorized migration: create `main` from this independent rebuild lineage and make it default. Do not merge `master` or another legacy descendant into this lineage. No migration occurs in METRO-10. Removal/archive of `master` requires separate authorization.

No application scaffold or package gates exist here yet. Local preparation checks are documented in the [dry run](docs/examples/plane-preparation/README.md). Follow [agent guidance](AGENTS.md), [parity](docs/product/feature-parity.md) and [glossary](docs/product/glossary.md). METRO-10 supplies [reviewed skills](docs/agents/skills.md), the [Plane adapter](docs/agents/plane.md) and reusable preparation templates. METRO-11 owns the scaffold and main/default migration.

# ADR-0006: Per-pull-request Cloudflare preview

Status: Accepted (2026-11-03). Specification: [cloudflare-preview](../specifications/cloudflare-preview.md).

## Context

Reviewers need a URL tied to the checked commit. No production Worker exists, and the default branch (`master`) is the legacy tree, so `workflow_run` workflows (which run only from the default branch) cannot fire for the rebuild.

## Decision

- One Worker per pull request (`metro-scaffold-pr-<number>`), built with `CLOUDFLARE_ENV=preview`, deployed by a gated job in the Quality workflow, deleted on close. Only the `preview` environment of `apps/api/wrangler.jsonc` enables workers.dev.
- Same-repository pull requests only; secrets only in the `preview` GitHub environment.
- The job proves the URL serves the checked commit (`x-preview-sha`), exercises `wrangler rollback`, and stays outside the required aggregate.
- Request IDs and one allow-listed JSON log line per request; no query string, headers or error messages are ever logged.

## Consequences

- A Cloudflare outage or an expired token turns the preview job red but does not block merges.
- After the default-branch switch, a `workflow_run` split could replace the gated job; that is a new decision.
- The job cannot be proven end to end until the `preview` environment secrets exist (see METRO-13 evidence).

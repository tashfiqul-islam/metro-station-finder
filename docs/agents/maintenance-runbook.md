# Maintenance runbook

Status: relocated unchanged from the former maintenance guide (lines 64-96 at revision db8d5e5, METRO-86). These are operator procedures run by the owner or on a trigger; the standing rules are in [maintenance](maintenance.md). The last section (METRO-85) was added on `feature/metro-rebuild` after that revision and is kept word for word.

## Cloudflare token rotation and expiry alarm (METRO-33)

Cloudflare has no first-party OIDC for wrangler, so preview (and later production) deploys depend on a long-lived `CLOUDFLARE_API_TOKEN`; rotating it on time is the control. Without it an expired token fails every preview deploy. **Current expiry: 2027-11-04** (confirmed by the owner in the Cloudflare dashboard on 2026-11-04, after extending the existing token's expiry instead of creating a new token; the first live run of the check below, on 2026-11-04, reported "Token is active and expires in 365 days (2027-11-04T17:59:59.000Z)", so the date is verified through Cloudflare's token-verify API). Extend or rotate before 2027-10-21 (the alarm below fails from 14 days out). Extending the existing token is an accepted alternative to the rotation steps below: after extending, run the check (step 3) and record the date (step 5).

**Alarm.** `.github/workflows/cloudflare-token-check.yml` (Actions, Cloudflare token check, Run workflow) runs `scripts/cloudflare-token-check.ts` in the `preview` environment. It calls Cloudflare's token-verify API and fails on HTTP 401/403, on a status other than `active`, and when the token expires within 14 days; it prints the days remaining, never the token. It also has a weekly schedule (Mondays 06:17 UTC) that is inert until the default-branch switch, because GitHub only runs schedules from the default branch; until then dispatch it by hand, at least weekly during the last 30 days before expiry. A token with no expiry date passes with a note; set an expiry when rotating. Endpoints (Cloudflare docs, read 2026-11-04): `GET /accounts/{account_id}/tokens/verify` for account-owned tokens, falling back to `GET /user/tokens/verify` for user-owned ones ([account](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/), [user](https://developers.cloudflare.com/api/resources/user/subresources/tokens/methods/verify/)).

**Where a failure is announced (decided 2026-11-04: use GitHub's default).** No extra channel is configured. A failed run notifies through GitHub's normal workflow-failure notifications (the person who triggered it or last edited the schedule, per their notification settings), so keep failed-workflow notifications on for the owner's account (GitHub Settings, Notifications, Actions). Because the weekly schedule is inert until the default-branch switch, the primary control until then is a calendar reminder on 2027-10-05 (30 days before expiry) plus a manual dispatch of the check; do not assume anyone is paged. Revisit the channel when the default branch switches and the schedule starts running. Decided by the agent on the owner's delegation ("accept default, whatever is best").

**Owner steps (the agent cannot rotate the token).**

1. In the Cloudflare dashboard open the CURRENT working token and copy its permission set exactly (Workers Scripts, Edit is the documented minimum, but wrangler can need more, for example Account Settings read; Cloudflare's own CI guidance uses the "Edit Cloudflare Workers" template, [GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/), read 2026-11-04). Create the new token (account API token preferred; user token works) with exactly that set, resources limited to the one Metro account (no other accounts; add zones only if the current token has them), an expiry about 90 days out, and no IP filtering unless GitHub-hosted runners are accounted for.
2. In GitHub, repository Settings, Environments, `preview`, replace the secret `CLOUDFLARE_API_TOKEN` with the new value. Do not put it in a repository secret, a variable, a file, an issue or a chat. Leave the variable `CLOUDFLARE_ACCOUNT_ID` unchanged.
3. Verify: run the Cloudflare token check workflow by hand and confirm it passes and reports about the expected days remaining. That proves the token is active, not that it has every permission wrangler needs. Then re-run the `preview` job of a same-repository pull request (it deploys, exercises `wrangler rollback`, and redeploys) and confirm it passes with the new secret. Do not rely on `wrangler deploy --dry-run` for this: Cloudflare documents it as compiling and checking the project "without actually uploading the Worker" ([wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/), read 2026-11-04), and the docs for the newer `cf deploy --dry-run` say it makes no API requests, so it never exercises the token. It is safe to run but is not a permission check (Unverified for wrangler 4.156.0 specifically whether it contacts the API).
4. Revoke the old token in the Cloudflare dashboard only after step 3 passes.
5. Record the new expiry: update the date in this section, and note the rotation in the ticket. The dated records in the evidence files are frozen and are not edited. Set a calendar reminder about 30 days before it (for the current expiry: 2027-10-05).

**Environment.** The `preview` environment has no protection rules, by owner decision ([evidence](../evidence/metro-cloudflare-preview.md)), so scheduled and manual runs use it as configured. Warning: if required reviewers are ever added to `preview`, this alarm would wait for approval and stop being an alarm, and so would every preview deploy; keep the alarm and the deploys on an environment without reviewers. The environment's deployment-branch policy has not been verified (the evidence records none set). Any branch allowed to use `preview` can read the token, the same exposure PR previews already have; keep the token scoped to the one account.

Accepted checks for this procedure are in `scripts/cloudflare-token-check.test.ts` and `scripts/cloudflare-token-check-workflow.test.ts`. The live workflow has not been run: it needs the workflow registered on the default branch (or dispatched from a branch the `preview` environment accepts) and the owner's go-ahead to use the real secret. Each verify request times out after 15 seconds.

## Wrangler types check on Windows

Wrangler 4.156.1 fixed `wrangler types --check` failing on CRLF checkouts (audit row RT-17). Installed when METRO-49 was decided: wrangler 4.156.0, which predates the fix; the newest published was 4.157.0. Bumping was out of scope there ([ADR-0014](../adr/0014-language-level-and-worker-types.md)).

Tracking: Create a Plane ticket when Renovate proposes wrangler >= 4.156.1.

Precondition: the checkout must really have CRLF working files, otherwise the re-test proves nothing. `git config core.autocrlf` must print `true`, and `.gitattributes` must not force `eol=lf` for the file. The repository's `.gitattributes` currently has `* text=auto eol=lf`, which does force LF: for the re-test, temporarily use `git -c core.eol=crlf` with an override line `apps/api/worker-configuration.d.ts text eol=crlf` in `.git/info/attributes` (it takes precedence and is not committed). Verify with `git ls-files --eol apps/api/worker-configuration.d.ts`: the working-tree column must read `w/crlf`.

Re-test after the next wrangler bump, on Windows:

1. `mise exec -- bun run bootstrap`, then confirm `bunx wrangler --version` is at least 4.156.1.
2. `mise exec -- bun run --cwd apps/api types`, then `mise exec -- bun run types:check`. It must report the types as up to date. Re-checking out `apps/api/worker-configuration.d.ts` with CRLF endings (delete it and `git checkout` it) and running `types:check` again must still pass.
3. Commit the regenerated file if its runtime header changed. Record the result in the bump's ticket and delete this step if it passed.

## Local tokens outside the repository (METRO-85)

`CLOUDFLARE_API_TOKEN` and `PLANE_API_KEY` must not live in the repository folder. Scripts read them from the process environment only and fail naming the variable when it is missing; CI supplies them from GitHub environment secrets. Moving the tokens out is the real fix. `.claude/settings.json` is a second layer.

**Deny rules.** `permissions.deny` holds `Read(./.env)`, `Read(./.env.*)`, `Read(/.env)` and `Read(/.env.*)`. Anchoring (official docs, code.claude.com/docs/en/permissions, Read and Edit rule table, checked 2026-11-06): `./path` and `path` are relative to the current directory, so they miss the root `.env` when an agent runs in a subdirectory; `/path` is relative to the settings source, which for project settings is the project root; `//path` is absolute. The `/` pair covers the root file from any directory. The `.env.*` pattern also blocks `.env.example`. These rules cover Claude's file tools only, not a shell `cat .env`.

**Owner steps** (the agent never reads or moves the values):

1. Windows, PowerShell 7.1 or newer (`Read-Host -MaskInput` needs it). Run both:
   - `[Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", (Read-Host -MaskInput "Cloudflare token"), "User")`
   - `[Environment]::SetEnvironmentVariable("PLANE_API_KEY", (Read-Host -MaskInput "Plane key"), "User")`

   Quit and reopen the editor and terminals completely; a window reload keeps the old environment. Check without printing values: `[bool][Environment]::GetEnvironmentVariable("PLANE_API_KEY","User")` must print `True` (same for `CLOUDFLARE_API_TOKEN`).

2. Ubuntu (a native Ubuntu session; under WSL the Windows User variables do not propagate without `WSLENV`, so set the variables in the WSL shell instead). Create the file private before any secret is written, then enter each value without it reaching shell history:
   - `install -m 600 /dev/null ~/.metro-tokens` (run once; it truncates the file, so on a re-run edit the file in an editor instead of repeating the steps)
   - `read -rs -p "Cloudflare token: " V && printf 'export CLOUDFLARE_API_TOKEN=%q\n' "$V" >> ~/.metro-tokens; unset V`
   - `read -rs -p "Plane key: " V && printf 'export PLANE_API_KEY=%q\n' "$V" >> ~/.metro-tokens; unset V`
   - `>>` appends, so repeating a command adds a duplicate line; remove the old line first or edit the file.
   - Add `[ -f ~/.metro-tokens ] && . ~/.metro-tokens` to `~/.profile` (read by login shells). For interactive non-login shells also add it to `~/.bashrc`, above the guard near the top that returns early for non-interactive shells (a line after the guard never runs for them). A GUI-launched editor may not inherit the variables until the desktop session restarts; otherwise start the editor from a terminal that has them.
   - Check: `test -n "$PLANE_API_KEY" && echo set` (same for `CLOUDFLARE_API_TOKEN`).
3. Delete both lines from the root `.env`, then check (a missing file counts as absent). Windows: `if (Test-Path .env) { Select-String -Path .env -Pattern '^(CLOUDFLARE_API_TOKEN|PLANE_API_KEY)=' -Quiet } else { $false }` must print `False`. Ubuntu: `[ -f .env ] && grep -qE '^(CLOUDFLARE_API_TOKEN|PLANE_API_KEY)=' .env && echo present || echo absent` must print `absent`. The check covers only the `.env` in the directory where it runs; other `.env` files (for example inside a worktree) are not covered.
4. MCP servers, observed by key name in the owner's `~/.claude.json` on 2026-11-06 (values not read); not verifiable from the repo. `plane` (stdio) has `PLANE_API_KEY` and `PLANE_WORKSPACE_SLUG` in its own `env` block. If the Plane key later changes, update it both in the user environment and in the `plane` server `env` block in `~/.claude.json` (outside the repository). `cloudflare-api` (HTTP, mcp.cloudflare.com) has no `env` or `headers` keys. Neither reads the repository `.env`. The session also exposes claude.ai-hosted connectors whose authentication lives in the owner's claude.ai account, not in any file read here (Unverified).

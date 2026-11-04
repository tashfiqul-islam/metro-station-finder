# Permissions and agent authorization

Read before changing tracker access, gate files, `.claude/` settings or hooks. This is the policy for what an agent may do without a human act. It is covered by CODEOWNERS (`/docs/agents/`, `/.claude/`, `/scripts/`). Evidence rows: AI-02, AI-03 and AI-18 in [the audit](../evidence/audit-2026-11.md). Ticket: METRO-38.

Prose in AGENTS.md is context; Claude Code does not enforce it. Enforcement here is a tracked `PreToolUse` hook (`.claude/settings.json` runs `scripts/agent-authorization.ts`) that blocks, plus the permission rules the owner sets locally. The hook is a safety net against mistakes and prompt injection, not a security boundary against an agent that is trying to defeat it (see [limits](#what-this-does-not-protect-against)).

## What is blocked

| Call                                                                                                        | Blocked unless                      |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Any Plane tool call (`mcp__claude_ai_Plane__*`, also `mcp__plane__*`) not provably read-only                | a valid `plane-write` marker exists |
| `Edit`, `Write`, `MultiEdit`, `NotebookEdit` on a path listed in `.github/CODEOWNERS`                       | a valid `gate-edit` marker exists   |
| The same tools on any `settings.json` or `settings.local.json` inside a `.claude/` folder, anywhere on disk | a valid `gate-edit` marker exists   |
| The same tools on the marker directory itself                                                               | never (blocked even with markers)   |
| Malformed hook input, unreadable or unsupported CODEOWNERS, unknown project directory                       | never (fails closed)                |

Everything else is untouched: reads, ordinary edits, Bash, GitHub tools. The hook adds no `allow` or `deny` permission entries; the tracked settings file contains hooks only.

A block is exit code 2 with the reason on stderr (Web-verified, [hooks reference](https://code.claude.com/docs/en/hooks), read 2026-11-04). An exit code of 0 with no output leaves the normal permission flow in place, so a permitted call is still subject to the owner's allow, ask and deny rules. Any other exit code does not block by itself; the tracked configuration sets `onFailure: "block"`, which turns a crash, timeout or missing `node` into a block as well (Web-verified, same page; requires Claude Code 2.1.295 or later). `scripts/agent-authorization.test.ts` models these semantics with `hookOutcome` and runs the configured command over a real process boundary.

## Plane: read-only versus mutating

The Plane connector exposes about 30 tools, most with an `action` argument. A permission rule can name a tool but not an action: Claude Code skips any `mcp__` rule that has parentheses, and parameter matching for MCP tools is available only as a command-line `--disallowedTools` deny rule (Web-verified, [permissions](https://code.claude.com/docs/en/permissions), read 2026-11-04). So per-operation separation is possible only in the hook, which reads `tool_input.action`.

The hook's rule: an action is read-only only if its name starts with `list`, `get`, `retrieve`, `search` or `count` (optionally followed by `_suffix`), or is one of `me`, `read`, `download_url`, `worklog_summary`; `get_pql_reference` has no action and only reads. Everything else is mutating, including a missing, non-string, upper-case or new action name. `workitem_type resolve` is mutating because it creates the type when absent. A tool the connector adds later is covered by the same rule.

The table is the classification of the connected schemas as read on 2026-11-04 (Repo-verified against the tool schemas in the session; the connector may change). `scripts/agent-authorization.test.ts` checks that this table equals `PLANE_ACTIONS` in the script and that the rule agrees with every row.

<!-- plane-actions:start -->

| Tool                  | Read-only actions                                                                | Mutating actions                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `collection`          | `list`, `retrieve`, `list_pages`, `search_pages`, `list_members`                 | `create`, `update`, `delete`, `add_pages`, `remove_page`, `add_member`, `update_member`, `remove_member`                               |
| `customer`            | `list`, `retrieve`, `list_workitems`                                             | `create`, `update`, `delete`, `manage_workitems`                                                                                       |
| `customer_property`   | `list`, `retrieve`, `get_values`                                                 | `create`, `update`, `delete`, `set_values`                                                                                             |
| `customer_request`    | `list`, `retrieve`                                                               | `create`, `update`, `delete`                                                                                                           |
| `cycle`               | `list`, `retrieve`, `list_workitems`                                             | `create`, `update`, `delete`, `manage_workitems`, `transfer_workitems`, `complete`, `archive`, `unarchive`                             |
| `initiative`          | `list`, `retrieve`, `list_projects`, `list_workitems`                            | `create`, `update`, `delete`, `add_projects`, `remove_projects`, `manage_workitems`                                                    |
| `intake`              | `list`, `retrieve`                                                               | `create`, `update`, `delete`                                                                                                           |
| `label`               | `list`, `retrieve`                                                               | `create`, `update`, `delete`                                                                                                           |
| `member`              | `me`, `list_workspace`, `list_project`, `list_roles`, `retrieve_role`            | none                                                                                                                                   |
| `milestone`           | `list`, `retrieve`, `list_workitems`                                             | `create`, `update`, `delete`, `manage_workitems`                                                                                       |
| `module`              | `list`, `retrieve`, `list_workitems`                                             | `create`, `update`, `delete`, `manage_workitems`, `archive`, `unarchive`                                                               |
| `page`                | `list`, `retrieve`, `list_workitem_pages`                                        | `create`, `update`, `archive`, `delete`, `set_collection`, `attach_to_workitem`, `detach_from_workitem`                                |
| `project`             | `list`, `retrieve`, `worklog_summary`, `get_features`                            | `create`, `update`, `delete`, `archive`, `unarchive`, `update_features`                                                                |
| `project_estimate`    | `retrieve`, `list_points`                                                        | `create`, `update`, `delete`, `link`, `create_points`, `update_point`, `delete_point`                                                  |
| `release`             | `list`, `retrieve`, `get_changelog`, `list_workitems`                            | `create`, `update`, `delete`, `update_changelog`, `manage_workitems`                                                                   |
| `release_label`       | `list`                                                                           | `create`, `update`, `delete`, `attach`, `detach`                                                                                       |
| `release_tag`         | `list`, `retrieve`                                                               | `create`, `update`, `delete`                                                                                                           |
| `state`               | `list`, `retrieve`                                                               | `create`, `update`, `delete`                                                                                                           |
| `template`            | `list`                                                                           | `create`, `update`, `delete`                                                                                                           |
| `work_log`            | `list`                                                                           | `create`, `update`, `delete`                                                                                                           |
| `workitem`            | `list`, `list_archived`, `retrieve`, `retrieve_by_identifier`, `search`, `count` | `create`, `update`, `delete`, `archive`, `manage_assignee`, `manage_label`                                                             |
| `workitem_activity`   | `list`, `retrieve`                                                               | none                                                                                                                                   |
| `workitem_attachment` | `list`, `read`, `download_url`                                                   | `upload_from_url`, `delete`                                                                                                            |
| `workitem_comment`    | `list`, `retrieve`                                                               | `create`, `update`, `delete`                                                                                                           |
| `workitem_link`       | `list`, `retrieve`                                                               | `create`, `update`, `delete`                                                                                                           |
| `workitem_property`   | `list`, `retrieve`, `list_options`, `retrieve_option`, `get_value`               | `create`, `update`, `delete`, `manage_type_properties`, `create_option`, `update_option`, `delete_option`, `set_value`, `delete_value` |
| `workitem_relation`   | `list`, `list_definitions`                                                       | `create`, `delete`, `create_definition`, `update_definition`, `delete_definition`                                                      |
| `workitem_type`       | `list`, `retrieve`                                                               | `resolve`, `create`, `update`, `delete`, `import_to_project`                                                                           |
| `workspace`           | `retrieve`, `get_features`                                                       | `update_features`                                                                                                                      |

<!-- plane-actions:end -->

## Authorization markers

A marker is a small JSON file in `~/.claude/metro-authorization/` (`$env:USERPROFILE\.claude\metro-authorization\` on Windows), outside every repository checkout and shared by all worktrees. Two scopes: `plane-write.json` and `gate-edit.json`. Content:

```json
{
  "scope": "plane-write",
  "issuedAt": "2026-11-04T12:00:00.000Z",
  "expiresAt": "2026-11-04T13:00:00.000Z",
  "note": "METRO-38 status update, owner approved in chat"
}
```

The hook accepts a marker only if the file parses, the scope matches the file's purpose, both dates are valid, `issuedAt` is not more than a minute in the future, `expiresAt` is after `issuedAt` and in the future, and `expiresAt - issuedAt` is at most 4 hours. Anything else leaves the call blocked. `note` is for the audit trail and is not read.

The owner or orchestrator creates a marker for one piece of authorized work, then deletes it:

```powershell
$dir = Join-Path $HOME '.claude/metro-authorization'
New-Item -ItemType Directory -Force $dir | Out-Null
$now = [DateTime]::UtcNow
@{ scope = 'plane-write'; issuedAt = $now.ToString('o'); expiresAt = $now.AddMinutes(60).ToString('o'); note = 'METRO-nn reason' } |
  ConvertTo-Json | Set-Content -LiteralPath (Join-Path $dir 'plane-write.json')
# when done
Remove-Item -LiteralPath (Join-Path $dir 'plane-write.json')
```

Use `gate-edit` the same way for a ticket that legitimately changes gate files. The marker is not scoped to a ticket or a path; keep the lifetime short and delete it when the work is done.

### What this does not protect against

- **An agent that can run Bash can write the marker file itself.** The hook cannot parse shell commands, and a path list or pattern for Bash would be bypassable (variables, quoting, other interpreters). File tools are blocked from the marker directory, but Bash is not. The marker therefore protects against mistakes, injected instructions that call the Plane tool directly, and unnoticed scope creep; it does not protect against an agent deliberately forging authorization through the shell. A session that has Bash allowed without a prompt has no tooling barrier against that.
- **The same holds for gate files.** `sed -i`, redirection or a script run through Bash can change a gate file without passing the hook. CODEOWNERS, signed commits, required checks and review on the pull request are the backstop; local hooks are bypassable and CI is authoritative.
- **The hook can be removed by editing `.claude/settings.json`**, but that edit is itself a gate edit. It is blocked for file tools, not for Bash. An owner who wants a boundary the agent cannot edit should put the hook and the permission rules in managed settings, which no other settings level can override ([permissions, settings precedence](https://code.claude.com/docs/en/permissions)); managed-only hook switches such as `allowManagedHooksOnly` and `disableAllHooks` exist in the settings reference but were not read for this ticket (Unverified).
- **Time-of-check:** the marker is read on every call, so deleting it takes effect on the next call. There is no per-call approval; during the marker window every Plane write is allowed. A prompt per write needs a permission `ask` rule on the tool, which cannot name an action.
- **Symlinks** are not resolved (the path is matched as given); `CLAUDE.md` is listed in CODEOWNERS next to `AGENTS.md` for that reason.
- **The matcher is a name pattern.** If the connector is renamed so the tool no longer starts with `mcp__claude_ai_Plane__` or `mcp__plane__`, the Plane hook does not fire. Re-check the names when the connector changes.
- **Live behaviour was not run inside Claude Code** by the author. See the verification steps below.

## Allow rules for Plane (owner action, not applied by this change)

`.claude/settings.local.json` is the owner's untracked file and is not edited by the ticket. Before this change it allowed whole tools (`workitem`, `module`, `release`, `release_tag`, `state`, `workitem_comment`, `label`, `cycle`, `initiative`, `milestone`, `workitem_type`) with no prompt, including create, update and delete. Rules cannot be narrowed per action (see above), so there are two honest options.

**Option A, strict (recommended until the hook is verified live).** Allow only tools that have no mutating action. Every other Plane tool prompts, reads included.

```json
{
  "permissions": {
    "allow": [
      "mcp__claude_ai_Plane__get_pql_reference",
      "mcp__claude_ai_Plane__member",
      "mcp__claude_ai_Plane__workitem_activity"
    ]
  }
}
```

Remove the whole-tool entries for `workitem`, `module`, `release`, `release_tag`, `state`, `workitem_comment`, `label`, `cycle`, `initiative`, `milestone` and `workitem_type`.

**Option B, convenient (after the live check below passes).** Keep the whole-tool entries for the tools the workflow reads often, so reads do not prompt, and rely on the hook for writes:

```json
{
  "permissions": {
    "allow": [
      "mcp__claude_ai_Plane__get_pql_reference",
      "mcp__claude_ai_Plane__member",
      "mcp__claude_ai_Plane__workitem_activity",
      "mcp__claude_ai_Plane__workitem",
      "mcp__claude_ai_Plane__workitem_comment",
      "mcp__claude_ai_Plane__state",
      "mcp__claude_ai_Plane__label",
      "mcp__claude_ai_Plane__workitem_type",
      "mcp__claude_ai_Plane__module",
      "mcp__claude_ai_Plane__milestone"
    ]
  }
}
```

Drop `release`, `release_tag`, `cycle` and `initiative` from the local allowlist in either option: nothing in the workflow needs them without a prompt. Under option B, while a `plane-write` marker exists the writes in the allowed tools run without a prompt; the marker is the authorization act. Do not put a parenthesised rule such as `mcp__claude_ai_Plane__workitem(action:create)` in a settings file: it is skipped.

## Verify live (needs a person in a real session)

A subagent cannot start a nested Claude Code session, so these were not run by the author:

1. Start Claude Code in the repository; accept the project settings trust prompt; `/hooks` should list two `PreToolUse` hooks from `.claude/settings.json`.
2. Without a marker, ask the agent to run `workitem` with action `create`: expect a blocked call showing the reason from stderr. Ask for `workitem` action `list`: expect it to run.
3. Ask the agent to `Write` to `scripts/probe.ts`: expect a block. Write `src/probe.ts` somewhere ordinary: expect it to proceed.
4. Create a `plane-write` marker as above, repeat step 2 with a harmless action, then delete the marker and confirm the block returns.
5. Rename `node` out of PATH (or run with a broken script path): expect a block, which is the `onFailure: "block"` check.

## Sources

Read 2026-11-04. Web-verified: <https://code.claude.com/docs/en/hooks> (PreToolUse input and decision control, exit codes, matcher syntax, `args` exec form, `onFailure`, hooks fire in subagents); <https://code.claude.com/docs/en/permissions> (MCP rule syntax, parentheses skipped for `mcp__` rules, deny and ask precedence, hook decisions do not bypass rules, settings precedence). Not read: the PreToolUse behaviour under `bypassPermissions` mode (Unverified); the `NotebookEdit` and `MultiEdit` input field names (the hook accepts `file_path` and `notebook_path`, and denies when neither is a string).

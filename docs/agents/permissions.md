# Permissions and agent authorization

Read before changing tracker access, gate files, `.claude/` settings or hooks. This is the policy for what an agent may do without a human act. It is covered by CODEOWNERS (`/docs/agents/`, `/.claude/`, `/scripts/`). Evidence rows: AI-02, AI-03 and AI-18 in [the audit](../evidence/audit-2026-11.md). Ticket: METRO-38.

Prose in AGENTS.md is context; Claude Code does not enforce it. Enforcement here is a tracked `PreToolUse` hook (`.claude/settings.json` runs `scripts/agent-authorization.ts`) that blocks, plus the permission rules the owner sets locally. The hook is a safety net against mistakes and prompt injection, not a security boundary against an agent that is trying to defeat it (see [limits](#what-this-does-not-protect-against)).

## What is blocked

| Call                                                                                                        | Blocked unless                      |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Any Plane tool call not listed as read-only below (server name contains "plane" in any case)                | a valid `plane-write` marker exists |
| `Edit`, `Write`, `MultiEdit`, `NotebookEdit` on a path listed in `.github/CODEOWNERS`                       | a valid `gate-edit` marker exists   |
| The same tools on any `settings.json` or `settings.local.json` inside a `.claude/` folder, anywhere on disk | a valid `gate-edit` marker exists   |
| The same tools on the marker directory itself                                                               | never (blocked even with markers)   |
| Device (`\\?\`, `\\.\`) and network (`\\host`) paths, alternate data streams (`file:stream`), NUL bytes     | never                               |
| 8.3 short names (`SCRIPT~1`) inside the project                                                             | never                               |
| Malformed hook input, unreadable or unsupported CODEOWNERS, `CLAUDE_PROJECT_DIR` unset (for file edits)     | never (fails closed)                |

Everything else is untouched: reads, ordinary edits, Bash and PowerShell, GitHub tools, and **paths outside the project** (an absolute path in another directory is allowed unless it is a Claude Code settings file or the marker directory). The hook adds no `allow` or `deny` permission entries; the tracked settings file contains hooks only.

Path handling is platform-independent and fail closed: backslashes and `/d/...`, `/mnt/d/...`, `/cygdrive/d/...` drive spellings are read as the same file as `D:\...` (both readings are checked), `.` and `..` are resolved, case is ignored, and trailing dots and spaces on a segment are stripped as Windows does. The project directory comes only from `CLAUDE_PROJECT_DIR` (set by Claude Code for hook processes, Web-verified); the payload `cwd` is not used, so a hook started from a subdirectory cannot shrink the gate. Paths under `.claude/worktrees/<name>/` are matched by their path inside that worktree.

## How a block works, and what is proven

Claude Code semantics (Web-verified, [hooks reference](https://code.claude.com/docs/en/hooks), read 2026-11-04): exit code 2 blocks the call and stderr is shown as the reason; exit 0 with no output leaves the normal permission flow in place; any other exit code, a timeout, or a missing executable is a non-blocking error unless the handler sets `onFailure: "block"` (requires Claude Code 2.1.295 or later); with `"block"` such a failure blocks like exit 2. A matcher made only of letters, digits, `_`, `-`, spaces, `,` and `|` is an exact list; anything else is an unanchored JavaScript regular expression tested against the tool name (`mcp__<server>__<tool>` for MCP tools). Hooks configured in settings run inside subagents too. Exec form (`command` plus `args`, `${CLAUDE_PROJECT_DIR}` substituted) spawns without a shell.

What the repository tests prove, and what they do not:

- Proven by running the code: the script exits 2 with the reason on stderr for every blocked case, exits 0 with no output for allowed cases, exits 2 on malformed input and on any internal failure (including a stdin error), and does so over a real process boundary using the exact command from `.claude/settings.json`. The entry-point check also runs the script by path for runtimes where `import.meta.main` is undefined.
- A model, not a proof: the claim that "a non-blocking exit would not block". `hookOutcome` in the script encodes the semantics above and the test checks the model and that the tracked configuration sets `onFailure: "block"`. Whether Claude Code really behaves that way is established by the documentation, not by these tests; the live steps below check it.
- Unverified until the live steps pass: that the matcher fires in a real session and in a worktree subagent (whether a subagent in a worktree loads this project's settings is not documented in what was read); the `file_path` key of `MultiEdit` and the `notebook_path` key of `NotebookEdit` (the hook reads either and denies when neither is a string); behaviour under `bypassPermissions`.

## Plane: read-only versus mutating

The Plane connector exposes about 30 tools, most with an `action` argument. A permission rule can name a tool but not an action: Claude Code skips any `mcp__` rule that has parentheses, and parameter matching for MCP tools is available only as a command-line `--disallowedTools` deny rule (Web-verified, [permissions](https://code.claude.com/docs/en/permissions), read 2026-11-04). So per-operation separation is possible only in the hook, which reads `tool_input.action`.

The hook's rule is an allow-list. A call is read-only only if its tool and action appear in the Read-only column below (exact, case-sensitive), or it is `get_pql_reference` with no action. Everything else is mutating: a new tool, a new action, an upper-case action, a missing or non-string action, and `workitem_type resolve` (it creates the type when absent). When the connector gains a read action, the call is blocked until the table and the code are updated together; that is the intended failure direction.

The table is the classification of the connected schemas as read on 2026-11-04 (Repo-verified against the tool schemas in the session; the connector may change). `scripts/agent-authorization.test.ts` checks that this table equals `PLANE_ACTIONS` in the script.

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

The settings matcher is `^mcp__.*[Pp][Ll][Aa][Nn][Ee]`: any MCP tool name that mentions "plane" in any case reaches the script, and the script, not the matcher, decides (it looks at the server segment between `mcp__` and the next `__`).

## Authorization markers

A marker is a small JSON file in `~/.claude/metro-authorization/` (`$HOME\.claude\metro-authorization\` on Windows), outside every repository checkout. Two scopes: `plane-write.json` and `gate-edit.json`. Content:

```json
{
  "scope": "plane-write",
  "issuedAt": "2026-11-04T12:00:00.000Z",
  "expiresAt": "2026-11-04T13:00:00.000Z",
  "note": "METRO-38 status update, owner approved in chat"
}
```

The hook accepts a marker only if the file parses, the scope matches the file's purpose, both dates are valid, `issuedAt` is not more than a minute in the future, `expiresAt` is after `issuedAt` and in the future, and `expiresAt - issuedAt` is at most 4 hours. Anything else leaves the call blocked. `note` is for the audit trail and is not read. The block message says only that the owner must act; it does not print the marker location (this document does).

Create a marker with exactly this format (`yyyy-MM-ddTHH:mm:ss.fffZ`, which `Date.parse` reads reliably) and without a byte order mark:

```powershell
$dir = Join-Path $HOME '.claude/metro-authorization'
New-Item -ItemType Directory -Force $dir | Out-Null
$now = [DateTime]::UtcNow
$json = [ordered]@{
  scope     = 'plane-write'
  issuedAt  = $now.ToString('yyyy-MM-ddTHH:mm:ss.fffZ', [Globalization.CultureInfo]::InvariantCulture)
  expiresAt = $now.AddMinutes(60).ToString('yyyy-MM-ddTHH:mm:ss.fffZ', [Globalization.CultureInfo]::InvariantCulture)
  note      = 'METRO-nn reason'
} | ConvertTo-Json
[IO.File]::WriteAllText((Join-Path $dir 'plane-write.json'), $json, [Text.UTF8Encoding]::new($false))
# when done
Remove-Item -LiteralPath (Join-Path $dir 'plane-write.json')
```

Encoding pitfalls: Windows PowerShell 5.1 `Set-Content -Encoding UTF8` writes a UTF-8 byte order mark and `Out-File` or the `>` operator write UTF-16; PowerShell 7 writes BOM-less UTF-8 by default. The hook tolerates a UTF-8 byte order mark, but UTF-16 text is not valid JSON to it and the marker is rejected (the call stays blocked). `[IO.File]::WriteAllText` with `UTF8Encoding($false)` is correct in both. Do not use `[DateTime]::ToString('o')`: it writes seven fractional digits, which is outside the format the hook is tested with.

## Operating procedure (owner and orchestrator, after this change merges)

1. Before any gate-touching work (a ticket that changes `scripts/`, `.github/`, `docs/agents/`, `.claude/`, `AGENTS.md`, `package.json` or anything else in CODEOWNERS), create a `gate-edit` marker for the expected duration, and delete it when the work is done. Without it, the implementing agent's file tools are blocked on those paths, which is the intended signal to ask.
2. Before the orchestrator writes to Plane (create, update, comment, state change, membership), create a `plane-write` marker, do the writes, and delete it. Reads need no marker.
3. Editing `.claude/settings.local.json` or any other settings file with a file tool is itself a gate edit and needs `gate-edit` first. The owner can still edit those files by hand outside Claude Code.
4. A marker is global to the user account: every session, worktree and subagent that runs the hook under the same home directory sees it while it is valid. It is not scoped to a ticket, a path or a session. Keep the lifetime short, never create one "just in case", and do not leave one while an unrelated agent is working.
5. WSL has a different home directory, so a marker created in Windows is not seen by a hook running under WSL (and the reverse). Create the marker where the Claude Code process runs. A hook under WSL also needs `node` there.
6. Record each marker creation and deletion in the ticket or PR evidence (who authorized what, for how long).

## What this does not protect against

- **An agent that can run Bash or PowerShell can write the marker file itself.** The hook cannot parse shell commands, and a path list or pattern for shells would be bypassable (variables, quoting, other interpreters). File tools are blocked from the marker directory, shells are not. The marker protects against mistakes, injected instructions that call the Plane tool or a file tool directly, and unnoticed scope creep; it does not protect against an agent deliberately forging authorization through a shell. A session that has a shell allowed without a prompt has no tooling barrier against that.
- **Gate files can be changed through a shell too.** `sed -i`, redirection or a script run through Bash or PowerShell changes a gate file without passing the hook. CODEOWNERS, signed commits, required checks and review on the pull request are the backstop; local hooks are bypassable and CI is authoritative.
- **Other write paths are not covered.** The hook has no matcher for the PowerShell tool, and none for GitHub MCP write tools such as `create_or_update_file`, `push_files`, `delete_file` or `create_branch`, which can change gate files in the remote repository without touching the working tree. Pull request review and the branch ruleset are the control there.
- **The hook can be removed by editing `.claude/settings.json`**, but that edit is itself a gate edit. It is blocked for file tools, not for shells. An owner who wants a boundary the agent cannot edit should put the hook and the permission rules in managed settings, which no other settings level can override ([permissions, settings precedence](https://code.claude.com/docs/en/permissions)); managed-only hook switches such as `allowManagedHooksOnly` and `disableAllHooks` exist in the settings reference but were not read for this ticket (Unverified).
- **There is no per-call approval.** The marker is read on every call, so deleting it takes effect on the next call, but while it is valid every Plane write is allowed. A prompt per write needs a permission `ask` rule on the tool, which cannot name an action.
- **Symlinks** are not resolved (the path is matched as given); `CLAUDE.md` is listed in CODEOWNERS next to `AGENTS.md` for that reason.
- **The matcher is a name pattern.** A Plane connector whose server name does not contain "plane" would not be seen; re-check the tool names when the connector changes.
- **8.3 short names and unusual roots are denied, not resolved**, so a legitimate file with `~1` in a name inside the project needs the owner.

## Allow rules for Plane (owner action, not applied by this change)

`.claude/settings.local.json` is the owner's untracked file and is not edited by the ticket. Before this change it allowed whole tools (`workitem`, `module`, `release`, `release_tag`, `state`, `workitem_comment`, `label`, `cycle`, `initiative`, `milestone`, `workitem_type`) with no prompt, including create, update and delete. Rules cannot be narrowed per action (see above), so there are two options.

**Option A, strict (use this until the live check below has passed).** Allow only tools that have no mutating action. Every other Plane tool prompts, reads included.

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

**Option B, convenient. Adopt it only after the live check below has passed on the machine that will use it.** Keep the whole-tool entries for the tools the workflow reads often, so reads do not prompt, and rely on the hook for writes:

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

Drop `release`, `release_tag`, `cycle` and `initiative` from the local allowlist in either option: nothing in the workflow needs them without a prompt. Under option B, while a `plane-write` marker exists the writes in the allowed tools run without a prompt; the marker is the authorization act. If the hook is not running (wrong `node`, hook not loaded, `/hooks` shows nothing), option B means unprompted writes, which is why it waits for the live check. Do not put a parenthesised rule such as `mcp__claude_ai_Plane__workitem(action:create)` in a settings file: it is skipped.

## Verify live (needs a person in a real session)

A subagent cannot start a nested Claude Code session, so these were not run by the author:

1. Start Claude Code in the repository; accept the project settings trust prompt; `/hooks` should list two `PreToolUse` hooks from `.claude/settings.json`.
2. Without a marker, ask the agent to run `workitem` with action `create`: expect a blocked call showing the reason from stderr. Ask for `workitem` action `list`: expect it to run.
3. Ask the agent to `Write` to `scripts/probe.ts`: expect a block. Write `src/probe.ts` somewhere ordinary: expect it to proceed.
4. Create a `plane-write` marker as above, repeat step 2 with a harmless action, then delete the marker and confirm the block returns.
5. Rename `node` out of PATH (or run with a broken script path): expect a block, which is the `onFailure: "block"` check.
6. Repeat step 2 from a subagent running in a worktree: this checks that the subagent loads the project hooks.

## Sources

Read 2026-11-04. Web-verified: <https://code.claude.com/docs/en/hooks> (PreToolUse input and decision control, exit codes, matcher syntax, `args` exec form, `onFailure`, `CLAUDE_PROJECT_DIR`, hooks fire in subagents); <https://code.claude.com/docs/en/permissions> (MCP rule syntax, parentheses skipped for `mcp__` rules, deny and ask precedence, hook decisions do not bypass rules, settings precedence). Repo-verified: the Plane tool schemas in the session and `.github/CODEOWNERS`. Unverified: the items listed under "A model, not a proof".

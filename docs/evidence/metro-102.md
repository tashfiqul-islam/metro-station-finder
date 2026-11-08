# METRO-102 evidence: closing the three live unknowns of the place search

Recorded 2026-11-08 (UTC). No agent ran the live check and no agent called real Google. Everything under "Measured earlier" is relayed by the owner from their runs (comments on PR #99 and PR #101). Nothing here is a result of the new report lines; the owner's run fills that in, in a new dated record, not by editing this one afterwards.

## Measured earlier (owner runs 2026-11-08), relayed; not re-run by an agent

- Inside Google's widget: `combobox "Search For a Place"` (unchanged by METRO-101), `Combobox expanded` no then yes, a listbox with 5 options, Tab order combobox then "Use my location".
- `Widget images: before typing 1 (1 unnamed), after typing 8 (7 unnamed)`.

## The three unknowns and what the next `smoke:live` prints

One owner run, one search, no extra Places, Routes or Maps request, no retry. The report only gains lines from the same accessibility snapshots it already reads.

| #   | Question                                                                                  | New line                                                                                                                           | Reading                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Did Google wire our `description` ("Suggestions favor places in Dhaka.") to the combobox? | `Combobox description: before typing X, after typing Y`                                                                            | `matches the hint`: yes (equal after trimming, collapsing spaces and ignoring case; extra text means different). `present but different (length N)`: something is wired, not our text (our hint is 34 characters; N prints as `1000+` when longer than 1000). `absent`: the tree has a string `description` that is empty. `not reported`: no `description` field, or one that is not a string. The text is never printed.                                           |
| 2   | What are the unnamed images?                                                              | `Unnamed images by parent: before typing ..., after typing option 5, button 2` and `Named images: before typing N, after typing N` | The role of the NEAREST meaningful ancestor of each unnamed image: the walk goes up from the image and skips `ignored` nodes and the wrappers `generic`, `none`, `StaticText`, `InlineTextBox` and `LineBreak`, at most 12 steps, and gives up on a cycle, a self-parent or a missing parent (`parent not reported`). Largest group first, at most 6 groups, then `more groups N`; `no unnamed images` when there are none. Roles and counts only: no names, no ids. |
| 3   | Does the `placeholder` option control the accessible name?                                | the existing `Search control: combobox "..."` line                                                                                 | Compare the printed name EXACTLY, case-sensitive, with `Search for a place`. `Search For a Place` (capital F and P) means UNCHANGED.                                                                                                                                                                                                                                                                                                                                 |

"Not reported" versus "absent" (Inferred, not Web-verified in the protocol text): the DevTools `Accessibility.AXNode` type declares `description` as an optional `AXValue`. Chrome is understood to omit the field when there is no description, in which case `not reported` cannot tell "none" from "not exposed". Context7 returned only the field summaries for this type, not the omission rule. Unverified.

## Decision rule for the placeholder (one rule, exact case)

Read the `Search control` name from the run and compare it character for character with `Search for a place`. The integration branch carried the experiment only until the owner's run; the default was REMOVE. The rule is applied in "Result" below (outcome (b)).

| Outcome                             | Name printed                                            | Decision                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (a) changed to the placeholder text | exactly `Search for a place`                            | KEEP only if the owner also confirms by eye and with a screen reader that no duplicate placeholder is visible or announced twice (WCAG 3.3.2: a placeholder is not a label; its contrast is Google's, not ours). Otherwise REMOVE. If kept, record the name as Measured. |
| (b) unchanged                       | `Search For a Place`                                    | REMOVE in a second small PR (adapter prop, local `PlacesApi` type, the slice's argument, the stub's reflection and the tests), including when a placeholder is visible.                                                                                                  |
| (c) something else                  | any other name                                          | Record it, default REMOVE, decide on the ticket.                                                                                                                                                                                                                         |
| (d) description                     | `matches the hint`, `present but different` or `absent` | Independent of the placeholder decision. `matches`: keep the hint wiring. `absent` or `not reported`: the visible hint paragraph is the only carrier; do not claim it is announced. `different`: investigate before any change.                                          |

Images (question 2): unnamed images under a role a screen reader skips need no change. Under `option` or `button` they are Google's own icons that we cannot name (no documented option): record the finding, any workaround is a new ticket.

## Unverified (as recorded before the owner run; superseded by "Result" below)

- All three answers above.
- That the real widget honors the `placeholder` option at all. The local option type matches `@types/google.maps` 3.66.9, where `PlaceAutocompleteElementOptions.placeholder` is `placeholder?: string | null` (read in `node_modules`), so the call compiles; behaviour is not checked.
- Whether the real element then shows a visible placeholder (a second visible label that must also be contained in the name, and a WCAG 3.3.2 question).
- Whether the new lines print as designed against the real tree. The ancestor walk uses `parentId` of each AX node and is unit tested on synthetic nodes only.

## Changed by this ticket

`scripts/smoke-live-report.ts` and `scripts/smoke-live.ts` (report lines above, hint passed in from the feature's `copy.ts` so the text lives once), the adapter's `placeholder` option and its local type, the slice's call (`copy.searchLabel`), the e2e fake (stores the option and reflects it as the input placeholder), and tests for each.

Script-to-app import: `smoke-live.ts` imports `apps/web/src/features/nearest-station/copy.ts`. Chosen over a duplicated constant because `copy.ts` has no imports (no React or DOM reaches Node) and one source cannot drift. `scripts/script-imports.test.ts` fails if any script imports anything under `apps/` other than that file, or if `copy.ts` gains an import. No dependency-cruiser rule was changed; a comment in its config records the exception.

## Result (2026-11-08, follow-up PR for METRO-102)

Everything here is Measured by the owner's third live run on 2026-11-08 at 19:17, relayed as a comment on PR #102 (comment id 6721991523). It was not re-run by an agent and no agent called real Google. The run used the build that passed the hint-text (`placeholder`) option as "Search for a place".

Measured output:

- `Search control: combobox "Search For a Place"` (unchanged).
- `Combobox description: before typing matches the hint, after typing matches the hint`.
- `Unnamed images by parent: before typing group 1, after typing option 5, button 1, group 1`.
- `Named images: before typing 0, after typing 1`.
- `Widget images: before typing 1 (1 unnamed), after typing 8 (7 unnamed)`.
- Places requests 10, Routes requests 1, CSP messages 0, result PASS.

Closed decision (outcome (b) of the rule above, name compared character for character): the hint-text option does not control the accessible name, so it is REMOVED in this follow-up PR (adapter prop, local `PlacesApi` type, the slice's argument, the stub's reflection and their assertions).

Answers to the three questions:

1. Description: Google wires our `description` (matches the hint, before and after typing). METRO-101's description reaches the combobox. Label in name still rests on Google's own name "Search For a Place" containing our visible label "Search for a place" (case-insensitive).
2. Unnamed images: the 7 unnamed images are Google's own icons, 5 inside the suggestion options, 1 inside a button and 1 inside a group; one more image is named. They are inside Google's widget and we cannot name them. Whether a screen reader announces them: Unverified.
3. Name: unchanged, so no lever; the option is gone.

Still Unverified: whether the real element showed a visible hint text of its own while the option was set (the report prints no visual check); what a screen reader announces for the description and the images.

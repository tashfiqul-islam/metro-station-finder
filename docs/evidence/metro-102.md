# METRO-102 evidence: closing the three live unknowns of the place search

Recorded 2026-11-08 (UTC). No agent ran the live check and no agent called real Google. Everything under "Measured earlier" is relayed by the owner from their runs (comments on PR #99 and PR #101). Nothing under "Result of the next owner run" exists yet; that section is filled in by the owner's run, in a new dated file or a follow-up, not by editing this one after the fact.

## Measured earlier (owner runs 2026-11-08), relayed; not re-run by an agent

- Inside Google's widget: `combobox "Search For a Place"` (unchanged by METRO-101), `Combobox expanded` no then yes, a listbox with 5 options, Tab order combobox then "Use my location".
- `Widget images: before typing 1 (1 unnamed), after typing 8 (7 unnamed)`.

## The three unknowns and what the next `smoke:live` prints

One owner run, one search, no extra Places, Routes or Maps request, no retry. The report only gains lines from the same accessibility snapshots it already reads.

| #   | Question                                                                                  | New line                                                                                                                           | Reading                                                                                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Did Google wire our `description` ("Suggestions favor places in Dhaka.") to the combobox? | `Combobox description: before typing X, after typing Y`                                                                            | `matches the hint`: yes, wired. `present but different (length N)`: something is wired, not our text (compare N with the hint length 34). `absent`: the tree has a `description` field and it is empty: not wired. `not reported`: the node has no `description` field at all. The raw text is never printed. |
| 2   | What are the unnamed images?                                                              | `Unnamed images by parent: before typing ..., after typing option 5, button 2` and `Named images: before typing N, after typing N` | The role of each unnamed image's parent node, largest group first (at most 6 groups, then `other N`), `none` when there are no unnamed images, `parent not reported` when the tree gives no resolvable parent. Roles and counts only: no names, no ids.                                                       |
| 3   | Does the `placeholder` option control the accessible name?                                | the existing `Search control: combobox "..."` line                                                                                 | The name is compared with the visible label "Search for a place" (the placeholder is set to the same text).                                                                                                                                                                                                   |

"Not reported" versus "absent" (Inferred, not Web-verified in the protocol text): the DevTools `Accessibility.AXNode` type declares `description` as an optional `AXValue`. The report calls a missing field `not reported` and a present field with an empty value `absent`. Chrome is understood to omit the field when there is no description, in which case a missing field cannot tell "none" from "not exposed" and the two readings mean the same in practice. Context7 returned only the field summaries for this type, not the omission rule. Unverified.

## Decision rules (also in the specification and the runbook)

Placeholder (question 3):

- The name now reads "Search for a place" (the placeholder text, in any letter case that matches it): KEEP the option. The visible label and the accessible name then match exactly. Record the result as Measured.
- The name is still "Search For a Place": REMOVE the `placeholder` option in a second small PR (adapter prop, local `PlacesApi` type, the slice's argument, the stub's reflection and the tests), unless a documented reason to keep it exists. A placeholder that only repeats the visible label is noise, so the default is remove.
- Any other name: record it, treat it as new information, and decide on the ticket before keeping anything. Until decided the default is still remove.

Description (question 1): `matches the hint` keeps the hint wiring as it is. `absent` or `not reported` means the visible hint paragraph is the only carrier of that text; record it on METRO-101's limit (c) and do not claim the description is announced. `present but different` is investigated before any change.

Images (question 2): decorative images that sit under a role a screen reader skips need no change. If unnamed images sit under `option` or `button` (interactive parents), record it as a finding about Google's widget; we cannot name them (no documented option), so the record is the outcome and any workaround is a new ticket.

## Unverified (still open until the owner run)

- All three answers above.
- That the real widget honors the `placeholder` option at all (typed in `@types/google.maps` 3.66.9, so the call compiles; behaviour is not checked).
- Whether the real element then shows a visible placeholder, which would be a second visible label that must also be contained in the name.
- Whether the new report lines print as designed against the real tree (the parent link uses `parentId` of each AX node; the pure logic is unit tested on synthetic nodes only).

## Changed by this ticket

`scripts/smoke-live-report.ts` and `scripts/smoke-live.ts` (report lines above, hint passed in from the feature's copy so the text lives once), the adapter's `placeholder` option and its local type, the slice's call (`copy.searchLabel`), the e2e fake (stores the option and reflects it as the input placeholder), and tests for each.

# METRO-100 evidence: accessibility of the real search widget

Recorded 2026-11-08 (UTC). The numbers below are relayed by the owner from their own probe. No agent ran them and no agent called real Google.

## Measured (owner-run probe, 2026-11-08, base e5a2e04), relayed by the owner; not re-run by an agent

Headed Chromium 156, one search of nine characters, a separate probe script (not `smoke:live`):

- The browser accessibility tree read over the DevTools protocol (CDP) includes the widget's shadow content. Before typing, the widget subtree has 5 AX nodes: generic 3, image 1, combobox 1.
- The search control is `combobox "Search For a Place"`, a name Google supplies (capital F).
- Tab order on a fresh page: 1. combobox "Search For a Place" (inside the widget); 2. button "Use my location"; 3. focus left the page.
- Places requests for the nine-character query: 9, one per keystroke.
- After typing, the widget subtree has listbox 1, option 5, button 2, image 8, combobox 1, plus generic and StaticText nodes. Focus stays inside the widget.
- Scoping worked live: `DOM.getDocument` with `depth: -1` and `pierce: true`, find the `gmp-place-autocomplete` node, collect the `backendNodeId` of its subtree, keep the AX nodes whose `backendDOMNodeId` is in that set. `smoke:live` now does the same.
- Chrome reports icon nodes with role `image`, not `img`.
- Offline, against a stand-in widget, Playwright locators and `ariaSnapshot` could not see inside it, and the CDP tree could.

## Unverified (still open)

- Whether the shadow root is closed. The probe did not read `shadowRoot` directly; "closed" stays Unverified. What is Measured is the locator-versus-CDP difference above.
- What a screen reader says: announcements when suggestions appear, arrow-key highlighting, `aria-activedescendant`, the expanded state while navigating, Escape, Shift+Tab. None were captured. `smoke:live` prints the combobox `expanded` state before and after typing only when the same tree snapshot reports it, otherwise `not reported`; active descendant is not read.
- Label consistency: Google's name is `Search For a Place`; the app's visible label is `Search for a place in Dhaka` (a fieldset legend). The two read differently and may fail WCAG 2.5.3 Label in Name. A follow-up ticket will look at it. This ticket changes no app code.
- Whether `smoke:live`'s own output matches the probe (it has not been run since METRO-100). The first owner run after merge is the check.

## Changed by this ticket

`scripts/smoke-live.ts` and `scripts/smoke-live-report.ts` report the widget-scoped control, its role and name, whether it was reached by Tab, expanded state, image counts (with unnamed ones), the listbox option count (never the names) and the Tab order with an in-widget mark. A widget that cannot be resolved FAILs with `could not read inside the widget`.

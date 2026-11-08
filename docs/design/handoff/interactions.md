# Interactions

Every behaviour here is CSS plus a small amount of app JavaScript, with no libraries. The motion is CSS only. Every animation has a reduced-motion replacement, listed under Motion in handoff.md.

## Bottom sheet (below 768px)
- **Heights:**
  - peek = `196px`
  - half = `58dvh` (about 490px on a 390 × 844 phone)
  - full = `calc(100dvh − 148px − env(safe-area-inset-bottom))` (about 696px)
- **Drag:** pointerdown on the grip records y. Past 4px of movement, `data-dragging` is set on `.panel` and `--sheet-h` is written on `.app`, clamped between 120px and full. On release, it snaps to the nearest of the three heights and removes `data-dragging` and `--sheet-h`.
- **Tap the grip:** cycles peek → half → full → peek.
- **Keyboard:** grip focused, ArrowUp = larger, ArrowDown = smaller. The two text buttons "Make panel larger" and "Make panel smaller" appear on focus.
- **Snap rules by event:**
  - typing in either search field → full
  - a result, error or locating → half
  - "Show on map" → peek
  - opening a tab from peek → half
- **What is hidden when collapsed:** nothing. The sheet changes height instead of sliding off-screen, so all content stays in the scroll area and in the accessibility tree. No `inert` is needed. The scroll area has `scroll-padding-bottom: 96px`, so focused items are never hidden behind the tab bar (WCAG 2.4.11).
- **Motion:** `height 340ms var(--ease-sheet)`, instant under reduced motion.

## Tab bar and sidebar switch (exactly 768px)
- **Below 768px:** `.tabs` is a bottom pill bar. The active item widens and shows its label; the others show icons with their label available to assistive tech.
- **768px and up:** the same `<nav>` sits at the top of the sidebar as a 4-column segmented bar.
- **Semantics:** links with `aria-current="page"` (router links), never `role="tab"`.
- **Motion:** flex and label width over 320ms on the spring curve, instant under reduced motion.

## Use my location → locating sequence
1. Press "Use my location". If permission was never asked, the browser prompt appears. The consent line under the button explains what is sent.
2. The **Locating** state shows: status card, looping logo ping, "Finding your position", `role="status"`. Timeout is 8s.
3. **Outcomes:**
   - **Position with accuracy ≤ 2,000m:** Result, which shows the station, walk and distance (Google route), the neighbour strip and the fare range.
   - **Accuracy > 2,000m:** Rough. No station, fare or route is shown. Insert the rounded km figure into "Your device found your position only roughly, with an error of about {km} km. The nearest station could be wrong, so none is shown. Search for a place instead."
   - **No accuracy value:** Rough, unknown variant.
   - **Permission denied:** "Location is turned off. Search for a place instead."
   - **Error or timeout:** "Your position could not be found. Search for a place instead.", with a Try again button.
   - **Google walking route fails:** Result with "The walking route is unavailable. The station and fare are still correct."
4. **Focus:** after Result, focus moves to the result heading (`h2#res-name`, `tabindex="-1"`). After an error, it moves to the first action in the notice. Notices that appear without moving focus use `role="alert"`. Status-only messages use `role="status"`.

## Station combobox (Or pick a station)
- **Pattern:** WAI-ARIA combobox with a listbox popup. The input has `aria-expanded`, `aria-controls="station-list"` and `aria-activedescendant`.
- **Keys:**
  - ArrowDown / ArrowUp move the active option (it wraps).
  - Enter opens Station detail.
  - Escape first clears the list, then the text.
  - Home and End move the caret.
- **Matching:** case-insensitive substring, ignoring spaces and hyphens. The matched part is wrapped in `.option__match`.
- **No match:** an empty state with "Browse all 16 stations", which goes to the Line tab. It stays visible after blur so its button can be reached with Tab.

## Google Places slot (Search for a place)
- We render `<gmp-place-autocomplete>` inside `.place-slot`. Its focus ring is drawn on our container with `:focus-within`.
- On `gmp-select`, read the place's coordinates, then run the same flow as a GPS result (with no accuracy check).
- If the library fails to load, or `navigator.onLine === false`, swap the slot for the small warning notice.

## Command palette (Ctrl/Cmd+K, or the search button)
- **Opens:** a modal dialog. Focus goes to the input, the background is `inert`, and the scrim closes it on click.
- **Contents:** combobox (as above) over actions and stations.
- **Keys:** Enter runs the active item. Escape closes the palette and returns focus to whatever opened it.
- **Empty:** "No results" plus a hint.
- **Motion:** rise 220ms, instant under reduced motion.

## Route and fare
- **From / To:** each button opens a station picker (the same combobox, full sheet). Choosing a station sets it, then a toast "Origin set to {station}" / "Destination set to {station}" appears with Undo.
- **Swap:** rotates 180° over 260ms (spring) and swaps the stations. It's disabled until both are set.
- **Scrubber:** pointer capture on the track picks the nearer handle. Dragging snaps to the 16 stops. Each handle is `role="slider"` (1–16, `aria-valuetext` = station name). Arrows ±1, Home/End to the termini.
- **Same station:** a warning notice with "Choose destination", which opens the To picker.
- **No fare available:** an info notice. The ticket is not shown.
- **Fare figure:** counts from the old value to the new one over 360ms. Under reduced motion it jumps.
- **Fare map:** `role="application"`. Arrows move the cell and the reading above updates in a polite live region. Enter sets the trip.

## Toast
- **Placement:** one at a time, above the sheet on mobile and bottom-centre of the map area on desktop.
- **Timing:** 4s, or 6s if there's an Undo. Hover or focus pauses it; leaving resumes.
- **Dismiss:** with × (aria-label "Dismiss").
- **Leaving:** fades over 180ms, instant under reduced motion. A new toast replaces the current one.
- **Undo:** reverts the change and shows "Change undone" for 2.5s.
- **Announcement:** the text is announced through the polite `role="status"` region. Error toasts use `role="alert"`.

## Theme
- **Header button cycle:** System → Light → Dark → System. It's labelled "Theme: {current}. Switch to {next}".
- **Settings:** a radio group (System / Light / Dark).
- **Storage:** persisted as `localStorage['msf-theme']` = `"system" | "light" | "dark"`. Apply it before first paint from an external same-origin script, `theme-boot.js`, loaded in `<head>` with no `defer`. It sets `<html data-theme>` for light and dark, and removes the attribute for system.
- **Motion:** where View Transitions exist, the new theme is revealed as a circle from the button (560ms). Add `html.vt-theme` during the reveal so that `* { animation-play-state: paused; transition: none }` applies. No transition under reduced motion.

## Map
- **Pointer:** drag pans, wheel and pinch zoom around the pointer (0.5×–8×), and a tap on empty map drops nothing. Pins open Station detail.
- **Keyboard** (map focused): arrows pan by 60px, + and − zoom, 0 shows the whole line.
- **Buttons:** Zoom in, Zoom out and Show whole line. Changing the viewBox animates over 520ms with an in-out curve, instant under reduced motion.
- **After results, the map fits:** the user and the station, the From and To stations, or the detail station.

## Lazy-loaded sections
- **Pending:** "Loading" as text, `role="status"`. The shimmer bars are `aria-hidden` and static under reduced motion.
- **Failed:** "This part of the page could not be loaded. Reload the page to try again." with one button, "Reload the page" (`location.reload()`).
  - Focus moves to the container (`tabindex="-1"`, `aria-labelledby` = the message). Because focus moves there, it is **not** `role="alert"`.

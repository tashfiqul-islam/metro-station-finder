/**
 * Focuses `target` and, when it is a widget host whose shadow root can be read, the input inside it, with the
 * caret at the end of what is already typed. `focus()` on Google's `gmp-place-autocomplete` host may or may not
 * reach its inner input (Unverified for the real widget, whose root may be closed; the live check prints whether
 * typing reached it), so both are tried.
 */
export function focusElement(target: HTMLElement): void {
  target.focus();
  const inner =
    target instanceof HTMLInputElement
      ? target
      : (target.shadowRoot?.querySelector<HTMLInputElement>("input") ?? null);
  if (inner !== null) {
    inner.focus();
    const end = inner.value.length;
    inner.setSelectionRange(end, end);
  }
}

/**
 * Moves focus into the search control under `root`: the visible plain input, or the Google widget once it has
 * replaced it. Returns whether there was anything to focus.
 */
export function focusSearchControl(root: ParentNode | null): boolean {
  const target =
    root?.querySelector<HTMLElement>("input:not([hidden])") ??
    root?.querySelector<HTMLElement>("gmp-place-autocomplete") ??
    null;
  if (target === null) return false;
  focusElement(target);
  return true;
}

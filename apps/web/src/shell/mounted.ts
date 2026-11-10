/** A ref to an element of this shell; callers run only while it is mounted, and fail visibly if it is not. */
export function mounted(ref: { readonly current: HTMLElement | null }): HTMLElement {
  if (ref.current === null) throw new Error("AppShell is not mounted");
  return ref.current;
}

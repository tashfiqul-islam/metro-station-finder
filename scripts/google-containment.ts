/**
 * METRO-88: Google stays inside `apps/web/src/adapters/maps`. The dependency rule catches imports, but
 * tsconfig puts the `google.maps` types in every web file, so a feature could still use the ambient
 * global (or `window.google`) with no import. This text check closes that gap. It is a text guard only:
 * an alias (`const g = window; g.google`) or a computed key is not caught.
 */
export const GOOGLE_GLOBAL =
  /\bgoogle\.maps\b|\b(?:window|globalThis|self)\.google\b|\b(?:window|globalThis|self)\[\s*["'`]google["'`]\s*\]/u;

const ADAPTER = "apps/web/src/adapters/maps/";

/** Paths (forward slashes) outside the adapter whose text uses the Google global. */
export function googleOutsideAdapter(files: Readonly<Record<string, string>>): string[] {
  return Object.entries(files)
    .filter(([path, text]) => !path.startsWith(ADAPTER) && GOOGLE_GLOBAL.test(text))
    .map(([path]) => path);
}

import type { RootOptions } from "react-dom/client";

/**
 * Error names that are fixed by the JavaScript language. Any other name could be set by code (or a
 * library) to contain user input such as coordinates or a URL, so it is never logged.
 */
const BUILT_IN_NAMES: ReadonlySet<string> = new Set([
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
]);

/** The only thing the app reports about a render error: a built-in class name, never a message. */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "NonError";
  return BUILT_IN_NAMES.has(error.name) ? error.name : "Error";
}

export function reportError(error: unknown): void {
  console.error(`Render error: ${describeError(error)}`);
}

function report(error: unknown): void {
  reportError(error);
}

/**
 * React 19 root callbacks. Setting them replaces React's default console output, which prints the
 * raw error (and so any coordinates or URL in its message). The component stack is dropped too.
 */
export const rootErrorOptions: RootOptions = {
  onCaughtError: report,
  onUncaughtError: report,
  onRecoverableError: report,
};

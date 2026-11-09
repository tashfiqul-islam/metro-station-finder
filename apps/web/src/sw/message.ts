/** The one message a page may send the worker: end the wait and take over (ADR-0023). Shared, so the lazy
 * registration chunk does not pull the worker's logic into the app. */
export const SKIP_WAITING = "skip-waiting";

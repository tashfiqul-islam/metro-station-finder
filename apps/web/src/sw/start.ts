import { afterIdle, type Schedule } from "../vitals";

export type LoadRegistration = () => Promise<{ registerWorker: () => Promise<void> }>;

/**
 * Registers the offline shell worker once the page has loaded and is idle (METRO-106, ADR-0023), in a lazy
 * chunk, so the first visit downloads and runs none of it. Production builds only: the dev server has no
 * `sw.js`. A failure (no support, blocked, offline) is dropped without a log: the app works without it, and
 * the error text can carry a URL.
 */
export function startServiceWorker(
  enabled: boolean = import.meta.env.PROD,
  schedule: Schedule = afterIdle,
  load: LoadRegistration = () => import("./register"),
): void {
  if (!enabled) return;
  schedule(() => {
    load()
      .then(async ({ registerWorker }) => registerWorker())
      .catch(() => null);
  });
}

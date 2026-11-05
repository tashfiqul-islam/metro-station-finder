import { GlobalRegistrator } from "@happy-dom/global-registrator";

/**
 * One happy-dom registration per test process, shared by every component test file.
 *
 * Bun runs all test files in one process and caches modules. React, the scheduler and Testing
 * Library bind to the globals that exist when they are first imported, so a second file that
 * registers a fresh DOM after the first file unregistered one gets a stale React (measured:
 * `findBy*` timed out after 1 s in whichever file ran second). Import this module before React.
 */
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();

/** True once the shared DOM exists; tests may assert it so the import is not side-effect-only. */
export const domRegistered: boolean = GlobalRegistrator.isRegistered;

import { SKIP_WAITING } from "./message";

/**
 * Registration and the update prompt of the offline shell worker (METRO-106, ADR-0023). This module is a lazy
 * chunk, loaded by `start.ts` after the page has loaded and is idle, so it never touches the first visit.
 *
 * Update flow: a new worker installs and then WAITS. The page keeps running on the version it loaded, with
 * that version's cached files; a prompt offers "Reload". Only that press (a message from this page) lets the
 * new worker take over, and the page reloads once it has. Ignoring the prompt is safe: the waiting worker
 * takes over on the next visit after every tab is closed, and an online visit always loads the newest page
 * (network first), so nobody is stranded on an old shell. All copy is fixed; no error is ever shown.
 */
export const swCopy = {
  ready: "A new version is ready.",
  reload: "Reload",
  dismiss: "Dismiss",
  failed: "The update could not be applied. Close the app and open it again.",
} as const;

/** How long the page waits for the new worker to take over before it says so. */
const TAKEOVER_WAIT_MS = 5000;
/** The status region is mounted empty first, then filled, so assistive technology announces the text. */
const FILL_DELAY_MS = 100;

export interface WorkerLike {
  postMessage(message: unknown, transfer: Transferable[]): void;
  readonly state: string;
  addEventListener(type: "statechange", listener: () => void): void;
}
export interface RegistrationLike {
  readonly waiting: WorkerLike | null;
  readonly installing: WorkerLike | null;
  addEventListener(type: "updatefound", listener: () => void): void;
  update(): Promise<unknown>;
}
export interface ContainerLike {
  readonly controller: unknown;
  register(
    script: string,
    options: { scope: string; updateViaCache: "none" },
  ): Promise<RegistrationLike>;
  addEventListener(type: "controllerchange", listener: () => void): void;
}
export interface Env {
  readonly container: ContainerLike;
  readonly document: Document;
  readonly reload: () => void;
  readonly later: (task: () => void, ms: number) => void;
  readonly online: () => boolean;
}

const defaultEnv = (container: ContainerLike): Env => ({
  container,
  document,
  reload: () => {
    location.reload();
  },
  later: (task, ms) => {
    setTimeout(task, ms);
  },
  online: () => navigator.onLine,
});

function button(document: Document, className: string, text: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = text;
  return element;
}

/** Mounts the empty status region the prompt will be filled into, in the shell's toast region. */
function mountRegion(document: Document): HTMLElement {
  const region = document.createElement("div");
  region.setAttribute("role", "status");
  (document.querySelector(".toast-region") ?? document.body).append(region);
  return region;
}

function fillPrompt(env: Env, region: HTMLElement, worker: WorkerLike): void {
  const { document } = env;
  const toast = document.createElement("div");
  toast.className = "toast";
  const text = document.createElement("span");
  text.className = "toast__text";
  text.textContent = swCopy.ready;
  const reload = button(document, "toast__action", swCopy.reload);
  const dismiss = button(document, "toast__close", "");
  dismiss.setAttribute("aria-label", swCopy.dismiss);
  const cross = document.createElement("span");
  cross.setAttribute("aria-hidden", "true");
  cross.textContent = "×";
  dismiss.append(cross);

  let reloading = false;
  env.container.addEventListener("controllerchange", () => {
    // The first install also takes control; only the press on Reload may reload the page.
    if (reloading) env.reload();
  });
  reload.addEventListener("click", () => {
    reloading = true;
    reload.hidden = true;
    worker.postMessage({ type: SKIP_WAITING }, []);
    env.later(() => {
      text.textContent = swCopy.failed;
      dismiss.focus();
    }, TAKEOVER_WAIT_MS);
  });
  dismiss.addEventListener("click", () => {
    const hadFocus = toast.contains(document.activeElement);
    toast.remove();
    if (hadFocus) document.querySelector<HTMLElement>(".panel__scroll")?.focus();
  });
  toast.append(text, reload, dismiss);
  region.append(toast);
}

/** Registers `/sw.js` and wires the update prompt. Resolves quietly when registration is not possible. */
export async function registerWorker(
  container: ContainerLike | undefined = "serviceWorker" in navigator
    ? navigator.serviceWorker
    : undefined,
  env: Env | undefined = container === undefined ? undefined : defaultEnv(container),
): Promise<void> {
  if (container === undefined || env === undefined) return;
  // Offline, a worker already controls the page (or none can be fetched): checking for a new one waits.
  if (!env.online()) return;
  const registration = await container.register("/sw.js", { scope: "/", updateViaCache: "none" });
  const region = mountRegion(env.document);
  let offered = false;
  const offer = (worker: WorkerLike): void => {
    // Without a controller this is the first install, not an update: nothing to offer.
    if (offered || container.controller === null) return;
    offered = true;
    env.later(() => {
      fillPrompt(env, region, worker);
    }, FILL_DELAY_MS);
  };
  if (registration.waiting !== null) offer(registration.waiting);
  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    installing?.addEventListener("statechange", () => {
      if (installing.state === "installed") offer(installing);
    });
  });
  // A page left open for days (an installed app) checks again whenever it is shown.
  env.document.addEventListener("visibilitychange", () => {
    if (env.document.visibilityState === "visible" && env.online()) {
      registration.update().catch(() => null);
    }
  });
}

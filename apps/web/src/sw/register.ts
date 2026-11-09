import { SKIP_WAITING } from "./message";

/**
 * Registration and the update prompt of the offline shell worker (METRO-106, ADR-0024). This module is a lazy
 * chunk, loaded by `start.ts` after the page has loaded and is idle, so it never touches the first visit.
 *
 * Update flow: a new worker installs and then WAITS. The page keeps running on the version it loaded, with
 * that version's cached files; a prompt offers "Reload". Only that press (a message from this page) lets the
 * new worker take over, and the page reloads once it has. Another tab that was open on the old version hears
 * the takeover (`controllerchange`) and gets the same prompt, whose Reload then only reloads. Ignoring the
 * prompt is safe: the waiting worker takes over on the next visit after every tab is closed. A dismissed
 * prompt is not offered again in that page view. All copy is fixed; no error is ever shown.
 */
export const swCopy = {
  ready: "A new version is ready.",
  reload: "Reload",
  dismiss: "Dismiss",
  updating: "Updating…",
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
  readonly active: unknown;
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
  /** Runs `task` once, when the browser reports the connection is back. */
  readonly whenOnline: (task: () => void) => void;
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
  whenOnline: (task) => {
    addEventListener("online", task, { once: true });
  },
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

interface Session {
  readonly env: Env;
  readonly registration: RegistrationLike;
  /** True once this page pressed Reload: only then may its `controllerchange` reload it. */
  initiated: boolean;
}

function fillPrompt(session: Session, region: HTMLElement): void {
  const { env, registration } = session;
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

  reload.addEventListener("click", () => {
    // The registration's waiting worker is the one to tell. None waiting means another tab already applied
    // the update, so this page only has to reload.
    const waiting = registration.waiting;
    if (waiting === null) {
      env.reload();
      return;
    }
    session.initiated = true;
    waiting.postMessage({ type: SKIP_WAITING }, []);
    // Hiding the focused button would drop focus to the page: move it to Dismiss and say what is happening.
    text.textContent = swCopy.updating;
    reload.hidden = true;
    dismiss.focus();
    env.later(() => {
      text.textContent = swCopy.failed;
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

/**
 * Registers `/sw.js` and wires the update prompt. Resolves quietly when registration is not possible. Offline
 * it waits for the `online` event instead, so a page opened without a network still learns of updates later.
 */
export async function registerWorker(
  container: ContainerLike | undefined = "serviceWorker" in navigator
    ? navigator.serviceWorker
    : undefined,
  env: Env | undefined = container === undefined ? undefined : defaultEnv(container),
): Promise<void> {
  if (container === undefined || env === undefined) return;
  if (!env.online()) {
    env.whenOnline(() => {
      registerWorker(container, env).catch(() => null);
    });
    return;
  }
  let hadController = container.controller !== null;
  const registration = await container.register("/sw.js", { scope: "/", updateViaCache: "none" });
  const region = mountRegion(env.document);
  const session: Session = { env, registration, initiated: false };
  let offered = false;
  const offer = (): void => {
    if (offered) return;
    offered = true;
    env.later(() => {
      fillPrompt(session, region);
    }, FILL_DELAY_MS);
  };
  container.addEventListener("controllerchange", () => {
    // The first install also takes control (no controller before): that is not an update. A page that had a
    // controller and did not press Reload itself is running old HTML under a new worker: offer the reload.
    if (session.initiated) env.reload();
    else if (hadController) offer();
    hadController = true;
  });
  if (registration.waiting !== null) offer();
  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    // Read when the worker is found, before it can activate: a registration with no active worker is on its
    // first install, which needs no prompt. `container.controller` is not used because a first install claims the
    // page and WebKit can report "installed" after that claim (Repo-verified: a false prompt on the first visit).
    const isUpdate = registration.active !== null;
    installing?.addEventListener("statechange", () => {
      if (isUpdate && installing.state === "installed") offer();
    });
  });
  // A page left open for days (an installed app) checks again whenever it is shown.
  env.document.addEventListener("visibilitychange", () => {
    if (env.document.visibilityState === "visible" && env.online()) {
      registration.update().catch(() => null);
    }
  });
}

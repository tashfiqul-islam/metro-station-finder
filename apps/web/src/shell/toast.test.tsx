import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

import { AppShell } from "./AppShell";
import { shellCopy } from "./copy";
import { ToastLive, ToastRegion, useToast } from "./toast";
import type { ToastApi } from "./toast";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

/** Renders the shell with a probe that hands the toast API to the test. */
function mount(initialSnap?: "peek" | "half" | "full"): {
  api: () => ToastApi;
  container: HTMLElement;
} {
  const held: { current: ToastApi | null } = { current: null };
  function Probe(): null {
    const api = useToast();
    useEffect(() => {
      held.current = api;
    });
    return null;
  }
  const { container } = render(
    <AppShell {...(initialSnap === undefined ? {} : { initialSnap })}>
      <Probe />
    </AppShell>,
  );
  return {
    container,
    api: () => {
      if (held.current === null) throw new Error("probe did not render");
      return held.current;
    },
  };
}

const wait = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};
const toasts = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(".toast")];
const toast = (): HTMLElement => {
  const [only] = toasts();
  if (only === undefined) throw new Error("no toast on screen");
  return only;
};
const status = (): HTMLElement => {
  const region = document.querySelector<HTMLElement>("output.toast-live");
  if (region === null) throw new Error("no status region");
  return region;
};
const alerts = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>("[role=alert]")];
const undoButton = (): HTMLElement => screen.getByRole("button", { name: "Undo" });
const dismissButton = (): HTMLElement => screen.getByRole("button", { name: "Dismiss" });

test("METRO-158 AC1 a toast stays 4 s without Undo and leaves over 180 ms", () => {
  const { api } = mount();
  act(() => api().show({ text: "Saved" }));
  expect(toasts()).toHaveLength(1);
  wait(3999);
  expect(toast().hasAttribute("data-leaving")).toBe(false);
  wait(1);
  expect(toast().hasAttribute("data-leaving")).toBe(true);
  wait(179);
  expect(toasts()).toHaveLength(1);
  wait(1);
  expect(toasts()).toHaveLength(0);
});

test("METRO-158 AC1 a toast with Undo stays 6 s", () => {
  const { api } = mount();
  act(() => api().show({ text: "Origin set to Uttara North", undo: () => {} }));
  wait(5999);
  expect(toast().hasAttribute("data-leaving")).toBe(false);
  wait(1);
  expect(toast().hasAttribute("data-leaving")).toBe(true);
  wait(180);
  expect(toasts()).toHaveLength(0);
});

test("METRO-158 AC1 hover pauses the toast and leaving resumes it with the time that was left", () => {
  const { api } = mount();
  act(() => api().show({ text: "Saved" }));
  wait(3000);
  fireEvent.pointerEnter(toast());
  wait(60_000);
  expect(toast().hasAttribute("data-leaving")).toBe(false);
  fireEvent.pointerLeave(toast());
  wait(999);
  expect(toast().hasAttribute("data-leaving")).toBe(false);
  wait(1);
  expect(toast().hasAttribute("data-leaving")).toBe(true);
});

test("METRO-158 AC1 focus pauses the toast, moving between its buttons does not resume it, leaving does", () => {
  const { api } = mount();
  act(() => api().show({ text: "Saved", undo: () => {} }));
  wait(1000);
  fireEvent.focus(undoButton());
  wait(60_000);
  expect(toast().hasAttribute("data-leaving")).toBe(false);
  // Tab from Undo to Dismiss keeps focus inside the toast.
  fireEvent.blur(undoButton(), { relatedTarget: dismissButton() });
  wait(60_000);
  expect(toast().hasAttribute("data-leaving")).toBe(false);
  // Focus leaves the toast (no related target): the remaining 5 s run.
  fireEvent.blur(dismissButton(), { relatedTarget: null });
  wait(4999);
  expect(toast().hasAttribute("data-leaving")).toBe(false);
  wait(1);
  expect(toast().hasAttribute("data-leaving")).toBe(true);
});

test("METRO-158 AC1 hover and focus together keep it paused until both have ended", () => {
  const { api } = mount();
  act(() => api().show({ text: "Saved" }));
  fireEvent.pointerEnter(toast());
  fireEvent.focus(dismissButton());
  fireEvent.pointerLeave(toast());
  wait(60_000);
  expect(toast().hasAttribute("data-leaving")).toBe(false);
  fireEvent.blur(dismissButton(), { relatedTarget: null });
  wait(4000);
  expect(toast().hasAttribute("data-leaving")).toBe(true);
});

test("METRO-158 AC1 the text is announced once through the polite status region, not the status region", () => {
  const { api } = mount();
  expect(status().textContent).toBe("");
  expect(alerts()).toHaveLength(0);
  act(() => api().show({ text: "Recent searches cleared", undo: () => {} }));
  expect(status().textContent).toBe("Recent searches cleared");
  expect(alerts()).toHaveLength(0);
  // The visible copy is hidden from assistive technology, so it is not read twice.
  const visible = document.querySelector(".toast__text");
  expect(visible?.textContent).toBe("Recent searches cleared");
  expect(visible?.getAttribute("aria-hidden")).toBe("true");
  expect(document.querySelectorAll(".toast-live")).toHaveLength(1);
  // It is cleared when the toast is gone, so the same words can be announced again later.
  wait(6000);
  expect(status().textContent).toBe("");
});

test("METRO-158 AC1 the same words shown again are announced again", () => {
  const { api } = mount();
  act(() => api().show({ text: "Saved" }));
  const first = status().firstElementChild;
  act(() => api().show({ text: "Saved" }));
  const second = status().firstElementChild;
  expect(second).not.toBeNull();
  expect(second).not.toBe(first);
});

test("METRO-158 AC2 a second toast replaces the first, never two at once, and gets its own full time", () => {
  const { api } = mount();
  act(() => api().show({ text: "First" }));
  wait(3000);
  act(() => api().show({ text: "Second", undo: () => {} }));
  expect(toasts()).toHaveLength(1);
  expect(toast().textContent).toContain("Second");
  expect(screen.queryByText("First")).toBeNull();
  expect(status().textContent).toBe("Second");
  // The first one's remaining second does not end the second toast.
  wait(5999);
  expect(toast().hasAttribute("data-leaving")).toBe(false);
  wait(1);
  expect(toast().hasAttribute("data-leaving")).toBe(true);
});

test("METRO-158 AC2 a toast that replaces one that is leaving is not removed by the old one's timer", () => {
  const { api } = mount();
  act(() => api().show({ text: "First" }));
  wait(4000);
  expect(toast().hasAttribute("data-leaving")).toBe(true);
  act(() => api().show({ text: "Second" }));
  wait(179);
  expect(toast().textContent).toContain("Second");
  wait(1);
  expect(toast().textContent).toContain("Second");
  expect(toast().hasAttribute("data-leaving")).toBe(false);
});

test("METRO-158 AC3 Undo runs the callback once and the toast becomes Change undone for 2.5 s", () => {
  const { api } = mount();
  const undo = vi.fn();
  act(() => api().show({ text: "Destination set to Shahbag", undo }));
  const button = undoButton();
  // A double tap before the screen has re-rendered presses the same button twice.
  act(() => {
    fireEvent.click(button);
    fireEvent.click(button);
  });
  expect(undo).toHaveBeenCalledTimes(1);
  expect(toasts()).toHaveLength(1);
  expect(toast().textContent).toContain(shellCopy.undone);
  expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  expect(status().textContent).toBe("Change undone");
  wait(2499);
  expect(toast().hasAttribute("data-leaving")).toBe(false);
  wait(1);
  expect(toast().hasAttribute("data-leaving")).toBe(true);
  wait(180);
  expect(toasts()).toHaveLength(0);
  expect(undo).toHaveBeenCalledTimes(1);
});

test("METRO-158 AC3 a later toast with the same Undo callback gets its own single use", () => {
  const { api } = mount();
  const undo = vi.fn();
  act(() => api().show({ text: "One", undo }));
  fireEvent.click(undoButton());
  act(() => api().show({ text: "Two", undo }));
  fireEvent.click(undoButton());
  expect(undo).toHaveBeenCalledTimes(2);
});

test("METRO-158 AC3 Undo hands focus to the panel when it was on the toast, and leaves it alone otherwise", () => {
  const { api } = mount();
  act(() => api().show({ text: "One", undo: () => {} }));
  act(() => undoButton().focus());
  fireEvent.click(undoButton());
  expect(document.activeElement).toBe(document.querySelector(".panel__scroll"));
  wait(2680);
  act(() => api().show({ text: "Two", undo: () => {} }));
  const outside = screen.getByRole("button", { name: "Make panel larger" });
  act(() => outside.focus());
  fireEvent.click(undoButton());
  expect(document.activeElement).toBe(outside);
});

test("METRO-158 the Dismiss button (aria-label Dismiss) removes the toast and hands back focus", () => {
  const { api } = mount();
  act(() => api().show({ text: "Saved" }));
  expect(dismissButton().getAttribute("aria-label")).toBe("Dismiss");
  act(() => dismissButton().focus());
  fireEvent.click(dismissButton());
  expect(toast().hasAttribute("data-leaving")).toBe(true);
  expect(document.activeElement).toBe(document.querySelector(".panel__scroll"));
  wait(180);
  expect(toasts()).toHaveLength(0);
});

test("METRO-158 dismissing without focus on the toast leaves focus where it is", () => {
  const { api } = mount();
  act(() => api().show({ text: "Saved" }));
  const outside = screen.getByRole("button", { name: "Make panel larger" });
  act(() => outside.focus());
  fireEvent.click(dismissButton());
  expect(document.activeElement).toBe(outside);
});

test("METRO-158 dismiss closes the toast the code names, and a call with nothing showing does nothing", () => {
  const { api } = mount();
  act(() => api().dismiss());
  expect(toasts()).toHaveLength(0);
  act(() => api().show({ text: "Saved" }));
  act(() => api().dismiss());
  wait(180);
  expect(toasts()).toHaveLength(0);
});

test("METRO-158 AC4 an error toast is announced through role=alert and not through the status region", () => {
  const { api } = mount();
  act(() => api().show({ text: "Could not save", tone: "error" }));
  expect(alerts().map((alert) => alert.textContent)).toEqual(["Could not save"]);
  expect(alerts()[0]?.closest(".toast")).toBe(toast());
  expect(status().textContent).toBe("");
  expect(toast().getAttribute("data-tone")).toBe("error");
  wait(4000);
  wait(180);
  expect(alerts()).toHaveLength(0);
});

test("METRO-158 AC5 under reduced motion a toast leaves at once, on expiry and on Dismiss", () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)",
  }));
  const { api } = mount();
  act(() => api().show({ text: "Saved" }));
  wait(4000);
  expect(toasts()).toHaveLength(0);
  act(() => api().show({ text: "Again" }));
  fireEvent.click(dismissButton());
  expect(toasts()).toHaveLength(0);
});

test("METRO-158 without reduced motion the leaving state is shown first (the 180 ms fade)", () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query !== "(prefers-reduced-motion: reduce)",
  }));
  const { api } = mount();
  act(() => api().show({ text: "Saved" }));
  fireEvent.click(dismissButton());
  expect(toast().hasAttribute("data-leaving")).toBe(true);
});

test("METRO-158 the toast has no inline style and uses the handoff's class structure", () => {
  const { api, container } = mount();
  act(() => api().show({ text: "Saved", undo: () => {} }));
  expect(container.querySelectorAll("[style]")).toHaveLength(0);
  const names = [...toast().children].map((child) => child.className);
  expect(names).toEqual(["toast__chip", "toast__text", "toast__action", "toast__close"]);
  expect(toast().closest(".toast-region")).not.toBeNull();
});

test("METRO-158 a toast without Undo offers only Dismiss", () => {
  const { api } = mount();
  act(() => api().show({ text: "Saved" }));
  expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  expect(screen.getAllByRole("button", { name: "Dismiss" })).toHaveLength(1);
});

test("METRO-158 the toast region is always present for announcements, and the API is stable across toasts", () => {
  const { api } = mount();
  expect(screen.getByRole("region", { name: "Notifications" })).toBeTruthy();
  const before = api();
  act(() => before.show({ text: "Saved" }));
  expect(api()).toBe(before);
});

test("METRO-158 unmounting the shell with a toast showing leaves no timer behind", () => {
  const { api } = mount();
  act(() => api().show({ text: "Saved" }));
  cleanup();
  expect(vi.getTimerCount()).toBe(0);
});

function Stray(): null {
  useToast();
  return null;
}

test("METRO-158 useToast outside the shell fails visibly", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<Stray />)).toThrow("useToast needs AppShell");
  spy.mockRestore();
});

test("METRO-158 a keyboard Dismiss or Undo at a peeking sheet hands focus to the grip and does not open the sheet", () => {
  const { api, container } = mount("peek");
  const sheet = (): string | null =>
    container.querySelector(".app")?.getAttribute("data-snap") ?? null;
  const grip = container.querySelector<HTMLElement>(".panel__grip");
  act(() => api().show({ text: "One", undo: () => {} }));
  act(() => undoButton().focus());
  fireEvent.click(undoButton());
  expect(document.activeElement).toBe(grip);
  expect(sheet()).toBe("peek");
  wait(2680);
  act(() => api().show({ text: "Two" }));
  act(() => dismissButton().focus());
  fireEvent.click(dismissButton());
  expect(document.activeElement).toBe(grip);
  expect(sheet()).toBe("peek");
});

test("METRO-158 a half or full sheet gets focus on the panel, as before", () => {
  const { api } = mount("full");
  act(() => api().show({ text: "Saved" }));
  act(() => dismissButton().focus());
  fireEvent.click(dismissButton());
  expect(document.activeElement).toBe(document.querySelector(".panel__scroll"));
});

test("METRO-158 an Undo callback that throws leaves a working Undo and the error is not swallowed", () => {
  const { api } = mount();
  const undo = vi
    .fn<() => void>()
    .mockImplementationOnce(() => {
      throw new Error("boom");
    })
    .mockImplementation(() => {});
  const seen: unknown[] = [];
  const onError = (event: ErrorEvent): void => {
    seen.push(event.error);
    event.preventDefault();
  };
  window.addEventListener("error", onError);
  act(() => api().show({ text: "Saved", undo }));
  fireEvent.click(undoButton());
  expect(undo).toHaveBeenCalledTimes(1);
  expect(seen).toHaveLength(1);
  // The toast is still the one with Undo, and pressing again works.
  expect(toast().textContent).toContain("Saved");
  fireEvent.click(undoButton());
  window.removeEventListener("error", onError);
  expect(undo).toHaveBeenCalledTimes(2);
  expect(toast().textContent).toContain(shellCopy.undone);
});

test("METRO-158 a screen that calls useToast is not re-rendered when a toast shows or leaves", () => {
  const rendered = vi.fn();
  let show: ToastApi["show"] | null = null;
  function Consumer(): null {
    const api = useToast();
    rendered();
    useEffect(() => {
      show = api.show;
    });
    return null;
  }
  render(
    <AppShell>
      <Consumer />
    </AppShell>,
  );
  const before = rendered.mock.calls.length;
  act(() => show?.({ text: "Saved", undo: () => {} }));
  expect(toasts()).toHaveLength(1);
  wait(6000);
  wait(180);
  expect(toasts()).toHaveLength(0);
  expect(rendered).toHaveBeenCalledTimes(before);
});

test("METRO-158 the region and the announcer draw nothing outside the provider", () => {
  const { container } = render(
    <>
      <ToastRegion />
      <ToastLive />
    </>,
  );
  expect(container.querySelector(".toast")).toBeNull();
  expect(container.querySelector("output")?.textContent).toBe("");
});

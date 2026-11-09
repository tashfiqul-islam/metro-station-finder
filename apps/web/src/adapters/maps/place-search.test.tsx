import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { MapsContext, PLACE_INPUT_ID, PlacesContext } from "./context";
import type { PlaceSearchProps } from "./context";
import { PLACE_FIELDS, PlaceSearch } from "./place-search";

const library = { ready: false, made: [] as unknown[], load: vi.fn() };

const bias = { center: { lat: 23.8, lng: 90.4 }, radiusMeters: 25_000 };

/** A stand-in for `google.maps.places.PlaceAutocompleteElement`: an element that records its options. */
class FakeAutocomplete extends HTMLElement {
  readonly options: unknown;
  value: string | null = null;
  constructor(options: unknown) {
    super();
    this.options = options;
    this.setAttribute("data-fake-autocomplete", "");
    this.setAttribute("tabindex", "0");
    library.made.push(this);
  }
}
customElements.define("fake-autocomplete", FakeAutocomplete);

const places = { PlaceAutocompleteElement: FakeAutocomplete };

/** Makes the places library available, as the provider does once it has loaded. */
function enable(): void {
  library.ready = true;
}

function Wrapped(props: PlaceSearchProps) {
  return (
    <MapsContext
      value={{ status: library.ready ? "ready" : "idle", routes: null, load: library.load }}
    >
      <PlacesContext value={library.ready ? places : null}>
        <PlaceSearch {...props} />
      </PlacesContext>
    </MapsContext>
  );
}

function selectEvent(chosen: unknown): Event {
  return Object.assign(new Event("gmp-select"), { placePrediction: chosen });
}

/** A prediction whose place fetches with `fetchFields`; `location` is left undefined unless given. */
function makePrediction(fetchFields: () => Promise<void>, location?: unknown) {
  return { toPlace: vi.fn(() => ({ fetchFields, location })) };
}

function made(): HTMLElement {
  const element = library.made[0];
  if (!(element instanceof HTMLElement)) throw new Error("no element was made");
  return element;
}

/** Holds the resolve or reject function of a fetch the test settles later. */
const gate = {
  settle: (_value?: unknown): void => {},
};
function pendingFetch(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    gate.settle = (reason) => (reason === undefined ? resolve() : reject(reason));
  });
}

function mount() {
  const onPlace = vi.fn();
  const onFailure = vi.fn();
  const view = render(
    <Wrapped
      labelId="label"
      hintId="hint"
      description="a hint"
      bias={bias}
      onPlace={onPlace}
      onFailure={onFailure}
    />,
  );
  return { onPlace, onFailure, view };
}

const settleAll = () =>
  act(async () => {
    await Promise.resolve();
  });

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  library.ready = false;
  library.made.length = 0;
  library.load.mockReset();
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-88 only the Essentials location field is requested", () => {
  expect(PLACE_FIELDS).toEqual(["location"]);
});

test("METRO-114 starts as a plain input described by the hint, with no group and no widget", () => {
  const { view } = mount();
  const input = view.container.querySelector("input");
  expect(input?.id).toBe(PLACE_INPUT_ID);
  expect(input?.getAttribute("aria-describedby")).toBe("hint");
  expect(input?.hidden).toBe(false);
  expect(view.container.querySelector("fieldset")).toBeNull();
  expect(library.made).toHaveLength(0);
  expect(library.load).not.toHaveBeenCalled();
});

test("METRO-114 only the first focus asks for the libraries; rendering and typing do not", () => {
  const { view } = mount();
  const input = view.container.querySelector("input");
  if (input === null) throw new Error("no input");
  fireEvent.change(input, { target: { value: "mot" } });
  expect(library.load).not.toHaveBeenCalled();
  act(() => input.focus());
  expect(library.load).toHaveBeenCalledTimes(1);
});

function rerenderReady(view: ReturnType<typeof mount>["view"]): void {
  enable();
  view.rerender(
    <Wrapped
      labelId="label"
      hintId="hint"
      description="a hint"
      bias={bias}
      onPlace={vi.fn()}
      onFailure={vi.fn()}
    />,
  );
}

test("METRO-114 when the library arrives the widget takes the typed text, focus and a caret at the end", () => {
  const { view } = mount();
  const input = view.container.querySelector("input");
  if (input === null) throw new Error("no input");
  act(() => input.focus());
  // Typed before the load completed: the plain input kept accepting text.
  fireEvent.change(input, { target: { value: "Motijheel" } });
  rerenderReady(view);
  const element = made();
  expect(element.isConnected).toBe(true);
  expect(Reflect.get(element, "value")).toBe("Motijheel");
  expect(input.hidden).toBe(true);
  expect(view.container.querySelector("fieldset")?.getAttribute("aria-labelledby")).toBe("label");
  // Focus follows the swap: the plain input had it.
  expect(document.activeElement).toBe(element);
});

test("METRO-114 the swap does not steal focus from a user who moved on, and sets no value when nothing was typed", () => {
  const { view } = mount();
  const input = view.container.querySelector("input");
  if (input === null) throw new Error("no input");
  const elsewhere = document.createElement("button");
  document.body.append(elsewhere);
  act(() => input.focus());
  act(() => elsewhere.focus());
  rerenderReady(view);
  expect(document.activeElement).toBe(elsewhere);
  expect(Reflect.get(made(), "value")).toBeNull();
  elsewhere.remove();
});

test("METRO-114 unmounting the widget restores the plain input", () => {
  const { view } = mount();
  rerenderReady(view);
  const input = view.container.querySelector("input");
  expect(input?.hidden).toBe(true);
  view.unmount();
  expect(input?.hidden).toBe(false);
});

test("METRO-88 creates one Dhaka-biased element restricted to Bangladesh", () => {
  enable();
  const { view } = mount();
  expect(library.made).toHaveLength(1);
  expect(Reflect.get(made(), "options")).toEqual({
    description: "a hint",
    includedRegionCodes: ["bd"],
    locationBias: { center: { lat: 23.8, lng: 90.4 }, radius: 25_000 },
  });
  expect(view.container.querySelector("[data-fake-autocomplete]")).not.toBeNull();
});

test("METRO-88 a selection calls fetchFields once with location only and reports a plain coordinate", async () => {
  enable();
  const { onPlace, onFailure } = mount();
  const fetchFields = vi.fn(() => Promise.resolve());
  const chosen = makePrediction(fetchFields, { lat: () => 23.75, lng: () => 90.39 });
  made().dispatchEvent(selectEvent(chosen));
  await settleAll();
  expect(fetchFields).toHaveBeenCalledTimes(1);
  expect(fetchFields).toHaveBeenCalledWith({ fields: ["location"] });
  expect(onPlace).toHaveBeenCalledExactlyOnceWith({ lat: 23.75, lng: 90.39 });
  expect(onFailure).not.toHaveBeenCalled();
});

function noop(): void {}

function deferred() {
  const handle: { resolve: () => void; reject: (reason: unknown) => void } = {
    resolve: noop,
    reject: noop,
  };
  const promise = new Promise<void>((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return { promise, ...handle };
}

test("METRO-88 the latest selection wins, whichever fetch finishes first", async () => {
  enable();
  const { onPlace, onFailure } = mount();
  const first = deferred();
  const second = deferred();
  const fetchA = vi.fn(() => first.promise);
  const fetchB = vi.fn(() => second.promise);
  made().dispatchEvent(selectEvent(makePrediction(fetchA, { lat: () => 1, lng: () => 1 })));
  made().dispatchEvent(selectEvent(makePrediction(fetchB, { lat: () => 2, lng: () => 2 })));
  await settleAll();
  // Both fetches run (one extra Place Details call in this rare case); A finishing first is ignored.
  expect(fetchA).toHaveBeenCalledTimes(1);
  expect(fetchB).toHaveBeenCalledTimes(1);
  first.resolve();
  await settleAll();
  expect(onPlace).not.toHaveBeenCalled();
  second.resolve();
  await settleAll();
  expect(onPlace).toHaveBeenCalledExactlyOnceWith({ lat: 2, lng: 2 });
  expect(onFailure).not.toHaveBeenCalled();
});

test("METRO-88 an earlier selection that finishes late or fails late changes nothing", async () => {
  enable();
  const { onPlace, onFailure } = mount();
  const first = deferred();
  const second = deferred();
  made().dispatchEvent(
    selectEvent(makePrediction(() => first.promise, { lat: () => 1, lng: () => 1 })),
  );
  made().dispatchEvent(
    selectEvent(makePrediction(() => second.promise, { lat: () => 2, lng: () => 2 })),
  );
  await settleAll();
  second.resolve();
  await settleAll();
  first.reject(new Error("late"));
  await settleAll();
  expect(onPlace).toHaveBeenCalledExactlyOnceWith({ lat: 2, lng: 2 });
  expect(onFailure).not.toHaveBeenCalled();
});
test("METRO-88 a rejected fetch, a missing location and gmp-error all report a failure without a cause", async () => {
  enable();
  const { onPlace, onFailure } = mount();
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  made().dispatchEvent(
    selectEvent(makePrediction(() => Promise.reject(new Error("secret text")), null)),
  );
  await settleAll();
  made().dispatchEvent(selectEvent(makePrediction(() => Promise.resolve())));
  await settleAll();
  made().dispatchEvent(new Event("gmp-error"));
  await settleAll();
  expect(onFailure).toHaveBeenCalledTimes(3);
  expect(onFailure).toHaveBeenCalledWith();
  expect(onPlace).not.toHaveBeenCalled();
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

test("METRO-88 an event without a prediction is ignored", async () => {
  enable();
  const { onPlace, onFailure } = mount();
  made().dispatchEvent(new Event("gmp-select"));
  await settleAll();
  expect(onPlace).not.toHaveBeenCalled();
  expect(onFailure).not.toHaveBeenCalled();
});

test("METRO-88 after unmount the element is removed and a late result reports nothing", async () => {
  enable();
  const { onPlace, onFailure, view } = mount();
  const slow = makePrediction(pendingFetch, { lat: () => 1, lng: () => 2 });
  const element = made();
  element.dispatchEvent(selectEvent(slow));
  await settleAll();
  view.unmount();
  expect(element.isConnected).toBe(false);
  gate.settle();
  await settleAll();
  element.dispatchEvent(selectEvent(makePrediction(() => Promise.reject(new Error("late")), null)));
  element.dispatchEvent(new Event("gmp-error"));
  await settleAll();
  expect(onPlace).not.toHaveBeenCalled();
  expect(onFailure).not.toHaveBeenCalled();
});

test("METRO-88 a late failure after unmount reports nothing", async () => {
  enable();
  const { onFailure, view } = mount();
  made().dispatchEvent(selectEvent(makePrediction(pendingFetch, null)));
  await settleAll();
  view.unmount();
  gate.settle(new Error("late"));
  await settleAll();
  expect(onFailure).not.toHaveBeenCalled();
});

test("METRO-88 StrictMode leaves exactly one element in the DOM", () => {
  enable();
  const view = render(
    <StrictMode>
      <Wrapped
        labelId="label"
        hintId="hint"
        description="a hint"
        bias={bias}
        onPlace={vi.fn()}
        onFailure={vi.fn()}
      />
    </StrictMode>,
  );
  expect(view.container.querySelectorAll("[data-fake-autocomplete]")).toHaveLength(1);
});

import { act, cleanup, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { PlacesContext } from "./context";
import { PLACE_FIELDS, PlaceSearch } from "./place-search";
import type { PlaceSearchProps } from "./port";

const library = { ready: false, made: [] as unknown[] };

const bias = { center: { lat: 23.8, lng: 90.4 }, radiusMeters: 25_000 };

/** A stand-in for `google.maps.places.PlaceAutocompleteElement`: an element that records its options. */
class FakeAutocomplete extends HTMLElement {
  readonly options: unknown;
  constructor(options: unknown) {
    super();
    this.options = options;
    this.setAttribute("data-fake-autocomplete", "");
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
    <PlacesContext value={library.ready ? places : null}>
      <PlaceSearch {...props} />
    </PlacesContext>
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
    <Wrapped labelId="label" bias={bias} onPlace={onPlace} onFailure={onFailure} />,
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
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-88 only the Essentials location field is requested", () => {
  expect(PLACE_FIELDS).toEqual(["location"]);
});

test("METRO-88 renders a group named by the label and no element until the places library is ready", () => {
  const { view } = mount();
  expect(view.container.querySelector("fieldset")?.getAttribute("aria-labelledby")).toBe("label");
  expect(library.made).toHaveLength(0);
});

test("METRO-88 creates one Dhaka-biased element restricted to Bangladesh", () => {
  enable();
  const { view } = mount();
  expect(library.made).toHaveLength(1);
  expect(Reflect.get(made(), "options")).toEqual({
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

test("METRO-88 a second selection while one is in flight is ignored", async () => {
  enable();
  const { onPlace } = mount();
  const fetchFields = vi.fn(pendingFetch);
  const chosen = makePrediction(fetchFields, { lat: () => 1, lng: () => 2 });
  made().dispatchEvent(selectEvent(chosen));
  made().dispatchEvent(selectEvent(chosen));
  await settleAll();
  gate.settle();
  await settleAll();
  expect(fetchFields).toHaveBeenCalledTimes(1);
  expect(onPlace).toHaveBeenCalledTimes(1);
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
      <Wrapped labelId="label" bias={bias} onPlace={vi.fn()} onFailure={vi.fn()} />
    </StrictMode>,
  );
  expect(view.container.querySelectorAll("[data-fake-autocomplete]")).toHaveLength(1);
});

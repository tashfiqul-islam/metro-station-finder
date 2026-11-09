import { useEffect, useEffectEvent, useRef } from "react";

import { PLACE_INPUT_ID, useMaps, usePlaces } from "./context";
import type { PlaceSearchProps } from "./context";
import { focusElement } from "./focus";

/** The only field requested for a selected place: Essentials tier, no displayName, no address. */
export const PLACE_FIELDS = ["location"];

/** Dhaka, Bangladesh: suggestions are limited to this region (CLDR code, lower case in the docs). */
const REGION_CODES = ["bd"];

function noop(): void {}

/** The `gmp-select` event as we use it: a prediction that becomes a place whose fields we fetch. */
interface SelectEvent extends Event {
  readonly placePrediction: {
    toPlace(): {
      fetchFields(request: { fields: string[] }): Promise<unknown>;
      readonly location?: { lat(): number; lng(): number } | null | undefined;
    };
  };
}

function isSelection(event: Event): event is SelectEvent {
  return "placePrediction" in event;
}

/**
 * The place search (METRO-114). It starts as a plain text input: no Google script and no Places request exist
 * before the user first focuses it. The first focus asks the provider to load the Maps libraries
 * (`useMaps().load`); when the Places library arrives, `PlaceAutocompleteElement` is created and takes the
 * input's place. The typed text is carried over (`value`), focus follows when the input still had it, and the
 * caret goes to the end. The plain input stays in the DOM (hidden) until then, so typing during the load is
 * never lost.
 *
 * Billing: the element keeps the autocomplete session itself. Google's reference says that with
 * `PlaceAutocompleteElement` the first `fetchFields` on the `Place` from `toPlace()` includes the session token
 * automatically, and `fetchFields` ends the session (Context7-verified, 2026-11-09). We never create or pass a
 * token: there is no documented way to hand one to the element, and one we made would not be the one it used.
 * One selection = one `fetchFields` call here.
 *
 * Latest selection wins: a slower fetch for an earlier choice must not replace a later one. The element lives
 * in a shadow root and has no documented property for its accessible name (METRO-101), so a labelled group
 * wraps it and `description` carries the hint. Nothing from Google leaves this file except a plain coordinate.
 */
export function PlaceSearch({
  labelId,
  hintId,
  description,
  bias,
  onPlace,
  onFailure,
}: PlaceSearchProps) {
  const places = usePlaces();
  const { load } = useMaps();
  const { lat, lng } = bias.center;
  const { radiusMeters } = bias;
  const input = useRef<HTMLInputElement>(null);
  const host = useRef<HTMLFieldSetElement>(null);
  const place = useEffectEvent(onPlace);
  const fail = useEffectEvent(onFailure);

  useEffect(() => {
    const container = host.current;
    const plain = input.current;
    if (places === null || container === null || plain === null) return noop;
    // Read before the swap: the typed text and whether the plain input still has focus.
    const typed = plain.value;
    const hadFocus = document.activeElement === plain;
    const element = new places.PlaceAutocompleteElement({
      description,
      includedRegionCodes: REGION_CODES,
      locationBias: { center: { lat, lng }, radius: radiusMeters },
    });
    let alive = true;
    let sequence = 0;
    const select = async (event: SelectEvent): Promise<void> => {
      sequence += 1;
      const mine = sequence;
      try {
        const selected = event.placePrediction.toPlace();
        await selected.fetchFields({ fields: PLACE_FIELDS });
        const location = selected.location;
        if (!alive || mine !== sequence) return;
        if (location === null || location === undefined) fail();
        else place({ lat: location.lat(), lng: location.lng() });
      } catch {
        // The cause is dropped on purpose: its message can carry the typed text or a URL.
        if (alive && mine === sequence) fail();
      }
    };
    const onSelect = (event: Event): void => {
      if (isSelection(event)) void select(event);
    };
    // Removed in the cleanup below, so it cannot run after unmount.
    const onError = (): void => {
      fail();
    };
    element.addEventListener("gmp-select", onSelect);
    element.addEventListener("gmp-error", onError);
    container.append(element);
    if (typed !== "") element.value = typed;
    plain.hidden = true;
    if (hadFocus) focusElement(element);
    return () => {
      alive = false;
      element.removeEventListener("gmp-select", onSelect);
      element.removeEventListener("gmp-error", onError);
      element.remove();
      plain.hidden = false;
    };
  }, [places, description, lat, lng, radiusMeters]);

  return (
    <div className="place-slot">
      <input
        ref={input}
        id={PLACE_INPUT_ID}
        className="place-slot__input"
        type="text"
        autoComplete="off"
        spellCheck={false}
        aria-describedby={hintId}
        onFocus={load}
      />
      {places !== null && (
        <fieldset ref={host} className="place-slot__widget" aria-labelledby={labelId} />
      )}
    </div>
  );
}

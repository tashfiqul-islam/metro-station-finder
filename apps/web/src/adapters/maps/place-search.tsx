import { useEffect, useEffectEvent, useRef } from "react";

import { usePlaces } from "./context";
import type { PlaceSearchProps } from "./context";

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
 * The Google place search control. `PlaceAutocompleteElement` keeps the autocomplete session itself: one
 * selection ends one session and `fetchFields` carries its token. We call `fetchFields` exactly once per
 * selection and ignore a second selection while one is in flight. The element lives in a shadow root and
 * cannot be labelled from outside, so a labelled group wraps it. Nothing from Google leaves this file
 * except a plain coordinate.
 */
export function PlaceSearch({ labelId, bias, onPlace, onFailure }: PlaceSearchProps) {
  const places = usePlaces();
  const { lat, lng } = bias.center;
  const { radiusMeters } = bias;
  const host = useRef<HTMLFieldSetElement>(null);
  const place = useEffectEvent(onPlace);
  const fail = useEffectEvent(onFailure);

  useEffect(() => {
    const container = host.current;
    if (places === null || container === null) return noop;
    const element = new places.PlaceAutocompleteElement({
      includedRegionCodes: REGION_CODES,
      locationBias: { center: { lat, lng }, radius: radiusMeters },
    });
    let alive = true;
    let busy = false;
    const select = async (event: SelectEvent): Promise<void> => {
      if (busy) return;
      busy = true;
      try {
        const selected = event.placePrediction.toPlace();
        await selected.fetchFields({ fields: PLACE_FIELDS });
        const location = selected.location;
        if (!alive) return;
        if (location === null || location === undefined) fail();
        else place({ lat: location.lat(), lng: location.lng() });
      } catch {
        // The cause is dropped on purpose: its message can carry the typed text or a URL.
        if (alive) fail();
      } finally {
        busy = false;
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
    return () => {
      alive = false;
      element.removeEventListener("gmp-select", onSelect);
      element.removeEventListener("gmp-error", onError);
      element.remove();
    };
  }, [places, lat, lng, radiusMeters]);

  return <fieldset ref={host} aria-labelledby={labelId} />;
}

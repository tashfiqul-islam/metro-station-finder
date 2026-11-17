import type { Station } from "@metro/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import type { MapsAdapter } from "../../adapters/maps/context";
import { useSheet } from "../../shell/AppShell";
import { LineMap } from "../line-map/LineMap";
import { NearestStation } from "../nearest-station/NearestStation";
import type { LocationOutcome } from "../nearest-station/NearestStation";
import { PickedStation } from "../station-picker/PickedStation";
import { MapBoundary } from "./MapBoundary";

import "./nearby-screen.css";

export interface NearbyProps {
  readonly maps: MapsAdapter;
  /** Fills the shell's map slot (the shell is in the entry chunk; the map is not). */
  readonly setMap: (map: ReactNode) => void;
}

/**
 * The one current result of the screen (METRO-113): a station the user picked by name, or the nearest station
 * to a location. A new pick replaces a location result and a new location result replaces a pick; the map
 * highlight, the user pin, focus and the sheet snap all follow this one value.
 */
type Current =
  | { readonly kind: "pick"; readonly station: Station }
  | { readonly kind: "location"; readonly outcome: LocationOutcome };

/** Moves keyboard focus to the map (its one tab stop), where the current station is highlighted. */
function focusMap(): void {
  const map = document.querySelector<SVGElement>(".line-map svg");
  if (typeof map?.focus === "function") map.focus();
}

/**
 * The Nearby screen (METRO-112, METRO-113, METRO-163): one lazy boundary loads the page, the line map and the
 * search field together (ADR-0022), so the entry carries one loader instead of one per part. The map goes to the
 * shell through `setMap`, inside its own error boundary (the shell is outside this tree). Order: the one search
 * field (stations and places), Use my location, then the one current result.
 */
export function Nearby({ maps, setMap }: NearbyProps): ReactElement {
  const { snap, setSnap } = useSheet();
  const [current, setCurrent] = useState<Current | null>(null);
  const [picks, setPicks] = useState(0);
  /** How the last station pick was made: a click on an option keeps the field's ring off the result heading. */
  const [source, setSource] = useState<"keyboard" | "pointer">("keyboard");
  /** "Show on map" presses, and how many of them have moved focus: focus waits for the sheet to leave full. */
  const [shows, setShows] = useState(0);
  const shown = useRef(0);

  // A full sheet hides the map (shell.css), and a hidden element cannot take focus. "Show on map" drops the sheet
  // to peek in the same event, so focus moves once that snap has committed, not in the click handler.
  useEffect(() => {
    if (shows === shown.current || snap === "full") return;
    shown.current = shows;
    focusMap();
  }, [shows, snap]);

  const highlightedId =
    current?.kind === "pick" ? current.station.id : (current?.outcome.stationId ?? null);
  const position = current?.kind === "location" ? current.outcome.position : null;

  useEffect(() => {
    setMap(
      <MapBoundary>
        <LineMap
          highlighted={highlightedId === null ? [] : [highlightedId]}
          {...(position === null ? {} : { position })}
        />
      </MapBoundary>,
    );
  }, [setMap, highlightedId, position]);
  useEffect(() => () => setMap(null), [setMap]);

  const onLocation = useCallback((outcome: LocationOutcome | null): void => {
    // A rough fix clears a location result; it never clears a pick (the user asked for nothing new).
    setCurrent((now) => {
      if (outcome !== null) return { kind: "location", outcome };
      return now?.kind === "location" ? null : now;
    });
  }, []);
  const settle = useCallback((): void => setSnap("half"), [setSnap]);
  const pickStation = useCallback(
    (station: Station, how: "keyboard" | "pointer"): void => {
      setSource(how);
      setPicks((count) => count + 1);
      setCurrent({ kind: "pick", station });
      setSnap("half");
    },
    [setSnap],
  );
  const engageSearch = useCallback((): void => setSnap("full"), [setSnap]);

  return (
    <NearestStation
      maps={maps}
      suppressed={current?.kind === "pick"}
      pickSeq={picks}
      onLocation={onLocation}
      onSettle={settle}
      onSearchEngage={engageSearch}
      onPickStation={pickStation}
      after={
        <PickedStation
          station={current?.kind === "pick" ? current.station : null}
          picks={picks}
          source={source}
          onShowOnMap={() => setShows((count) => count + 1)}
        />
      }
    />
  );
}

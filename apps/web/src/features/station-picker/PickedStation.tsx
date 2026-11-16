import type { Station } from "@metro/core";
import { useEffect, useEffectEvent, useRef } from "react";
import type { ReactElement } from "react";

import { useSheet } from "../../shell/AppShell";
import { StationResult } from "./StationResult";

import "./station-picker.css";

interface PickedStationProps {
  /** The picked station, or null while no station is the screen's current result (METRO-113: there is one). */
  readonly station: Station | null;
  /** Counts picks, so choosing the same station again still moves focus to the heading. */
  readonly picks: number;
  /** How the last pick was made. A click on an option keeps focus in the field (still `:focus-visible`). */
  readonly source: "keyboard" | "pointer";
  /** "Show on map": the screen moves keyboard focus to the map after the sheet drops to peek. */
  readonly onShowOnMap: () => void;
}

/**
 * The result of a station picked in the search field (METRO-112, METRO-163): the station, its fare range and a
 * Directions link, with the heading taking focus on each pick. "Show on map" drops the sheet to peek. The pick
 * itself, and the sheet settling at half, belong to the screen.
 */
export function PickedStation({
  station,
  picks,
  source,
  onShowOnMap,
}: PickedStationProps): ReactElement | null {
  const { setSnap } = useSheet();
  const heading = useRef<HTMLHeadingElement>(null);
  // After a tap or click the heading must not inherit the field's ring (METRO-118); after Enter it keeps it.
  const focusHeading = useEffectEvent((): void =>
    heading.current?.focus({ focusVisible: source === "keyboard" }),
  );

  useEffect(() => {
    if (picks > 0) focusHeading();
  }, [picks]);

  if (station === null) return null;
  return (
    <div className="pick">
      <StationResult
        station={station}
        headingRef={heading}
        onShowOnMap={() => {
          setSnap("peek");
          onShowOnMap();
        }}
      />
    </div>
  );
}

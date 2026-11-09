import { baselineDataset } from "@metro/core";
import type { Station, StationId } from "@metro/core";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import { useSheet } from "../../shell/AppShell";
import { StationCombobox } from "./StationCombobox";
import { StationResult } from "./StationResult";

import "./station-picker.css";

interface StationPickerProps {
  /** The picked station, for the map highlight. Null never happens after a pick: a pick is replaced, not cleared. */
  readonly onPick: (id: StationId) => void;
  /** "Show on map": the screen moves keyboard focus to the map after the sheet drops to peek. */
  readonly onShowOnMap: () => void;
  /**
   * Whether the picked station is the screen's current result (METRO-113: there is one). False hides the result
   * while a location result is current; a new pick shows it again. Defaults to true.
   */
  readonly current?: boolean;
}

/**
 * "Or pick a station" and its result (METRO-112). Sheet rules for this flow: typing opens the sheet to full (the
 * suggestions need the room), a pick settles it at half, "Show on map" drops it to peek.
 */
export function StationPicker({
  onPick,
  onShowOnMap,
  current = true,
}: StationPickerProps): ReactElement {
  const { setSnap } = useSheet();
  const [picked, setPicked] = useState<Station | null>(null);
  /** Counts picks, so choosing the same station again still moves focus to the heading. */
  const [picks, setPicks] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (picks > 0) heading.current?.focus();
  }, [picks]);

  return (
    <div className="pick">
      <StationCombobox
        stations={baselineDataset.stations}
        onEngage={() => setSnap("full")}
        onSelect={(station) => {
          setPicked(station);
          setPicks((count) => count + 1);
          setSnap("half");
          onPick(station.id);
        }}
      />
      {picked === null || !current ? null : (
        <StationResult
          station={picked}
          headingRef={heading}
          onShowOnMap={() => {
            setSnap("peek");
            onShowOnMap();
          }}
        />
      )}
    </div>
  );
}

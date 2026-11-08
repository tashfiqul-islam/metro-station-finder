import type { StationId } from "@metro/core";
import { useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import type { MapsAdapter } from "../../adapters/maps/context";
import { LineMap } from "../line-map/LineMap";
import { NearestStation } from "../nearest-station/NearestStation";
import { StationPicker } from "../station-picker/StationPicker";

export interface NearbyProps {
  readonly maps: MapsAdapter;
  /** Fills the shell's map slot (the shell is in the entry chunk; the map is not). */
  readonly setMap: (map: ReactNode) => void;
}

/** Moves keyboard focus to the map (its one tab stop), where the picked station is highlighted. */
function focusMap(): void {
  const map = document.querySelector<SVGElement>(".line-map svg");
  if (typeof map?.focus === "function") map.focus();
}

/**
 * The Nearby screen (METRO-112): one lazy boundary loads the page, the line map and the station picker together
 * (ADR-0022), so the entry carries one loader instead of one per part. The map goes to the shell through
 * `setMap`; a picked station is highlighted on it. The picker sits between the location controls and the
 * nearest-station result; reordering to the handoff's layout belongs to the location slice.
 */
export function Nearby({ maps, setMap }: NearbyProps): ReactElement {
  const [picked, setPicked] = useState<StationId | null>(null);

  useEffect(() => {
    setMap(<LineMap highlighted={picked === null ? [] : [picked]} />);
  }, [setMap, picked]);
  useEffect(() => () => setMap(null), [setMap]);

  return (
    <NearestStation
      maps={maps}
      after={<StationPicker onPick={setPicked} onShowOnMap={focusMap} />}
    />
  );
}

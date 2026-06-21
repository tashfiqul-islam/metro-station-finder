import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import mrt6Line from "@/data/mrt6-line";
import { STATIONS } from "@/data/stations";
import { getStationLineAnchorCoords } from "@/features/trip-planner/logic";

const stationDisplayAnchors = getStationLineAnchorCoords(mrt6Line, STATIONS);

const markerOffsetsBySlug: Partial<Record<(typeof STATIONS)[number]["slug"], [number, number]>> = {
  kamalapur: [12, -12],
  motijheel: [-12, 12],
};

export const StationMarkers = (): React.ReactElement => (
  <>
    {STATIONS.map((station, index) => {
      const anchor = stationDisplayAnchors[index];
      const offset = markerOffsetsBySlug[station.slug];

      if (!anchor) {
        throw new RangeError(`Missing line-aligned anchor for station ${station.slug}`);
      }

      return (
        <MapMarker key={station.slug} latitude={anchor[1]} longitude={anchor[0]} offset={offset}>
          <MarkerContent className="flex items-center justify-center">
            <button
              aria-label={station.nameEn}
              className="flex size-7 items-center justify-center rounded-full"
              data-testid={`station-marker-${station.slug}`}
              type="button"
            >
              <span className="size-4 rounded-full border-2 border-white bg-primary shadow-md" />
            </button>
          </MarkerContent>
          <MarkerPopup>
            <div className="flex flex-col gap-1">
              <p className="font-medium text-foreground">{station.nameEn}</p>
              <p className="text-xs text-muted-foreground">{station.slug}</p>
            </div>
          </MarkerPopup>
        </MapMarker>
      );
    })}
  </>
);

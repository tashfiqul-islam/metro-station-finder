import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import mrt6Line from "@/data/mrt6-line";
import { STATIONS } from "@/data/stations";
import { getStationLineDisplayAnchorCoords } from "@/features/trip-planner/logic";

const stationDisplayAnchors = getStationLineDisplayAnchorCoords(mrt6Line, STATIONS);

export const StationMarkers = (): React.ReactElement => (
  <>
    {STATIONS.map((station, index) => {
      const anchor = stationDisplayAnchors[index];

      if (!anchor) {
        throw new RangeError(`Missing line-aligned anchor for station ${station.slug}`);
      }

      return (
        <MapMarker
          key={station.slug}
          latitude={anchor[1]}
          longitude={anchor[0]}
          zIndex={STATIONS.length - index}
        >
          <MarkerContent className="flex items-center justify-center">
            <button
              aria-label={station.nameEn}
              className="flex size-5 items-center justify-center rounded-full"
              data-testid={`station-marker-${station.slug}`}
              type="button"
            >
              <span className="size-3.5 rounded-full border-2 border-white bg-primary shadow-md" />
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

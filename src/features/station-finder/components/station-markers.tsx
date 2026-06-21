import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { STATIONS } from "@/data/stations";

export const StationMarkers = (): React.ReactElement => (
  <>
    {STATIONS.map((station) => (
      <MapMarker key={station.slug} latitude={station.lat} longitude={station.lng}>
        <MarkerContent>
          <button
            aria-label={station.nameEn}
            className="size-4 rounded-full border-2 border-white bg-primary shadow-md"
            data-testid={`station-marker-${station.slug}`}
            type="button"
          />
        </MarkerContent>
        <MarkerPopup>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">{station.nameEn}</p>
            <p className="text-xs text-muted-foreground">{station.slug}</p>
          </div>
        </MarkerPopup>
      </MapMarker>
    ))}
  </>
);

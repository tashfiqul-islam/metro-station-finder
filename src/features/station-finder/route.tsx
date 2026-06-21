import { MapCanvas } from "@/components/common/map-canvas";
import { STATIONS } from "@/data/stations";

import { MetroLineLayer } from "./components/metro-line-layer";
import { StationMarkers } from "./components/station-markers";

export const StationFinderRoute = (): React.ReactElement => {
  const stationCount = STATIONS.length;

  return (
    <section className="container mx-auto px-4 py-12 lg:py-16">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <p className="section-kicker">MRT-6 map preview</p>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
            Station Finder
          </h1>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
            Preview the full Dhaka metro corridor and all current MRT-6 stations before search,
            routing, and geolocation tools land in the next sprint.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="section-card px-4 py-2">{stationCount} stations</div>
          <div className="section-card px-4 py-2">Uttara North to Kamalapur</div>
          <div className="section-card px-4 py-2">Static MRT-6 corridor preview</div>
        </div>

        <MapCanvas className="h-104 md:h-136">
          <MetroLineLayer />
          <StationMarkers />
        </MapCanvas>
      </div>
    </section>
  );
};

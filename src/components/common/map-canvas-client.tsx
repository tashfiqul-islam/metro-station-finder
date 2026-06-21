import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

import MRT6_LINE from "@/data/mrt6-line";
import { Map as MapComponent, MapControls } from "@/components/ui/map";
import type { MapRef } from "@/components/ui/map";
import { cn } from "@/lib/utils";

interface MapCanvasClientProps {
  children?: ReactNode;
  className?: string;
}

const FIT_PADDING = {
  bottom: 40,
  left: 40,
  right: 40,
  top: 40,
} as const;

const INITIAL_VIEWPORT = {
  bearing: 0,
  center: [90.4125, 23.8103] as [number, number],
  pitch: 0,
  zoom: 10,
};

export const MapCanvasClient = ({
  children,
  className,
}: MapCanvasClientProps): React.ReactElement => {
  const mapRef = useRef<MapRef>(null);
  const hasFittedRef = useRef(false);

  const bounds = useMemo(() => {
    const [firstCoordinate, ...restCoordinates] = MRT6_LINE.geometry.coordinates;

    if (!firstCoordinate) {
      throw new Error("MRT6 line has no coordinates");
    }

    let [minLng, minLat] = firstCoordinate;
    let [maxLng, maxLat] = firstCoordinate;

    for (const [lng, lat] of restCoordinates) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ] as [[number, number], [number, number]];
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || hasFittedRef.current) {
      return;
    }

    const fitBoundsToLine = () => {
      if (hasFittedRef.current) {
        return;
      }

      map.fitBounds(bounds, {
        duration: 0,
        padding: FIT_PADDING,
      });
      hasFittedRef.current = true;
    };

    if (map.loaded()) {
      fitBoundsToLine();
      return;
    }

    map.once("load", fitBoundsToLine);

    return () => {
      map.off("load", fitBoundsToLine);
    };
  }, [bounds]);

  return (
    <div className={cn("relative min-h-88 w-full overflow-hidden rounded-2xl", className)}>
      <MapComponent ref={mapRef} className="h-full min-h-88 w-full" viewport={INITIAL_VIEWPORT}>
        <MapControls position="top-right" showCompass showZoom />
        {children}
      </MapComponent>
    </div>
  );
};

import { useEffect, useId } from "react";

import MRT6_LINE from "@/data/mrt6-line";
import { useMap } from "@/components/ui/map";

export const MetroLineLayer = (): null => {
  const { isLoaded, map } = useMap();
  const id = useId().replaceAll(/:/gu, "-");
  const sourceId = `mrt6-source-${id}`;
  const layerId = `mrt6-line-${id}`;

  useEffect(() => {
    if (!map || !isLoaded) {
      return;
    }

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        data: MRT6_LINE,
        type: "geojson",
      });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#00a96e",
          "line-opacity": 0.9,
          "line-width": 5,
        },
        source: sourceId,
        type: "line",
      });
    }

    return () => {
      try {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }

        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch {
        // Ignore teardown races during style swaps/unmounts.
      }
    };
  }, [isLoaded, layerId, map, sourceId]);

  return null;
};

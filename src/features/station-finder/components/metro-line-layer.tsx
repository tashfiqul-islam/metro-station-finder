import { useEffect } from "react";

import MRT6_LINE from "@/data/mrt6-line";
import { useMap } from "@/components/ui/map";

const MRT6_SOURCE_ID = "mrt6-source";
const MRT6_LAYER_ID = "mrt6-line";

export const MetroLineLayer = (): null => {
  const { isLoaded, map } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) {
      return;
    }

    if (!map.getSource(MRT6_SOURCE_ID)) {
      map.addSource(MRT6_SOURCE_ID, {
        data: MRT6_LINE,
        type: "geojson",
      });
    }

    if (!map.getLayer(MRT6_LAYER_ID)) {
      map.addLayer({
        id: MRT6_LAYER_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#00a96e",
          "line-opacity": 0.9,
          "line-width": 5,
        },
        source: MRT6_SOURCE_ID,
        type: "line",
      });
    }

    return () => {
      try {
        if (map.getLayer(MRT6_LAYER_ID)) {
          map.removeLayer(MRT6_LAYER_ID);
        }

        if (map.getSource(MRT6_SOURCE_ID)) {
          map.removeSource(MRT6_SOURCE_ID);
        }
      } catch {
        // Ignore teardown races during style swaps/unmounts.
      }
    };
  }, [isLoaded, map]);

  return null;
};

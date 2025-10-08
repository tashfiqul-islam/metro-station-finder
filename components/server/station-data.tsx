import { use } from "react";
import { MRT6_STATIONS } from "@/lib/data/stations";
import type { Station } from "@/lib/types/station";

const DISPLAY_STATION_COUNT = 5;

/**
 * Server Component that fetches station data using React 19's use() hook
 * This demonstrates the modern React 19 pattern for server-side data fetching
 */
export function StationDataServer() {
  // React 19 use() hook for declarative data fetching in Server Components
  const stations = use(Promise.resolve(MRT6_STATIONS));

  return (
    <div className="station-data-server">
      <h2>Station Data (Server Component)</h2>
      <p>Total stations: {stations.length}</p>
      <ul>
        {stations.slice(0, DISPLAY_STATION_COUNT).map((station: Station) => (
          <li key={station.id}>
            {station.name} - {station.line}
          </li>
        ))}
      </ul>
    </div>
  );
}

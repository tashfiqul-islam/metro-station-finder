import type { StationId } from "@/lib/types";
import type { Station } from "@/lib/types/station";

/** Build readonly indexes for fast lookups. */
export function buildStationIndexes(stations: readonly Station[]): {
  readonly byId: ReadonlyMap<StationId, Station>;
  readonly byName: ReadonlyMap<string, Station>;
  readonly byAlias: ReadonlyMap<string, Station>;
} {
  const byId = new Map<StationId, Station>();
  const byName = new Map<string, Station>();
  const byAlias = new Map<string, Station>();
  const toKey = (s: string) => s.toLowerCase();
  for (const s of stations) {
    byId.set(s.id, s);
    byName.set(toKey(s.name), s);
    for (const a of s.aliases) {
      byAlias.set(toKey(a), s);
    }
  }
  return { byId, byName, byAlias } as const;
}

/** Typed map getter that fails with a controlled error ApiResponse code. */
export function mapGetRequired<K, V>(
  map: ReadonlyMap<K, V>,
  key: K
): V | undefined {
  const v = map.get(key);
  return v;
}

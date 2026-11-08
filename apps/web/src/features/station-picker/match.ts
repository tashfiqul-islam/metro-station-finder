import type { Station } from "@metro/core";

/** A station that matches the typed text. `range` is the matched part of the name (start, end), or null when only an alias or nothing in particular matched. */
export interface StationMatch {
  readonly station: Station;
  readonly range: readonly [number, number] | null;
}

const IGNORED = /[\s-]/u;

/** Lower case, spaces and hyphens removed: "Mirpur - 11" and "mirpur11" compare equal. */
export function normalizeName(text: string): string {
  return text.toLowerCase().replaceAll(/[\s-]/gu, "");
}

/** The matched part of `name` for a normalized `needle`: indexes into the original text, so the match can be wrapped. */
function nameRange(name: string, needle: string): readonly [number, number] | null {
  const kept: number[] = [];
  let flat = "";
  for (let index = 0; index < name.length; index += 1) {
    const char = name.charAt(index);
    if (!IGNORED.test(char)) {
      flat += char.toLowerCase();
      kept.push(index);
    }
  }
  const at = flat.indexOf(needle);
  const first = kept[at];
  const last = kept[at + needle.length - 1];
  if (at < 0 || first === undefined || last === undefined) return null;
  return [first, last + 1];
}

/**
 * Case-insensitive substring match over names and aliases, ignoring spaces and hyphens (handoff
 * `interactions.md`). Dataset order is kept. Empty text matches every station.
 */
export function matchStations(
  stations: readonly Station[],
  query: string,
): readonly StationMatch[] {
  const needle = normalizeName(query);
  if (needle === "") return stations.map((station) => ({ station, range: null }));
  const found: StationMatch[] = [];
  for (const station of stations) {
    const range = nameRange(station.name, needle);
    if (range !== null) found.push({ station, range });
    else if (station.aliases.some((alias) => normalizeName(alias).includes(needle))) {
      found.push({ station, range: null });
    }
  }
  return found;
}

/** The name in three parts around the match, for wrapping the middle one. */
export function splitName(
  name: string,
  range: StationMatch["range"],
): readonly [string, string, string] {
  if (range === null) return [name, "", ""];
  return [name.slice(0, range[0]), name.slice(range[0], range[1]), name.slice(range[1])];
}

import type { Coordinate } from "../geo/coordinate.ts";

declare const stationIdBrand: unique symbol;

/** Stable station identity: a lowercase ASCII kebab-case slug. Never derived from array position. */
export type StationId = string & { readonly [stationIdBrand]: true };

export interface Station {
  readonly id: StationId;
  /** Proposed canonical display name. */
  readonly name: string;
  readonly coordinate: Coordinate;
  /** Other exact, case-sensitive labels (legacy spellings) that resolve to this station. */
  readonly aliases: readonly string[];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function isStationId(value: unknown): value is StationId {
  return typeof value === "string" && SLUG.test(value);
}

export function stationId(value: string): StationId {
  if (!isStationId(value)) throw new RangeError(`Invalid station id: ${JSON.stringify(value)}`);
  return value;
}

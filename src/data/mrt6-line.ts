// Typed export of the MRT-6 line geometry.
// Source file: src/data/mrt6-line.geojson (committed for tooling/GIS compatibility).
// Coordinates are in [longitude, latitude] order (GeoJSON / MapLibre convention).
// Hand-traced from station coordinates. Replace with OSM Overpass data when available.
// Coordinate order matches station orderIndex (Uttara North = index 0, Kamalapur = index 16).

/** GeoJSON coordinate pair: [longitude, latitude] */
export type LngLat = [number, number];

export interface Mrt6LineFeature {
  type: "Feature";
  properties: {
    name: string;
    operator: string;
    ref: string;
    route: string;
  };
  geometry: {
    type: "LineString";
    coordinates: LngLat[];
  };
}

const MRT6_LINE: Mrt6LineFeature = {
  geometry: {
    coordinates: [
      [90.3695, 23.8734],
      [90.3795, 23.8671],
      [90.3874, 23.8588],
      [90.3649, 23.8264],
      [90.3682, 23.8166],
      [90.3684, 23.8069],
      [90.3667, 23.8004],
      [90.3638, 23.7937],
      [90.3811, 23.7773],
      [90.3908, 23.7551],
      [90.3936, 23.7502],
      [90.3938, 23.749],
      [90.3955, 23.7389],
      [90.3966, 23.7268],
      [90.4076, 23.7228],
      [90.4225, 23.7281],
      [90.4287, 23.732],
    ],
    type: "LineString",
  },
  properties: {
    name: "MRT-6 (Dhaka Metro Rail Line 6)",
    operator: "DMTCL",
    ref: "6",
    route: "subway",
  },
  type: "Feature",
};

export default MRT6_LINE;

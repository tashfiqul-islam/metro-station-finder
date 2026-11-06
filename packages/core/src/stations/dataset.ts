import { stationId } from "./station.ts";
import type { Station } from "./station.ts";
import type { StationDataset } from "./validate-dataset.ts";

function station(
  id: string,
  name: string,
  lat: number,
  lng: number,
  aliases: readonly string[] = [],
): Station {
  return { id: stationId(id), name, coordinate: { lat, lng }, aliases };
}

/**
 * Baseline dataset v2: the 16 stations and 16x16 fare matrix of legacy commit
 * af903d7a2c1bf08165cfcf4a00ca0c0d73eedead (src/utils/constants.ts, src/services/fareCalculation.ts),
 * copied without change except for stable ids, reviewed aliases and three METRO-67 corrections
 * (docs/evidence/dhaka-mrt-line-6.md): display names "Shahbag" and "Bijoy Sarani" (the legacy
 * spellings stay as aliases, with DMTCL's "Bijoy Sarawni"), and the Bijoy Sarani coordinate, taken
 * from OpenStreetMap node 10294553601 (retrieved 2026-11-05). Array order is the legacy order and
 * is the tie-break order. v1 was the uncorrected copy. Publisher and notice date are recorded in `datasetProvenance`.
 */
const stations: readonly Station[] = [
  station("uttara-north", "Uttara North", 23.869076247909604, 90.36749888965423),
  station("uttara-center", "Uttara Center", 23.859883689540986, 90.36556301505676),
  station("uttara-south", "Uttara South", 23.846047963992312, 90.36348791360157),
  station("pallabi", "Pallabi", 23.826621696895067, 90.36462316050813),
  station("mirpur-11", "Mirpur 11", 23.81948730985004, 90.36569306050733, ["Mirpur - 11"]),
  station("mirpur-10", "Mirpur 10", 23.808676721197994, 90.36828918315457, ["Mirpur - 10"]),
  station("kazipara", "Kazipara", 23.79997213706531, 90.37178936075442),
  station("shewrapara", "Shewrapara", 23.79073133067589, 90.37573063390592),
  station("agargaon", "Agargaon", 23.778528454849155, 90.38010541953432, ["Agaragaon"]),
  station("bijoy-sharani", "Bijoy Sarani", 23.7663936, 90.3830971, [
    "Bijoy Sharani",
    "Bijoy Sarawni",
  ]),
  station("farmgate", "Farmgate", 23.75934419275316, 90.38721707002716, ["Farmagate"]),
  station("karwan-bazar", "Karwan Bazar", 23.751352896226248, 90.39297658085276, ["Kawran Bazar"]),
  station("shahbagh", "Shahbag", 23.739700935527747, 90.39608626094417, ["Shahbagh"]),
  station("dhaka-university", "Dhaka University", 23.73202420199298, 90.39661487611298),
  station(
    "bangladesh-secretariat",
    "Bangladesh Secretariat",
    23.730111326763332,
    90.40669330669668,
  ),
  station("motijheel", "Motijheel", 23.728141228055236, 90.41934126299398),
];

const amounts: readonly (readonly number[])[] = [
  [0, 20, 20, 30, 30, 40, 40, 50, 60, 60, 70, 80, 80, 90, 90, 100],
  [20, 0, 20, 20, 30, 30, 40, 40, 50, 60, 60, 70, 80, 80, 90, 90],
  [20, 20, 0, 20, 20, 30, 30, 40, 40, 50, 60, 60, 70, 70, 80, 90],
  [30, 20, 20, 0, 20, 20, 20, 30, 30, 40, 50, 50, 60, 60, 70, 80],
  [30, 30, 20, 20, 0, 20, 20, 20, 30, 40, 40, 50, 50, 60, 70, 70],
  [40, 30, 30, 20, 20, 0, 20, 20, 20, 30, 30, 40, 50, 50, 60, 60],
  [40, 40, 30, 20, 20, 20, 0, 20, 20, 20, 30, 40, 40, 50, 50, 60],
  [50, 40, 40, 30, 20, 20, 20, 0, 20, 20, 20, 30, 40, 40, 50, 50],
  [60, 50, 40, 30, 30, 20, 20, 20, 0, 20, 20, 20, 30, 30, 40, 50],
  [60, 60, 50, 40, 40, 30, 20, 20, 20, 0, 20, 20, 20, 30, 40, 40],
  [70, 60, 60, 50, 40, 30, 30, 20, 20, 20, 0, 20, 20, 20, 30, 30],
  [80, 70, 60, 50, 50, 40, 40, 30, 20, 20, 20, 0, 20, 20, 20, 30],
  [80, 80, 70, 60, 50, 50, 40, 40, 30, 20, 20, 20, 0, 20, 20, 20],
  [90, 80, 70, 60, 60, 50, 50, 40, 30, 30, 20, 20, 20, 0, 20, 20],
  [90, 90, 80, 70, 70, 60, 50, 50, 40, 40, 30, 20, 20, 20, 0, 20],
  [100, 90, 90, 80, 70, 60, 60, 50, 50, 40, 30, 30, 20, 20, 20, 0],
];

export const baselineDataset: StationDataset = {
  version: "baseline-v2",
  source: "legacy commit af903d7a2c1bf08165cfcf4a00ca0c0d73eedead",
  stations,
  fares: { order: stations.map((s) => s.id), amounts },
};

/**
 * Where the dataset values come from. Filled in only from docs/evidence/dhaka-mrt-line-6.md (METRO-65,
 * retrieved 2026-11-05). A value the evidence does not give is `null`, never a guess.
 */
export interface DatasetProvenance {
  readonly fares: {
    /** Authority that set the fares. */
    readonly setBy: "DTCA";
    /** Date of the DTCA fare notice (ISO 8601). */
    readonly noticeDate: string;
    /** The notice states no separate effective date. */
    readonly effectiveDate: string | null;
    readonly cellsMatchingOfficialTable: number;
    readonly cellsCompared: number;
    /** Date the official table was retrieved for the comparison (ISO 8601). */
    readonly officialTableRetrieved: string;
  };
  readonly operator: {
    readonly name: "DMTCL";
    /** First section opened (DMTCL FAQ), ISO 8601. */
    readonly firstServiceDate: string;
  };
  readonly coordinates: {
    readonly sources: readonly ["OpenStreetMap", "Wikidata"];
    /** Every station coordinate is within this many metres of both sources. */
    readonly maxDistanceMeters: number;
    /** No official coordinate source exists. */
    readonly officialSource: string | null;
  };
}

export const datasetProvenance: DatasetProvenance = {
  fares: {
    // DTCA notice dated 8 September 2022 (evidence S3, Primary); the notice gives no effective date.
    setBy: "DTCA",
    noticeDate: "2022-09-08",
    effectiveDate: null,
    // All 256 cells of the 16 x 16 matrix equal the official table (comparison run 2026-11-05).
    cellsMatchingOfficialTable: 256,
    cellsCompared: 256,
    officialTableRetrieved: "2026-11-05",
  },
  operator: {
    // Dhaka Mass Transit Company Limited; first section (Uttara North to Agargaon) opened 28 December 2022.
    name: "DMTCL",
    firstServiceDate: "2022-12-28",
  },
  coordinates: {
    // OpenStreetMap and Wikidata (Secondary); every station within 150 m of both. No official source.
    sources: ["OpenStreetMap", "Wikidata"],
    maxDistanceMeters: 150,
    officialSource: null,
  },
};

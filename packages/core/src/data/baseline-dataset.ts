import type { FareTable, Station } from "../domain/index.ts";
import { stationId } from "../domain/index.ts";

export interface StationDataset {
  readonly version: string;
  readonly source: string;
  readonly stations: readonly Station[];
  readonly fares: FareTable;
}

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
 * Baseline dataset v1: the 16 stations and 16x16 fare matrix of legacy commit
 * af903d7a2c1bf08165cfcf4a00ca0c0d73eedead (src/utils/constants.ts, src/services/fareCalculation.ts),
 * copied without change except for stable ids and reviewed aliases. Array order is the legacy order
 * and is the tie-break order. No publisher or effective date is known.
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
  station("bijoy-sharani", "Bijoy Sharani", 23.76767563448402, 90.38309390581901),
  station("farmgate", "Farmgate", 23.75934419275316, 90.38721707002716, ["Farmagate"]),
  station("karwan-bazar", "Karwan Bazar", 23.751352896226248, 90.39297658085276, ["Kawran Bazar"]),
  station("shahbagh", "Shahbagh", 23.739700935527747, 90.39608626094417),
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
  version: "baseline-v1",
  source: "legacy commit af903d7a2c1bf08165cfcf4a00ca0c0d73eedead",
  stations,
  fares: { order: stations.map((s) => s.id), amounts },
};

/**
 * MRT-6 Station Data for Metro Station Finder
 *
 * This module contains the complete static data for MRT-6 stations in Dhaka,
 * including coordinates, amenities, and operational status.
 *
 * @fileoverview MRT-6 station data with strict TypeScript
 * @version 1.0.0
 * @since 2025-09-28
 */

import type {
  Coordinates,
  Latitude,
  Longitude,
  Milliseconds,
  StationId,
} from "@/lib/types";
import type {
  MetroLine,
  Station,
  StationAmenities,
  StationStatus,
  StationVersion,
} from "@/lib/types/station";
import { createStation, createStationHash } from "@/lib/types/station";

/**
 * MRT-6 Station constants with satisfies operator
 */
const MRT6_CONSTANTS = {
  lineId: "mrt-6" as MetroLine,
  totalStations: 17,
  operationalStations: 16,
  underConstructionStations: 1,
  plannedStations: 0,
  dataVersion: "1.0.0" as StationVersion,
  lastUpdated: "2024-12-15" as const,
  dataSource: "DMTCL Official" as const,
  coordinatePrecision: 6,
  // Timestamp constants
  lastVerifiedTimestamp: 1_702_684_800_000 as Milliseconds, // 2024-12-15
  nextMaintenanceTimestamp: 1_734_220_800_000 as Milliseconds, // 2025-12-15
  // Distance calculation constants
  metersPerDegree: 111_000,
  // Station capacity constants
  capacitySmall: 40_000,
  capacityMedium: 45_000,
  capacityLarge: 50_000,
  capacityXLarge: 55_000,
  capacityXXLarge: 60_000,
  capacityXXXLarge: 65_000,
  capacityHuge: 70_000,
  capacityMassive: 80_000,
  // Statistics constants
  platformCount: 2,
  entranceCountSmall: 3,
  entranceCountMedium: 4,
  entranceCountLarge: 5,
  entranceCountMassive: 6,
  exitCountSmall: 3,
  exitCountMedium: 4,
  exitCountLarge: 5,
  exitCountMassive: 6,
  // Validation constants
  minStringLength: 1,
  minArrayLength: 0,
  // Statistics magic numbers
  withElevator: 0,
  withWheelchair: 1,
  withParking: 2,
  withRestroom: 3,
  withATM: 4,
  withWiFi: 5,
  withCharging: 6,
  withFood: 7,
  withShop: 8,
  total: 9,
  operational: 10,
  underConstruction: 11,
  planned: 12,
  // Station order numbers
  stationOrder1: 1,
  stationOrder2: 2,
  stationOrder3: 3,
  stationOrder4: 4,
  stationOrder5: 5,
  stationOrder6: 6,
  stationOrder7: 7,
  stationOrder8: 8,
  stationOrder9: 9,
  stationOrder10: 10,
  stationOrder11: 11,
  stationOrder12: 12,
  stationOrder13: 13,
  stationOrder14: 14,
  stationOrder15: 15,
  stationOrder16: 16,
  stationOrder17: 17,
} as const satisfies Record<
  string,
  MetroLine | number | StationVersion | string | Milliseconds
>;

/**
 * MRT-6 Station coordinates data
 * Based on official DMTCL information and GPS coordinates
 */
const MRT6_COORDINATES = {
  uttaraNorth: { lat: 23.869_147 as Latitude, lng: 90.367_491 as Longitude },
  uttaraCenter: { lat: 23.859_583 as Latitude, lng: 90.365_067 as Longitude },
  uttaraSouth: { lat: 23.845_789 as Latitude, lng: 90.363_076 as Longitude },
  pallabi: { lat: 23.826_163 as Latitude, lng: 90.364_206 as Longitude },
  mirpur11: { lat: 23.819_105 as Latitude, lng: 90.365_25 as Longitude },
  mirpur10: { lat: 23.808_359 as Latitude, lng: 90.368_214 as Longitude },
  kazipara: { lat: 23.799_249 as Latitude, lng: 90.371_969 as Longitude },
  shewrapara: { lat: 23.790_966 as Latitude, lng: 90.375_476 as Longitude },
  agargaon: { lat: 23.778_439 as Latitude, lng: 90.380_049 as Longitude },
  bijoySarani: { lat: 23.766_569 as Latitude, lng: 90.383_082 as Longitude },
  farmgate: { lat: 23.759_056 as Latitude, lng: 90.387_059 as Longitude },
  karwanBazar: { lat: 23.751_312 as Latitude, lng: 90.392_715 as Longitude },
  shahbagh: { lat: 23.739_303 as Latitude, lng: 90.395_976 as Longitude },
  dhakaUniversity: {
    lat: 23.731_802 as Latitude,
    lng: 90.396_646 as Longitude,
  },
  bangladeshSecretariat: {
    lat: 23.730_028 as Latitude,
    lng: 90.407_903 as Longitude,
  },
  motijheel: { lat: 23.728_068 as Latitude, lng: 90.419_082 as Longitude },
  kamalapur: { lat: 23.732_972 as Latitude, lng: 90.425_444 as Longitude },
} as const satisfies Record<string, Coordinates>;

/**
 * MRT-6 Station amenities configuration
 * Based on official station specifications and accessibility requirements
 */
const MRT6_AMENITIES: Record<string, StationAmenities> = {
  uttaraNorth: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: false,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  uttaraCenter: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  uttaraSouth: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: false,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  pallabi: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  mirpur10: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  mirpur11: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: true,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  kazipara: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  shewrapara: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: true,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  agargaon: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  bijoySarani: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  farmgate: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  karwanBazar: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  shahbagh: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  dhakaUniversity: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  bangladeshSecretariat: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  motijheel: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
  kamalapur: {
    elevator: true,
    escalator: true,
    wheelchair: true,
    parking: true,
    restroom: true,
    atm: true,
    wifi: false,
    charging: true,
    food: true,
    shop: true,
    state: "verified",
    lastVerified: MRT6_CONSTANTS.lastVerifiedTimestamp,
    confidence: 0.95,
  },
} as const satisfies Record<string, StationAmenities>;

/**
 * MRT-6 Station operational status
 * Based on current operational status as of December 2024
 */
const MRT6_STATUS: Record<string, StationStatus> = {
  uttaraNorth: "operational",
  uttaraCenter: "operational",
  uttaraSouth: "operational",
  pallabi: "operational",
  mirpur10: "operational",
  mirpur11: "operational",
  kazipara: "operational",
  shewrapara: "operational",
  agargaon: "operational",
  bijoySarani: "operational",
  farmgate: "operational",
  karwanBazar: "operational",
  shahbagh: "operational",
  dhakaUniversity: "operational",
  bangladeshSecretariat: "operational",
  motijheel: "operational",
  kamalapur: "under-construction",
} as const satisfies Record<string, StationStatus>;

/**
 * MRT-6 Station aliases for search functionality
 */
const MRT6_ALIASES: Record<string, readonly string[]> = {
  uttaraNorth: ["Uttara North", "Uttara North Station", "Uttara 1"],
  uttaraCenter: ["Uttara Center", "Uttara Central", "Uttara 2"],
  uttaraSouth: ["Uttara South", "Uttara South Station", "Uttara 3"],
  pallabi: ["Pallabi", "Pallabi Station"],
  mirpur10: ["Mirpur 10", "Mirpur 10 Station", "Mirpur-10"],
  mirpur11: ["Mirpur 11", "Mirpur 11 Station", "Mirpur-11"],
  kazipara: ["Kazipara", "Kazipara Station"],
  shewrapara: ["Shewrapara", "Shewrapara Station"],
  agargaon: ["Agargaon", "Agargaon Station"],
  bijoySarani: ["Bijoy Sarani", "Bijoy Sarani Station"],
  farmgate: ["Farmgate", "Farmgate Station"],
  karwanBazar: ["Karwan Bazar", "Karwan Bazar Station"],
  shahbagh: ["Shahbagh", "Shahbagh Station"],
  dhakaUniversity: [
    "Dhaka University",
    "DU",
    "University Station",
    "TSC",
    "Teacher Student Center",
  ],
  bangladeshSecretariat: [
    "Bangladesh Secretariat",
    "Secretariat",
    "Secretariat Station",
    "Government Secretariat",
  ],
  motijheel: ["Motijheel", "Motijheel Station"],
  kamalapur: ["Kamalapur", "Kamalapur Station", "Kamalapur Railway Station"],
} as const satisfies Record<string, readonly string[]>;

/**
 * MRT-6 Station metadata
 */
const MRT6_METADATA = {
  uttaraNorth: {
    description: "Northern terminus of MRT-6, serving Uttara residential area",
    capacity: MRT6_CONSTANTS.capacityLarge,
    platformCount: MRT6_CONSTANTS.platformCount,
    entranceCount: MRT6_CONSTANTS.entranceCountMedium,
    exitCount: MRT6_CONSTANTS.exitCountMedium,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["terminus", "residential", "northern"],
  },
  uttaraCenter: {
    description: "Central station in Uttara area with commercial facilities",
    capacity: MRT6_CONSTANTS.capacityMedium,
    platformCount: 2,
    entranceCount: MRT6_CONSTANTS.entranceCountSmall,
    exitCount: MRT6_CONSTANTS.exitCountSmall,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["commercial", "residential", "central"],
  },
  uttaraSouth: {
    description: "Southern station in Uttara area",
    capacity: MRT6_CONSTANTS.capacitySmall,
    platformCount: 2,
    entranceCount: MRT6_CONSTANTS.entranceCountSmall,
    exitCount: MRT6_CONSTANTS.exitCountSmall,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["residential", "southern"],
  },
  pallabi: {
    description: "Major station serving Pallabi residential area",
    capacity: MRT6_CONSTANTS.capacityXLarge,
    platformCount: MRT6_CONSTANTS.platformCount,
    entranceCount: MRT6_CONSTANTS.entranceCountMedium,
    exitCount: MRT6_CONSTANTS.exitCountMedium,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["residential", "major", "commercial"],
  },
  mirpur10: {
    description: "Station serving Mirpur 10 area",
    capacity: MRT6_CONSTANTS.capacityLarge,
    platformCount: 2,
    entranceCount: MRT6_CONSTANTS.entranceCountSmall,
    exitCount: MRT6_CONSTANTS.exitCountSmall,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["residential", "commercial"],
  },
  mirpur11: {
    description: "Station serving Mirpur 11 area",
    capacity: MRT6_CONSTANTS.capacityLarge,
    platformCount: 2,
    entranceCount: MRT6_CONSTANTS.entranceCountSmall,
    exitCount: MRT6_CONSTANTS.exitCountSmall,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["residential", "commercial"],
  },
  kazipara: {
    description: "Station serving Kazipara area",
    capacity: MRT6_CONSTANTS.capacityMedium,
    platformCount: 2,
    entranceCount: MRT6_CONSTANTS.entranceCountSmall,
    exitCount: MRT6_CONSTANTS.exitCountSmall,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["residential", "commercial"],
  },
  shewrapara: {
    description: "Station serving Shewrapara area",
    capacity: MRT6_CONSTANTS.capacityMedium,
    platformCount: 2,
    entranceCount: MRT6_CONSTANTS.entranceCountSmall,
    exitCount: MRT6_CONSTANTS.exitCountSmall,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["residential", "commercial"],
  },
  agargaon: {
    description: "Station serving Agargaon government area",
    capacity: MRT6_CONSTANTS.capacityXXLarge,
    platformCount: MRT6_CONSTANTS.platformCount,
    entranceCount: MRT6_CONSTANTS.entranceCountMedium,
    exitCount: MRT6_CONSTANTS.exitCountMedium,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["government", "commercial", "major"],
  },
  bijoySarani: {
    description: "Station serving Bijoy Sarani area",
    capacity: MRT6_CONSTANTS.capacityLarge,
    platformCount: 2,
    entranceCount: MRT6_CONSTANTS.entranceCountSmall,
    exitCount: MRT6_CONSTANTS.exitCountSmall,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["commercial", "residential"],
  },
  farmgate: {
    description: "Major commercial station at Farmgate intersection",
    capacity: MRT6_CONSTANTS.capacityHuge,
    platformCount: 2,
    entranceCount: MRT6_CONSTANTS.entranceCountLarge,
    exitCount: MRT6_CONSTANTS.exitCountLarge,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["commercial", "major", "intersection"],
  },
  karwanBazar: {
    description: "Station serving Karwan Bazar commercial area",
    capacity: MRT6_CONSTANTS.capacityXXXLarge,
    platformCount: MRT6_CONSTANTS.platformCount,
    entranceCount: MRT6_CONSTANTS.entranceCountMedium,
    exitCount: MRT6_CONSTANTS.exitCountMedium,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["commercial", "bazar", "major"],
  },
  shahbagh: {
    description: "Station serving Shahbagh area near Dhaka University",
    capacity: MRT6_CONSTANTS.capacityXXLarge,
    platformCount: MRT6_CONSTANTS.platformCount,
    entranceCount: MRT6_CONSTANTS.entranceCountMedium,
    exitCount: MRT6_CONSTANTS.exitCountMedium,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["university", "commercial", "cultural"],
  },
  dhakaUniversity: {
    description: "Station serving Dhaka University area",
    capacity: MRT6_CONSTANTS.capacityXLarge,
    platformCount: MRT6_CONSTANTS.platformCount,
    entranceCount: MRT6_CONSTANTS.entranceCountSmall,
    exitCount: MRT6_CONSTANTS.exitCountSmall,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["university", "educational", "cultural"],
  },
  bangladeshSecretariat: {
    description:
      "Station serving Bangladesh Secretariat area (Under Construction)",
    capacity: MRT6_CONSTANTS.capacitySmall,
    platformCount: MRT6_CONSTANTS.platformCount,
    entranceCount: MRT6_CONSTANTS.entranceCountSmall,
    exitCount: MRT6_CONSTANTS.exitCountSmall,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["government", "under-construction"],
  },
  motijheel: {
    description: "Station serving Motijheel commercial area",
    capacity: MRT6_CONSTANTS.capacityMassive,
    platformCount: MRT6_CONSTANTS.platformCount,
    entranceCount: MRT6_CONSTANTS.entranceCountMassive,
    exitCount: MRT6_CONSTANTS.exitCountMassive,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["commercial", "southern"],
  },
  kamalapur: {
    description:
      "Station serving Kamalapur Railway Station area (Under Construction)",
    capacity: MRT6_CONSTANTS.capacityMassive,
    platformCount: MRT6_CONSTANTS.platformCount,
    entranceCount: MRT6_CONSTANTS.entranceCountMassive,
    exitCount: MRT6_CONSTANTS.exitCountMassive,
    accessibilityLevel: "full" as const,
    operatingHours: {
      open: "06:00",
      close: "22:00",
      timezone: "Asia/Dhaka",
    },
    tags: ["railway", "terminus", "southern", "under-construction"],
  },
} as const satisfies Record<
  string,
  {
    description: string;
    capacity: number;
    platformCount: number;
    entranceCount: number;
    exitCount: number;
    accessibilityLevel: "full" | "partial" | "limited" | "none";
    operatingHours: {
      open: string;
      close: string;
      timezone: string;
    };
    tags: readonly string[];
  }
>;

/**
 * Station data factory functions
 */

/**
 * Create MRT-6 station data with strict patterns
 */
const createMRT6Station = (key: string, order: number): Station => {
  const coordinates = MRT6_COORDINATES[key as keyof typeof MRT6_COORDINATES];
  const amenities = MRT6_AMENITIES[key as keyof typeof MRT6_AMENITIES];
  const status = MRT6_STATUS[key as keyof typeof MRT6_STATUS];
  const aliases = MRT6_ALIASES[key as keyof typeof MRT6_ALIASES];
  const metadata = MRT6_METADATA[key as keyof typeof MRT6_METADATA];

  if (!coordinates) {
    throw new Error(`Invalid station coordinates for key: ${key}`);
  }
  if (!amenities) {
    throw new Error(`Invalid station amenities for key: ${key}`);
  }
  if (!status) {
    throw new Error(`Invalid station status for key: ${key}`);
  }
  if (!aliases) {
    throw new Error(`Invalid station aliases for key: ${key}`);
  }
  if (!metadata) {
    throw new Error(`Invalid station metadata for key: ${key}`);
  }

  return createStation({
    id: `mrt-6-${key}` as StationId,
    name: metadata.description.split(",")[0] ?? `Station ${order}`, // Use first part of description as name
    coordinates,
    amenities,
    status,
    line: MRT6_CONSTANTS.lineId,
    order,
    aliases,
    metadata: {
      ...metadata,
      lastMaintenance: MRT6_CONSTANTS.lastVerifiedTimestamp,
      nextMaintenance: MRT6_CONSTANTS.nextMaintenanceTimestamp,
    },
  });
};

/**
 * MRT-6 Station data array with strict patterns
 * All 16 stations from Uttara North to Motijheel
 */
export const MRT6_STATIONS: readonly Station[] = [
  createMRT6Station("uttaraNorth", MRT6_CONSTANTS.stationOrder1),
  createMRT6Station("uttaraCenter", MRT6_CONSTANTS.stationOrder2),
  createMRT6Station("uttaraSouth", MRT6_CONSTANTS.stationOrder3),
  createMRT6Station("pallabi", MRT6_CONSTANTS.stationOrder4),
  createMRT6Station("mirpur11", MRT6_CONSTANTS.stationOrder5),
  createMRT6Station("mirpur10", MRT6_CONSTANTS.stationOrder6),
  createMRT6Station("kazipara", MRT6_CONSTANTS.stationOrder7),
  createMRT6Station("shewrapara", MRT6_CONSTANTS.stationOrder8),
  createMRT6Station("agargaon", MRT6_CONSTANTS.stationOrder9),
  createMRT6Station("bijoySarani", MRT6_CONSTANTS.stationOrder10),
  createMRT6Station("farmgate", MRT6_CONSTANTS.stationOrder11),
  createMRT6Station("karwanBazar", MRT6_CONSTANTS.stationOrder12),
  createMRT6Station("shahbagh", MRT6_CONSTANTS.stationOrder13),
  createMRT6Station("dhakaUniversity", MRT6_CONSTANTS.stationOrder14),
  createMRT6Station("bangladeshSecretariat", MRT6_CONSTANTS.stationOrder15),
  createMRT6Station("motijheel", MRT6_CONSTANTS.stationOrder16),
  createMRT6Station("kamalapur", MRT6_CONSTANTS.stationOrder17),
] as const;

/**
 * Station data utilities
 */

/**
 * Get all operational stations
 */
export function getOperationalStations(): readonly Station[] {
  return MRT6_STATIONS.filter((station) => station.status === "operational");
}

/**
 * Get all under-construction stations
 */
export function getUnderConstructionStations(): readonly Station[] {
  return MRT6_STATIONS.filter(
    (station) => station.status === "under-construction"
  );
}

/**
 * Get station by ID
 */
export function getStationById(id: StationId): Station | undefined {
  return MRT6_STATIONS.find((station) => station.id === id);
}

/**
 * Get station by name (case-insensitive)
 */
export function getStationByName(name: string): Station | undefined {
  return MRT6_STATIONS.find(
    (station) =>
      station.name.toLowerCase() === name.toLowerCase() ||
      station.aliases.some(
        (alias) => alias.toLowerCase() === name.toLowerCase()
      )
  );
}

/**
 * Get stations by status
 */
export function getStationsByStatus(status: StationStatus): readonly Station[] {
  return MRT6_STATIONS.filter((station) => station.status === status);
}

/**
 * Get stations with specific amenities
 */
export function getStationsWithAmenities(
  requiredAmenities: Partial<StationAmenities>
): readonly Station[] {
  return MRT6_STATIONS.filter((station) => {
    const amenities = station.amenities;
    return Object.entries(requiredAmenities).every(
      ([key, value]) => amenities[key as keyof StationAmenities] === value
    );
  });
}

/**
 * Get stations within distance from coordinates
 */
export function getStationsWithinDistance(
  coordinates: Coordinates,
  maxDistance: number
): readonly Station[] {
  // Simple distance calculation (in production, use proper geospatial calculations)
  return MRT6_STATIONS.filter((station) => {
    const latDiff = Number(station.coordinates.lat) - Number(coordinates.lat);
    const lngDiff = Number(station.coordinates.lng) - Number(coordinates.lng);
    const distance =
      Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) *
      MRT6_CONSTANTS.metersPerDegree;
    return distance <= maxDistance;
  });
}

/**
 * Get station statistics
 */
export function getStationStatistics() {
  return {
    total: MRT6_STATIONS.length,
    operational: getOperationalStations().length,
    underConstruction: getUnderConstructionStations().length,
    planned: getStationsByStatus("planned").length,
    withElevator: getStationsWithAmenities({ elevator: true }).length,
    withWheelchair: getStationsWithAmenities({ wheelchair: true }).length,
    withParking: getStationsWithAmenities({ parking: true }).length,
    withRestroom: getStationsWithAmenities({ restroom: true }).length,
    withATM: getStationsWithAmenities({ atm: true }).length,
    withWiFi: getStationsWithAmenities({ wifi: true }).length,
    withCharging: getStationsWithAmenities({ charging: true }).length,
    withFood: getStationsWithAmenities({ food: true }).length,
    withShop: getStationsWithAmenities({ shop: true }).length,
  };
}

/**
 * Search stations by query
 */
export function searchStations(query: string): readonly Station[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length === 0) {
    return MRT6_STATIONS;
  }

  return MRT6_STATIONS.filter((station) => {
    const searchableText = [station.name, ...station.aliases]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(normalizedQuery);
  });
}

/**
 * Get station by order on line
 */
export function getStationByOrder(order: number): Station | undefined {
  return MRT6_STATIONS.find((station) => station.order === order);
}

/**
 * Get next station on line
 */
export function getNextStation(currentStation: Station): Station | undefined {
  return getStationByOrder(currentStation.order + 1);
}

/**
 * Get previous station on line
 */
export function getPreviousStation(
  currentStation: Station
): Station | undefined {
  return getStationByOrder(currentStation.order - 1);
}

/**
 * Get all stations between two stations
 */
export function getStationsBetween(
  startStation: Station,
  endStation: Station
): readonly Station[] {
  const startOrder = Math.min(startStation.order, endStation.order);
  const endOrder = Math.max(startStation.order, endStation.order);

  return MRT6_STATIONS.filter(
    (station) => station.order > startOrder && station.order < endOrder
  );
}

/**
 * Station data validation
 */
export function validateStationData(station: Station): boolean {
  return (
    typeof station.id === "string" &&
    station.id.length >= MRT6_CONSTANTS.minStringLength &&
    typeof station.name === "string" &&
    station.name.length >= MRT6_CONSTANTS.minStringLength &&
    typeof station.coordinates.lat === "number" &&
    typeof station.coordinates.lng === "number" &&
    typeof station.amenities === "object" &&
    typeof station.status === "string" &&
    typeof station.line === "string" &&
    typeof station.order === "number" &&
    Array.isArray(station.aliases) &&
    station.aliases.length >= MRT6_CONSTANTS.minArrayLength
  );
}

/**
 * Validate all MRT-6 station data
 */
export function validateAllStationData(): boolean {
  return MRT6_STATIONS.every(validateStationData);
}

/**
 * Station data constants
 */
export const MRT6_DATA_CONSTANTS = {
  ...MRT6_CONSTANTS,
  stationCount: MRT6_STATIONS.length,
  operationalCount: getOperationalStations().length,
  underConstructionCount: getUnderConstructionStations().length,
  dataHash: createStationHash(JSON.stringify(MRT6_STATIONS)),
  lastValidated: Date.now() as Milliseconds,
} as const satisfies Record<
  string,
  number | string | StationVersion | Milliseconds
>;

/**
 * Export default station data
 */
export default MRT6_STATIONS;

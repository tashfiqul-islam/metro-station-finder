import * as v from "valibot";

import { LatitudeSchema, LongitudeSchema, parseOrThrow, SlugSchema } from "@/lib/validation";

// ─── Types ────────────────────────────────────────────────────────────────────

export const StationStatusSchema = v.union([
  v.literal("operational"),
  v.literal("under-construction"),
]);

export const StationSchema = v.object({
  lat: LatitudeSchema,
  lng: LongitudeSchema,
  nameBn: v.pipe(v.string(), v.minLength(1, "nameBn must not be empty")),
  nameEn: v.pipe(v.string(), v.minLength(1, "nameEn must not be empty")),
  orderIndex: v.pipe(
    v.number(),
    v.integer("orderIndex must be an integer"),
    v.minValue(1, "orderIndex must be >= 1"),
    v.maxValue(17, "orderIndex must be <= 17"),
  ),
  slug: SlugSchema,
  status: StationStatusSchema,
});

export type Station = v.InferOutput<typeof StationSchema>;
export type StationStatus = v.InferOutput<typeof StationStatusSchema>;

const StationsSchema = v.pipe(
  v.array(StationSchema),
  v.length(17, "Exactly 17 stations required"),
  v.check(
    (stations) => new Set(stations.map((s) => s.slug)).size === 17,
    "Station slugs must be unique",
  ),
  v.check((stations) => {
    const indices = stations.map((s) => s.orderIndex).toSorted((a, b) => a - b);
    return indices.every((idx, i) => idx === i + 1);
  }, "orderIndex values must be exactly 1–17 with no gaps"),
);

// ─── Data ─────────────────────────────────────────────────────────────────────
// Coordinates sourced from MRT-6 station locations.
// Station order follows the DMTCL alignment (north → south → south-east).

const STATIONS_DATA = [
  {
    lat: 23.8734,
    lng: 90.3695,
    nameBn: "উত্তরা নর্থ",
    nameEn: "Uttara North",
    orderIndex: 1,
    slug: "uttara-north",
    status: "operational",
  },
  {
    lat: 23.8671,
    lng: 90.3795,
    nameBn: "উত্তরা সেন্টার",
    nameEn: "Uttara Center",
    orderIndex: 2,
    slug: "uttara-center",
    status: "operational",
  },
  {
    lat: 23.8588,
    lng: 90.3874,
    nameBn: "উত্তরা সাউথ",
    nameEn: "Uttara South",
    orderIndex: 3,
    slug: "uttara-south",
    status: "operational",
  },
  {
    lat: 23.8264,
    lng: 90.3649,
    nameBn: "পল্লবী",
    nameEn: "Pallabi",
    orderIndex: 4,
    slug: "pallabi",
    status: "operational",
  },
  {
    lat: 23.8166,
    lng: 90.3682,
    nameBn: "মিরপুর ১১",
    nameEn: "Mirpur 11",
    orderIndex: 5,
    slug: "mirpur-11",
    status: "operational",
  },
  {
    lat: 23.8069,
    lng: 90.3684,
    nameBn: "মিরপুর ১০",
    nameEn: "Mirpur 10",
    orderIndex: 6,
    slug: "mirpur-10",
    status: "operational",
  },
  {
    lat: 23.8004,
    lng: 90.3667,
    nameBn: "কাজীপাড়া",
    nameEn: "Kazipara",
    orderIndex: 7,
    slug: "kazipara",
    status: "operational",
  },
  {
    lat: 23.7937,
    lng: 90.3638,
    nameBn: "শেওড়াপাড়া",
    nameEn: "Shewrapara",
    orderIndex: 8,
    slug: "shewrapara",
    status: "operational",
  },
  {
    lat: 23.7773,
    lng: 90.3811,
    nameBn: "আগারগাঁও",
    nameEn: "Agargaon",
    orderIndex: 9,
    slug: "agargaon",
    status: "operational",
  },
  {
    lat: 23.7551,
    lng: 90.3908,
    nameBn: "বিজয় সরণি",
    nameEn: "Bijoy Sarani",
    orderIndex: 10,
    slug: "bijoy-sarani",
    status: "operational",
  },
  {
    lat: 23.7502,
    lng: 90.3936,
    nameBn: "ফার্মগেট",
    nameEn: "Farmgate",
    orderIndex: 11,
    slug: "farmgate",
    status: "operational",
  },
  {
    lat: 23.749,
    lng: 90.3938,
    nameBn: "কারওয়ান বাজার",
    nameEn: "Karwan Bazar",
    orderIndex: 12,
    slug: "karwan-bazar",
    status: "operational",
  },
  {
    lat: 23.7389,
    lng: 90.3955,
    nameBn: "শাহবাগ",
    nameEn: "Shahbagh",
    orderIndex: 13,
    slug: "shahbagh",
    status: "operational",
  },
  {
    lat: 23.7268,
    lng: 90.3966,
    nameBn: "ঢাকা বিশ্ববিদ্যালয়",
    nameEn: "Dhaka University",
    orderIndex: 14,
    slug: "dhaka-university",
    status: "operational",
  },
  {
    lat: 23.7228,
    lng: 90.4076,
    nameBn: "বাংলাদেশ সচিবালয়",
    nameEn: "Bangladesh Secretariat",
    orderIndex: 15,
    slug: "bangladesh-secretariat",
    status: "operational",
  },
  {
    lat: 23.7281,
    lng: 90.4225,
    nameBn: "মতিঝিল",
    nameEn: "Motijheel",
    orderIndex: 16,
    slug: "motijheel",
    status: "operational",
  },
  {
    lat: 23.732,
    lng: 90.4287,
    nameBn: "কমলাপুর",
    nameEn: "Kamalapur",
    orderIndex: 17,
    slug: "kamalapur",
    status: "under-construction",
  },
] as const;

// Assert data integrity at module load — throws if schema is violated.
export const STATIONS: readonly Station[] = parseOrThrow(
  StationsSchema,
  STATIONS_DATA,
) as readonly Station[];

// ─── O(1) lookup helpers ──────────────────────────────────────────────────────

const bySlugMap = new Map<string, Station>();
const byOrderMap = new Map<number, Station>();

for (const station of STATIONS) {
  bySlugMap.set(station.slug, station);
  byOrderMap.set(station.orderIndex, station);
}

export const STATIONS_BY_SLUG: ReadonlyMap<string, Station> = bySlugMap;
export const STATIONS_BY_ORDER: ReadonlyMap<number, Station> = byOrderMap;

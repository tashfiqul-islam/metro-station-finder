# METRO-9 evidence

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

Audit date: 2026-11-02. Source baseline: `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`.
Deliverables: [parity](../product/feature-parity.md), [glossary](../product/glossary.md).
Scope: documentation only. No provider credentials, personal location, dependency installation or application changes.

## Confirmed — source inspection

Inspected README, package.json, package-lock.json, next.config.js, .markdownlint.json; pages index and route-fare; SearchBar, MapView, MetroInfoCard, CustomDropdown, NavBar and Layout; metroServices, fareCalculation, constants and loadGoogleMapScript.

Source links are pinned in the parity/glossary documents. The lockfile resolves Next 14.0.4, React / React DOM 18.2.0, @react-google-maps/api 2.19.2, TypeScript 5.3.3, Prettier 3.1.1, ESLint 8.56.0 and Tailwind CSS 3.4.1. This inventory does not assert compatibility or dependency health.

The Google script URL requests `libraries=places`; no version is pinned. The unused geocodeAddress helper is not the active search path. Repository search found no geolocation API request in src. No data provenance, validity date or update contract accompanies the static station/fare arrays.

## Confirmed — coordinator browser evidence

**Web-verified:** coordinator inspected [public site](https://tashfiqul-islam.github.io/metro-station-finder/) on 2026-11-02 and supplied findings for this audit; this author did not repeat browser research.

| Case | Steps / observed outcome                                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1   | Open Home. Location input disabled; Google panel displayed “Oops! Something went wrong. This page did not load Google Maps correctly.”                   |
| J2   | Successful Places selection and manual submission could not be verified because provider failed. Source behavior only is documented.                     |
| J3   | Successful walking route, markers, distance and provider recovery not observed.                                                                          |
| J4   | Open Route Fare. Both selections blank and no fare. Select Uttara North: destination offers other 15 stations. Select Motijheel: BDT 100. Footer v0.0.2. |
| J5   | Navigation to fare worked. Outside-click dropdown behavior and mobile layout were source-inspected only, not independently browser-reproduced.           |

Deployment SHA and provider failure cause unknown. A browser observation on this URL does not establish that deployment equals the pinned baseline. No official fare authority was established by its displayed value.

## Confirmed — official provider semantics

**Context7-verified, coordinator research:** official Google Maps JavaScript documentation, library identifier `/websites/developers_google_maps_javascript`, defines spherical `computeDistanceBetween` as point distance in meters; Directions distance `value` is meters. Sources: [geometry reference](https://developers.google.com/maps/documentation/javascript/reference/geometry), [directions reference](https://developers.google.com/maps/documentation/javascript/reference/directions).

**Web-verified, coordinator research:** geometry reference viewed 2026-11-02 reported update 2026-10-30 and weekly reference 3.66. That reference version is not proof of the baseline's loaded SDK version. No deprecation claim is made. Source comparison proves the card callback uses spherical calculation rather than directions-leg distance.

## Deterministic reproduction

**Repo-verified:** Bun 1.4.0 ran direct imports of the three baseline modules, exit 0. No installed application dependencies needed. To reproduce, save the code below as a temporary `metro-parity-check.ts` in repository root, run `bun ./metro-parity-check.ts`, then remove that temporary file. Checks mutate only an in-memory imported array and restore it in finally; no data file is edited.

```typescript
import { calculateFare, stationNames } from "./src/services/fareCalculation.ts";
import { findNearestMetro } from "./src/services/metroServices.ts";
import { metroStations } from "./src/utils/constants.ts";

function check(name: string, ok: boolean) {
  if (!ok) throw new Error(name);
  console.log("PASS " + name);
}
function thrown(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("Expected exception");
}
const matrix = stationNames.map((a) => stationNames.map((b) => calculateFare(a, b)));
check(
  "F1: 16 unique names per dataset",
  new Set(stationNames).size === 16 && new Set(metroStations.map((s) => s.name)).size === 16,
);
check("F2: 256 finite fares", matrix.flat().length === 256 && matrix.flat().every(Number.isFinite));
check(
  "F2: symmetric and zero diagonal",
  matrix.every((row, i) => row.every((v, j) => v === matrix[j][i] && (i !== j || v === 0))),
);
check(
  "F2: off-diagonal 20..100 multiples of ten",
  matrix.every((row, i) => row.every((v, j) => i === j || (v >= 20 && v <= 100 && v % 10 === 0))),
);
check("F3: Uttara North to Motijheel", calculateFare("Uttara North", "Motijheel") === 100);
for (const name of ["", "uttara north", " Uttara North", "Mirpur 11", "Agaragaon"]) {
  check(
    "F4: reject " + JSON.stringify(name),
    thrown(() => calculateFare(name, "Motijheel")) === "Station not found: " + name,
  );
}
check(
  "D1: all exact station points select themselves",
  metroStations.every((s) => findNearestMetro(s).name === s.name),
);
check(
  "D2: NaN throws",
  thrown(() => findNearestMetro({ lat: NaN, lng: 90 })) === "No metro stations found",
);
check(
  "D3: fixed Dhaka center",
  findNearestMetro({ lat: 23.8103, lng: 90.4125 }).name === "Kazipara",
);
check(
  "D3: out-of-range accepted",
  findNearestMetro({ lat: 100, lng: 200 }).name === "Uttara North",
);
const original = metroStations.slice();
try {
  metroStations.splice(
    0,
    metroStations.length,
    { name: "first", lat: 0, lng: 0 },
    { name: "second", lat: 0, lng: 0 },
  );
  check("D4: first wins exact tie", findNearestMetro({ lat: 0, lng: 0 }).name === "first");
  metroStations.splice(0);
  check(
    "D5: empty data throws",
    thrown(() => findNearestMetro({ lat: 0, lng: 0 })) === "No metro stations found",
  );
} finally {
  metroStations.splice(0, metroStations.length, ...original);
}
console.log(
  "label mismatches",
  metroStations.flatMap((s, i) =>
    s.name === stationNames[i] ? [] : [i + ": " + s.name + " / " + stationNames[i]],
  ),
);
for (const meters of [0, 999, 1000, 1001]) {
  const unit = meters >= 1000 ? "km" : "miles";
  console.log("U1", meters, (meters / (unit === "km" ? 1000 : 1609.34)).toFixed(2), unit);
}
```

Observed results: all checks passed. Five exact label mismatches match the glossary. D3 returned Kazipara / Uttara North. U1 output: 0 → 0.00 miles; 999 → 0.62 miles; 1000 → 1.00 km; 1001 → 1.00 km. U1 reproduces source expressions; it does not mount the UI or call Google. Synthetic coordinates are not personal locations.

## Inferred and unknown

The positional alias mapping, stale-result race risk and route-versus-card implications are in parity's Inferred section. Provider geometry availability, live happy path, permission handling, official data authority and full device/accessibility coverage remain unknown. No build, lint, application suite or provider integration test was run: no executable application change is included.

## Acceptance trace

| Acceptance criterion                                                        | Evidence                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Existing journeys / source / reproducibility                                | Parity journey table; J1–J5 distinguish browser-observed and source-only behavior; F1–F4, D1–D5, U1 reproducible checks. |
| Consistent station / unit / nearest / fare definitions                      | Glossary and five-label mismatch table.                                                                                  |
| Denied/unavailable location, invalid selection, no result, provider failure | Parity R1–R6 explicitly proposed; J1 observed provider failure; no invented permission observation.                      |
| Authority/staleness risks and deterministic fixtures                        | Parity data findings, Unknown section, R7–R8.                                                                            |

Local documentation checks: relative links resolved, only three requested Markdown paths changed, diff whitespace check passed. These checks do not certify transport data or satisfy merge/CI requirements. Ticket completion remains subject to the project's review and integration workflow.

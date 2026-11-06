# METRO-40: station domain model and nearest-station specification

- Identity: METRO-40; revision 1, 2026-11-05.
- Source: Plane work item fd4e032f-19aa-4e38-89f2-87307ff45fe7 (read as data; Plane was not written).
- Decision owner and approval: the owner delegated the station ID scheme and alias list to the implementing agent ("decide and justify in the spec"). Display-name choices below were proposals; the owner confirmed them on 2026-11-05 (see H1).
- Baseline: legacy commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, read with `git show` only (`src/utils/constants.ts`, `src/services/fareCalculation.ts`, `src/services/metroServices.ts`); no legacy code was run.
- Research: **Repo-verified** legacy behavior is recorded in [feature parity](../product/feature-parity.md) and the [glossary](../product/glossary.md). Haversine on a 6371 km sphere and WGS84 latitude/longitude ranges are standard definitions needing no library (**Unverified** against a current official source; no dependency was added, so nothing in the lockfile depends on them). Datum, coordinate accuracy, fare publisher and effective date remain **Unknown**.
- Domain: [glossary](../product/glossary.md) (Station, Station identifier, Nearest, Geographic distance, Walking distance, Fare, Same station); parity requirements R2, R6, R7 and R8.
- Problem and intended outcome: later slices (search, map, fare page, API) need one stable station identity and value types before feature code exists. The legacy app identifies stations by array position and exact strings, with five label mismatches between its two datasets.
- Scope: core domain types (`Station`, `StationId`, `Coordinate`, `Fare`, `FareTable`, `UnknownFare`, `GeographicDistanceKm`, `WalkingDistanceMeters`), the pure functions `findNearestStation`, `resolveStation` and `findFare`, and the versioned baseline dataset `baselineDataset` (`baseline-v2`) under `packages/core/src/stations`.
- Exclusions: database, map or UI code, walking-route computation, geocoding or provider calls, API contracts, unit formatting (km versus miles), correcting any legacy value except the three documented deviations (METRO-67).
- Constraints and contracts: core stays dependency-free and the domain layer imports only itself (dependency-cruiser rule `core-domain-imports-only-domain`, plus the existing `core-imports-only-core`). Fixtures are synthetic or the legacy baseline; no personal location.
- Grouping: module 02 foundation; release v1.0.0, nothing published by this ticket.
- Open decisions: see HITL items at the end.

## Decision: station ID scheme

**Chosen:** `StationId` is a branded string holding a lowercase ASCII kebab-case slug (`^[a-z0-9]+(-[a-z0-9]+)*$`), for example `uttara-north`, `mirpur-11`, `bangladesh-secretariat`.

Why:

- It is independent of array position, which is what the legacy matrix lookup depends on. Reordering or inserting a station cannot silently change fares.
- It is readable in URLs, fixtures, logs and review diffs, and it needs no allocation service or database, matching the "no database" constraint.
- The brand makes a plain string, a label or an index a compile error where an ID is required. `stationId()` and `isStationId()` validate at the boundary.
- Rules: an ID is permanent once published, never reused for another station, and never changed by a spelling correction. A renamed station keeps its ID and gains the old label as an alias. A closed station keeps its ID retired.

Rejected: numeric positional IDs (the legacy defect), UUIDs (opaque, need generation and carry no review value for 16 stations), and slugs of the legacy labels verbatim (they would bake the five mismatched spellings into permanent IDs).

The slug is derived from the proposed canonical name, so for the five mismatched stations it follows the canonical spelling (`agargaon`, `farmgate`, `karwan-bazar`).

## Decision: aliases and canonical names

`Station.name` is the proposed canonical display name. `Station.aliases` holds other exact, case-sensitive labels that resolve to the same ID. `resolveStation` matches name or alias exactly and returns `undefined` for anything else; it never normalizes case or whitespace and never guesses.

Positional correspondence is **Inferred**, not proven, that the five differing labels name the same station (the glossary records this). The mapping below is therefore a reviewed proposal, applied identically to the coordinate array and the fare array:

| Position | ID             | Name (proposed) | Coordinate label (legacy) | Fare label (legacy) | Aliases        |
| -------- | -------------- | --------------- | ------------------------- | ------------------- | -------------- |
| 4        | `mirpur-11`    | Mirpur 11       | Mirpur 11                 | Mirpur - 11         | `Mirpur - 11`  |
| 5        | `mirpur-10`    | Mirpur 10       | Mirpur 10                 | Mirpur - 10         | `Mirpur - 10`  |
| 8        | `agargaon`     | Agargaon        | Agaragaon                 | Agargaon            | `Agaragaon`    |
| 10       | `farmgate`     | Farmgate        | Farmagate                 | Farmgate            | `Farmagate`    |
| 11       | `karwan-bazar` | Karwan Bazar    | Kawran Bazar              | Karwan Bazar        | `Kawran Bazar` |

The other eleven stations have identical labels in both legacy arrays and need no alias.

**Recorded mismatch (not silently changed):** the legacy Home result card would have shown `Agaragaon`, `Farmagate` and `Kawran Bazar` (coordinate labels) while the fare dropdown showed `Agargaon`, `Farmgate` and `Karwan Bazar`. The dataset's single `name` picks the fare-array spelling for those three (the conventional English spellings) and the coordinate-array form for the two Mirpur stations (no hyphen, matching the glossary). Coordinates and fares are copied unchanged. Both legacy labels stay resolvable as aliases, so no legacy lookup string becomes unknown. The owner confirmed the `name` column as the displayed label (H1 below).

## Deliberate parity deviations (METRO-67, dataset `baseline-v2`)

Owner-delegated decisions of 2026-11-05, based on [Dhaka MRT Line-6 research](../evidence/dhaka-mrt-line-6.md). Exactly three values differ from the legacy snapshot; everything else (order, ids, fares, all other names and coordinates) is unchanged, and the parity test fails on any other drift.

| Station id      | Field      | Legacy (af903d7)                     | `baseline-v2`          | Source                                                                                                                                   |
| --------------- | ---------- | ------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `shahbagh`      | name       | `Shahbagh`                           | `Shahbag`              | DMTCL station list, Wikipedia, OSM English spelling                                                                                      |
| `bijoy-sharani` | name       | `Bijoy Sharani`                      | `Bijoy Sarani`         | Wikipedia ("Bijoy Sarani metro station"), OSM `wikipedia` tag                                                                            |
| `bijoy-sharani` | coordinate | 23.76767563448402, 90.38309390581901 | 23.7663936, 90.3830971 | OSM station node 10294553601 (v8, retrieved 2026-11-05, 7 decimals as served); Wikidata Q115951628 P625 23.766614, 90.383084 (25 m away) |

- **Aliases:** the old exact labels stay resolvable: `Shahbagh` -> `shahbagh`; `Bijoy Sharani` -> `bijoy-sharani`. DMTCL's English spelling `Bijoy Sarawni` (also the OSM `name:en`) is added as an alias of `bijoy-sharani`. `validateDataset` finds no duplicate label.
- **Ids do not change.** `shahbagh` and `bijoy-sharani` are permanent slugs (ID rules above); only the display name moves.
- **Datum:** OSM data is WGS84; Wikidata P625 is WGS84 by convention (its globe is Earth, Q2); no official coordinate exists. The legacy datum is unknown (glossary).
- **Coordinate precision:** the other 15 coordinates are full double-precision values copied from the legacy source; the OSM value has 7 decimals (about 1 cm) and is stored as served, not padded.
- **Nearest-station behavior change (measured):** the corrected point is 143 m south of the legacy point. Over the grid below the nearest station changes for 1,124 of 96,240 points (1.17%, about 3.2 km2): Farmgate to Bijoy Sarani 613, Agargaon to Bijoy Sarani 30, Bijoy Sarani to Agargaon 281, Bijoy Sarani to Farmgate 200. All lie along the boundaries between Bijoy Sarani and its neighbours; no other station is affected.
- **Measurement method (re-runnable):** origins are `lat = 23.70 + i * 0.0005` for integer `i` in 0..400 (both ends inclusive, 401 values, 23.70 to 23.90) and `lng = 90.33 + j * 0.0005` for `j` in 0..239 (half-open: 240 values, 90.33 to 90.4495, 90.45 excluded), 401 x 240 = 96,240 points; integer indices avoid accumulated floating-point drift. For each origin run core's `findNearestStation` (Haversine `geographicDistanceKm`, R = 6371 km, strict less-than so the first station in dataset order wins an exact tie) against two datasets: "before" is the current `baselineDataset.stations` with only the `bijoy-sharani` coordinate replaced by the legacy 23.76767563448402, 90.38309390581901; "after" is the current `baselineDataset.stations`. Count origins whose nearest station id differs, grouped by before to after. The area figure is count x (0.0005 x 111.32 km) x (0.0005 x 111.32 km x cos 23.8 degrees). The throwaway script is deliberately not committed; this paragraph is its specification.
- **Tie-break unchanged:** first station in dataset order wins an exact tie.
- **Dataset version:** `baseline-v1` (uncorrected copy) becomes `baseline-v2`.

## Types

- `Coordinate { lat, lng }` in degrees. `parseCoordinate(lat, lng)` returns `{ ok: true, coordinate }` or `{ ok: false, reason }` where reason is `not-finite-number`, `latitude-out-of-range` (outside [-90, 90]) or `longitude-out-of-range` (outside [-180, 180]). The legacy service validated nothing (parity: "No coordinate validation"); validation is a deliberate, recorded behavior change that parity requirement R8 asks for.
- `GeographicDistanceKm` and `WalkingDistanceMeters` are distinct branded numbers. Neither is assignable to the other or to a bare `number`. Only the geographic one is produced here (`geographicDistanceKm`, Haversine, R = 6371 km, the legacy formula). `walkingDistanceMeters` only validates a finite non-negative value; no routing exists in this slice.
- `Fare { amount, currency: "BDT" }`. Zero is a legitimate fare for the same station (legacy diagonal).
- `FareResult = { kind: "fare", fare } | UnknownFare`. `UnknownFare { kind: "unknown-fare", reason: "unknown-station" | "no-fare-entry" }` has no amount property, so an unknown fare can never be read, summed or displayed as zero (R6).
- `FareTable { order, amounts }`: a square matrix addressed through `order`, so lookup is by `StationId`, never by position.

## Slice METRO-40

- Title and outcome: stable station identity, value types and the first nearest-station behavior exist in core before feature code.
- Blocked by: none.
- Required tools/data: the legacy snapshot above; Bun test runner; no network.

### Nearest-station behavior

- Ranking is by geographic (Haversine) distance only. It is not walking distance, walking time, accessibility or service availability.
- **Tie order:** on exactly equal distance the station that appears first in the dataset array wins (strict less-than, identical to legacy). Dataset array order is therefore part of the contract; `baseline-v2` keeps the legacy order, and the Bijoy Sarani correction (see Deliberate parity deviations above) changes which station is nearest only along its boundaries with Agargaon and Farmgate.
- **Invalid input:** an origin that fails `parseCoordinate` returns `{ kind: "no-result", reason: "invalid-coordinate", detail }` and is checked before the dataset, so it is reported even when the dataset is empty.
- **Empty dataset:** returns `{ kind: "no-result", reason: "empty-dataset" }`. The legacy code threw `No metro stations found`; core returns a value so callers cannot forget to handle it.
- **Unknown station:** `resolveStation` returns `undefined`; `findFare` returns `unknown-fare` / `unknown-station` for either end. The legacy fare service threw `Station not found`.
- **Same station:** `findFare(a, a)` is a real zero fare, kept distinct from "no selection" and from unknown (R6). The legacy UI could not reach this pair; the domain still defines it as a defensive default. The UI must not allow it (H3 below).
- Success: `{ kind: "nearest", station, distance }` with `distance` a `GeographicDistanceKm`.

### Acceptance

- A1: Given the core public entry `packages/core/src/index.ts`, then `Station`, `Coordinate` and `Fare` types are exported and geographic and walking distance are separate types that do not assign to each other (compile-time `@ts-expect-error` cases in `geo/distance.test.ts` and `stations/station.test.ts`, checked by `tsc -b`).
- A2: Given `baselineDataset`, then it has 16 stations with unique IDs, no label shared by two stations, a 16x16 symmetric fare table with a zero diagonal and 256 finite cells, legacy order, and every legacy label from both arrays (including the old spellings `Shahbagh` and `Bijoy Sharani`) resolves to the station at its position. The dataset equals the legacy names and coordinates except the three documented deviations (A2a), and its aliases are exactly the reviewed set (`stations/dataset.test.ts`).
- A2a: Given the legacy snapshot embedded in `stations/dataset.test.ts`, then the only differences from `baselineDataset` are the name of `shahbagh`, the name of `bijoy-sharani` and the coordinate of `bijoy-sharani`; any other drift fails. All 256 fare cells are also compared with the legacy matrix embedded in the test (generated from `fareMatrix` in `af903d7:src/services/fareCalculation.ts`); no fare deviates.
- A3: Tests cover tie order (forward, reversed and duplicate-coordinate), invalid coordinates (NaN, out of range, both axes), empty dataset, unknown station, same-station fare and an unknown fare never being zero, including a malformed matrix cell (`stations.test.ts`).
- A4: Given a core domain file that imports core application or data code, then dependency-cruiser fails with `core-domain-imports-only-domain` (`scripts/layering.test.ts`); application and data importing the domain passes.

### Hardening

`geographicDistanceKm` clamps the Haversine term to [0, 1] so near-antipodal rounding cannot produce NaN. `findNearestStation` skips any station whose distance is not finite, so a NaN never becomes the result. `validateDataset(dataset)` returns `{ ok: true }` or `{ ok: false, problems }` without throwing: unique station ids, no label shared across names and aliases, fare `order` equal to the station id list, a square matrix, zero diagonal, finite non-negative cells.

### Failure/boundary checks

Latitude exactly ±90 and longitude exactly ±180 are accepted; just beyond is rejected. An exact-point origin returns that station at distance zero for all 16 stations. A fare cell that is missing, NaN or negative yields `no-fare-entry`, not zero. Differently cased or padded labels do not resolve.

### Testing seams

- S1: `packages/core/src/index.ts` public exports (`index.test.ts`).
- S2: `findNearestStation`, `resolveStation`, `findFare` (`stations.test.ts`).
- S3: `baselineDataset` fixture (`stations/dataset.test.ts`).
- S4: dependency-cruiser layering (`scripts/layering.test.ts`).

### Check plan

`mise exec -- bun run check` (format, type-aware lint, boundaries, import graph, Knip, tests with the per-file 90% coverage gate under randomized order, coverage scope, `tsc -b`). Each acceptance fails on the base commit: the domain, application and data modules do not exist there and the layering rule is absent.

## Open decisions (HITL)

Owner answers given in chat on 2026-11-05. Numbering is kept for traceability.

- H1: **Resolved 2026-11-05.** Display spelling for the five mismatched stations: Mirpur 11, Mirpur 10, Agargaon, Farmgate, Karwan Bazar. The proposed `name` column above stands. Bangla names: the owner said English only for now (see language below).
- H2: **Partly resolved 2026-11-05.** Owner-stated: fares come from the Government, effective since the service launched. Publisher name and launch date not recorded. Datum and coordinate source remain Unknown.
- H3: **Resolved 2026-11-05.** The UI must not allow the same station for both ends. The domain keeps returning the explicit same-station zero fare as a defensive default. UI requirement for the future fare-selection slice: the origin cannot equal the destination (for example the destination choices exclude the chosen origin).
- H4: not part of the owner answers. Tie-breaking by dataset order is parity; a future ranking by walking distance would need its own specification.

**Language:** English only for now. Switching language (i18n) is a future feature and out of scope; the current goal is parity on the new architecture with better UI/UX.

## Readiness record

Reviewer: pending independent review. Acceptance is mapped to seams above. No unresolved blocker; H1 to H3 were answered by the owner on 2026-11-05 and H4 is parity, so none blocks this slice.

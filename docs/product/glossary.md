# Glossary

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

Baseline terms for [feature parity](feature-parity.md); verification: [METRO-9](../evidence/metro-9.md).

## Confirmed — Repo-verified

| Term                 | Baseline meaning                                                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location             | Search-selected Places geometry, not verified device position. Initial map center is a fixed Dhaka coordinate.                                                                                      |
| Coordinate           | Numeric latitude and longitude in angular degrees, passed as `lat` / `lng` to Google Maps. Datum, precision and survey accuracy are unknown.                                                        |
| Station              | One named geographic point in the local coordinate array; not a proven station entrance or platform.                                                                                                |
| Station identifier   | No persistent ID exists. Nearest lookup returns a coordinate entry; fare lookup uses exact case-sensitive strings and array positions. Names are not interchangeable across datasets.               |
| Nearest              | Lowest Haversine geographic distance among local points, radius 6371 km. First array entry wins an exact tie. Not nearest by walking time, walking distance, accessibility or service availability. |
| Geographic distance  | Point-to-point spherical distance. Nearest service uses Haversine kilometers; map callback uses Google spherical distance in meters. These are different calculations.                              |
| Walking distance     | Distance along a WALKING route. Baseline draws that route but does not read its leg distance into the card.                                                                                         |
| Meter                | Unit emitted by map distance callback; card divides by 1000 for km or 1609.34 for miles.                                                                                                            |
| Display unit         | `km` when meters >= 1000; otherwise `miles`. Two decimal places. Zero displays 0.00 miles. No user unit preference.                                                                                 |
| Origin / destination | Fare dropdown selections. Independent of Home's searched location/nearest station.                                                                                                                  |
| Fare                 | Number from local 16×16 matrix, rendered with BDT. No documented payment method, concession or effective date.                                                                                      |
| Same station         | Matrix diagonal zero; ordinary dropdown choices exclude opposite selection, so service behavior differs from reachable UI choices.                                                                  |
| No selection         | Blank fare dropdown; fare absent, not zero.                                                                                                                                                         |
| Dataset version      | Git baseline identifies code/data snapshot, not transport authority or a publication date.                                                                                                          |

Sources: [coordinates](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/utils/constants.ts), [nearest service](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/services/metroServices.ts), [fare service](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/services/fareCalculation.ts), [map](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/components/MapView.tsx), [card](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/components/MetroInfoCard.tsx).

## Confirmed label mismatch

Zero-based positions; exact strings preserved.

| Position | Coordinate label | Fare label   |
| -------- | ---------------- | ------------ |
| 4        | Mirpur 11        | Mirpur - 11  |
| 5        | Mirpur 10        | Mirpur - 10  |
| 8        | Agaragaon        | Agargaon     |
| 10       | Farmagate        | Farmgate     |
| 11       | Kawran Bazar     | Karwan Bazar |

## Inferred / Unknown

**Inferred:** same positions probably refer to the same physical stations. **Unknown:** official spelling and authoritative identity mapping. Proposed rebuild IDs/aliases must be reviewed, not inferred silently from these strings.

## Rebuild terms (METRO-40)

Defined in [nearest-station specification](../specifications/nearest-station.md); they describe the rebuild, not the baseline.

| Term             | Rebuild meaning                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Station ID       | Branded lowercase kebab-case slug (for example `farmgate`), permanent and never positional. Legacy labels resolve to it as exact, case-sensitive aliases. |
| Alias            | Another exact label (such as `Farmagate`) that resolves to a Station ID. No case folding or guessing.                                                     |
| Unknown fare     | Explicit result with no amount (`unknown-station` or `no-fare-entry`); never zero. Distinct from the same-station zero fare.                              |
| Baseline dataset | Versioned `baseline-v1` module of the 16 stations and 256 fares copied from the legacy snapshot.                                                          |

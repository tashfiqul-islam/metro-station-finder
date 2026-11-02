# UI and accessibility

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

Inspect affected [pages](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/pages/index.tsx) and components. Existing journeys/domain terms additionally require source-backed parity evidence; until landed, consult [METRO-9](https://app.plane.so/metro-station-finder/browse/METRO-9/) and source. Do not invent product behavior from planned architecture.

For authorized UI work specify loading, empty, success, failure and recovery states plus keyboard/focus, labels, screen-reader feedback and responsive layout checks relevant to slice. Preserve geographic station selection versus provider walking-route distance as distinct concepts. Read [testing](testing.md) for behavior, [security](security.md) for location/permissions and [API](api.md) for provider interaction. Playwright/axe are proposed checks, not available verified gates; record manual evidence and unrun automation honestly.

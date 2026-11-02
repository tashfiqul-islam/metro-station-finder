# Testing and bugs

**Confirmed / Repo-verified:** [manifest](../../package.json) has no test script. Test runner, fixtures and CI test enforcement are not established by this guidance.

For bugs reproduce observed failure before a fix; record base revision, expected behavior and smallest relevant source path. Read parity evidence for existing behavior and domain glossary for terms via [METRO-9](https://app.plane.so/metro-station-finder/browse/METRO-9/) while pending. Add API/UI/security/observability reads only when those boundaries are touched.

Retain settled test seams: deterministic domain/data fixtures, provider/contract boundaries, Workers integration and browser/accessibility journeys when their implementations exist. Cover invalid input, empty data, failed provider and recovery when relevant; use synthetic coordinates, never personal location. A failing regression should prove behavior, not mirror implementation. Do not weaken assertions or skip failures to pass. Record exact checks, fixtures, outcomes and omissions against [quality gates](quality-gates.md). Documentation tasks verify links, routing and scope without claiming app checks ran.

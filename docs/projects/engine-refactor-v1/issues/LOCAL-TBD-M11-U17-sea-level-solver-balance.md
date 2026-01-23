---
id: LOCAL-TBD-M11-U17
title: "[M11/U17] Fix sea-level solver: search both directions to avoid all-land worlds"
state: planned
priority: 1
estimate: 2
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [morphology, bug, realism, hypsometry]
parent: LOCAL-TBD-M11-U15
children: []
blocked_by: []
blocked: []
related_to: [LOCAL-TBD-M11-U14, M11-U00]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Fix `morphology/compute-sea-level` so hypsometry “backstops” (boundaryShareTarget/continentalFraction) can move sea level toward **more water** when needed, instead of collapsing to land-dominant worlds.

## Deliverables
- `resolveSeaLevel()` evaluates candidate percentiles around the initial target in **both** directions and selects the closest candidate that satisfies backstops (or best-effort if none).
- Regression tests cover:
  - “Backstops require more water” scenario (solver must raise seaLevel / increase targetPct).
  - “Backstops enabled” scenario does not unexpectedly collapse to land-dominant outputs for the standard realism preset.

## Acceptance Criteria
- With boundary/uplift distributions that require higher sea level to meet `boundaryShareTarget`, the solver increases seaLevel instead of decreasing target to 0.
- Standard earthlike realism remains ocean-dominant (no accidental “all land”).

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test -- test/morphology/sea-level-land-balance.test.ts`

## Dependencies / Notes
- Related:
  - [LOCAL-TBD-M11-U14](./LOCAL-TBD-M11-U14-validation-observability-realism-dashboard.md)
  - [LOCAL-TBD-M11-U15](./LOCAL-TBD-M11-U15-foundation-realism-execution-spine.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)


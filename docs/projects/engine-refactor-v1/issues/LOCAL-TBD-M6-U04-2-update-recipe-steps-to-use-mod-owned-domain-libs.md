---
id: LOCAL-TBD-M6-U04-2
title: "[M6] Update recipe steps to use mod-owned domain libs"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U04
children: []
blocked_by: [LOCAL-TBD-M6-U02, LOCAL-TBD-M6-U04-1]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Update recipe steps and stages to import domain logic from the standard content package.

## Deliverables
- Step and stage modules reference `mods/mod-swooper-maps/src/domain/**` for domain logic.
- No recipe or step imports from `packages/mapgen-core/src/domain/**` remain.

## Acceptance Criteria
- Recipe-local steps compile while importing only mod-owned domain modules.
- All domain import edges point into the content package.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md)
- Blocked by: [LOCAL-TBD-M6-U02](./LOCAL-TBD-M6-U02-ship-authoring-sdk-v1-factories.md), [LOCAL-TBD-M6-U04-1](./LOCAL-TBD-M6-U04-1-relocate-domain-modules-to-mod-owned-libs.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Update all recipe-local steps/stages to import domain helpers from the mod-owned domain library.
- Remove any remaining import edges that cross back into core domain paths.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Prompts (run before implementation)

#### P1) Base step → domain import map
- **Goal:** Precompute which domain modules each base step uses so rewriting step files is straightforward and doesn’t miss helpers.
- **Commands:**
  - `rg -n "@mapgen/domain" packages/mapgen-core/src/base/pipeline -S`
  - `rg -n "from \"@mapgen/domain" packages/mapgen-core/src/base/pipeline -S`
- **Output to capture:**
  - A list of base step files and the domain modules they import.
  - A proposed target import path under `mods/mod-swooper-maps/src/domain/**` for each.

### Prework Findings (Pending)
#### P1) Base step → domain import map
- `packages/mapgen-core/src/base/pipeline/morphology/LandmassStep.ts`
  - `@mapgen/domain/morphology/landmass/index.js` → `mods/mod-swooper-maps/src/domain/morphology/landmass/index.ts`
- `packages/mapgen-core/src/base/pipeline/morphology/MountainsStep.ts`
  - `@mapgen/domain/morphology/mountains/index.js` → `mods/mod-swooper-maps/src/domain/morphology/mountains/index.ts`
- `packages/mapgen-core/src/base/pipeline/morphology/VolcanoesStep.ts`
  - `@mapgen/domain/morphology/volcanoes/index.js` → `mods/mod-swooper-maps/src/domain/morphology/volcanoes/index.ts`
- `packages/mapgen-core/src/base/pipeline/hydrology/ClimateBaselineStep.ts`
  - `@mapgen/domain/hydrology/climate/index.js` → `mods/mod-swooper-maps/src/domain/hydrology/climate/index.ts`
- `packages/mapgen-core/src/base/pipeline/hydrology/ClimateRefineStep.ts`
  - `@mapgen/domain/hydrology/climate/index.js` → `mods/mod-swooper-maps/src/domain/hydrology/climate/index.ts`
- `packages/mapgen-core/src/base/pipeline/hydrology/RiversStep.ts`
  - `@mapgen/domain/narrative/swatches.js` → `mods/mod-swooper-maps/src/domain/narrative/swatches.ts`
- `packages/mapgen-core/src/base/pipeline/narrative/StoryCorridorsStep.ts`
  - `@mapgen/domain/narrative/corridors/index.js` → `mods/mod-swooper-maps/src/domain/narrative/corridors/index.ts`
- `packages/mapgen-core/src/base/pipeline/narrative/StoryRiftsStep.ts`
  - `@mapgen/domain/narrative/tagging/index.js` → `mods/mod-swooper-maps/src/domain/narrative/tagging/index.ts`
- `packages/mapgen-core/src/base/pipeline/narrative/StorySwatchesStep.ts`
  - `@mapgen/domain/narrative/orogeny/index.js` → `mods/mod-swooper-maps/src/domain/narrative/orogeny/index.ts`
  - `@mapgen/domain/narrative/swatches.js` → `mods/mod-swooper-maps/src/domain/narrative/swatches.ts`
- `packages/mapgen-core/src/base/pipeline/placement/PlacementStep.ts`
  - `@mapgen/domain/placement/index.js` → `mods/mod-swooper-maps/src/domain/placement/index.ts`
  - `@mapgen/domain/placement/wonders.js` → `mods/mod-swooper-maps/src/domain/placement/wonders.ts`

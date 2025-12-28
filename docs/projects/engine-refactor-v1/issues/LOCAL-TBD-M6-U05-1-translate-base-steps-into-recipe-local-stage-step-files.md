---
id: LOCAL-TBD-M6-U05-1
title: "[M6] Translate base steps into recipe-local stage/step files"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U05
children: []
blocked_by: [LOCAL-TBD-M6-U03, LOCAL-TBD-M6-U04]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Translate base mod step implementations into recipe-local stage and step files.

## Deliverables
- Step implementations moved from `@swooper/mapgen-core/base` into recipe-local files.
- Each stage owns a `steps/` directory with one file per step.
- Stage `steps/index.ts` uses named exports only.

## Acceptance Criteria
- Standard recipe steps compile from their new recipe-local locations.
- Stage and step layout follows the required skeleton.
- No `export *` usage in step index files.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U05](./LOCAL-TBD-M6-U05-re-author-standard-recipe-as-a-mini-package.md)
- Blocked by: [LOCAL-TBD-M6-U03](./LOCAL-TBD-M6-U03-scaffold-standard-content-package-skeleton-and-exports.md), [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Translate current `@swooper/mapgen-core/base` step implementations into recipe-local step files.
- Ensure stages own steps on disk and expose explicit named exports.
- Keep step `requires`/`provides` metadata intact during the move.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Prompts (run before implementation)

#### P1) Per-stage step inventory (files + exports + ids)
- **Goal:** Generate a stage-by-stage list of step files and their exported step objects so translation is mechanical.
- **Commands:**
  - `find packages/mapgen-core/src/base/pipeline -maxdepth 2 -type f -name "*Step.ts" -print`
  - `find packages/mapgen-core/src/base/pipeline -maxdepth 2 -type f -name "steps.ts" -print`
  - `rg -n "export (const|function)" packages/mapgen-core/src/base/pipeline -S`
- **Output to capture:**
  - For each stage folder, list the step files and the exported step symbol names.
  - Note any steps that currently share a single file or have unusual export patterns.

#### P2) Config schema presence audit (must be explicit everywhere)
- **Goal:** Ensure every translated step has an explicit config schema (even empty), matching the M6 authoring rule.
- **Commands:**
  - `rg -n "configSchema" packages/mapgen-core/src/base/pipeline -S`
  - `rg -n "configSchema\\s*:\\s*Type\\." packages/mapgen-core/src/base/pipeline -S`
- **Output to capture:**
  - A list of steps missing `configSchema` today and a proposed empty schema to add during translation.

### Prework Findings (Pending)
#### P1) Per-stage step inventory (files + exports + ids)
- Foundation:
  - File: `packages/mapgen-core/src/base/pipeline/foundation/FoundationStep.ts`
  - Export: `createFoundationStep` (stage id: `foundation`)
  - Barrel: `packages/mapgen-core/src/base/pipeline/foundation/steps.ts` (named re-exports)
- Morphology:
  - Files: `LandmassStep.ts`, `CoastlinesStep.ts`, `RuggedCoastsStep.ts`, `IslandsStep.ts`, `MountainsStep.ts`, `VolcanoesStep.ts`
  - Exports: `createLandmassPlatesStep`, `createCoastlinesStep`, `createRuggedCoastsStep`, `createIslandsStep`, `createMountainsStep`, `createVolcanoesStep`
  - Barrel: `packages/mapgen-core/src/base/pipeline/morphology/steps.ts`
- Narrative (no `steps.ts` barrel today; exports are in stage index):
  - Files: `StorySeedStep.ts`, `StoryHotspotsStep.ts`, `StoryRiftsStep.ts`, `StoryOrogenyStep.ts`, `StoryCorridorsStep.ts`, `StorySwatchesStep.ts`
  - Exports: `createStorySeedStep`, `createStoryHotspotsStep`, `createStoryRiftsStep`, `createStoryOrogenyStep`, `createStoryCorridorsPreStep`, `createStoryCorridorsPostStep`, `createStorySwatchesStep`
- Hydrology:
  - Files: `ClimateBaselineStep.ts`, `LakesStep.ts`, `RiversStep.ts`, `ClimateRefineStep.ts`
  - Exports: `createClimateBaselineStep`, `createLakesStep`, `createRiversStep`, `createClimateRefineStep`
  - Barrel: `packages/mapgen-core/src/base/pipeline/hydrology/steps.ts`
- Ecology:
  - Files: `BiomesStep.ts`, `FeaturesStep.ts`
  - Exports: `createBiomesStep`, `createFeaturesStep`
  - Barrel: `packages/mapgen-core/src/base/pipeline/ecology/steps.ts`
- Placement:
  - Files: `DerivePlacementInputsStep.ts`, `PlacementStep.ts`
  - Exports: `createDerivePlacementInputsStep`, `createPlacementStep`
  - Barrel: `packages/mapgen-core/src/base/pipeline/placement/steps.ts`

#### P2) Config schema presence audit (must be explicit everywhere)
- All base step factories already define `configSchema` (many use `EmptyStepConfigSchema` for no-config steps).
- Translation must preserve explicit schemas in every step file to satisfy authoring requirements.

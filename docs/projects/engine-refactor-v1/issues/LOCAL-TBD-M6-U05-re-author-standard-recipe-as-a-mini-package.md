---
id: LOCAL-TBD-M6-U05
title: "[M6] Re-author standard recipe as a mini-package"
state: planned
priority: 2
estimate: 16
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: [LOCAL-TBD-M6-U05-1, LOCAL-TBD-M6-U05-2]
blocked_by: [LOCAL-TBD-M6-U03, LOCAL-TBD-M6-U04]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Re-author the standard recipe as a mod-owned mini-package by completing the child issues.

## Deliverables
- Standard recipe is authored via the authoring SDK under `mods/mod-swooper-maps/src/recipes/standard/**`.
- Stages own steps on disk; recipe composes stages explicitly.
- Tag definitions are recipe-local and registered via `createRecipe`.

## Acceptance Criteria
- Child issues are complete and the standard recipe compiles via the authoring SDK.
- Steps are recipe-local wrappers with explicit `requires`/`provides` metadata.
- Narrative remains a normal stage slice (no redesign in M6).

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U03](./LOCAL-TBD-M6-U03-scaffold-standard-content-package-skeleton-and-exports.md), [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md)
- Sub-issues:
  - [LOCAL-TBD-M6-U05-1](./LOCAL-TBD-M6-U05-1-translate-base-steps-into-recipe-local-stage-step-files.md)
  - [LOCAL-TBD-M6-U05-2](./LOCAL-TBD-M6-U05-2-compose-standard-recipe-and-tag-definitions-via-authoring-sdk.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Sequencing: translate step files first (`LOCAL-TBD-M6-U05-1`), then compose the recipe and tags (`LOCAL-TBD-M6-U05-2`).
- Child issue docs carry the detailed implementation steps.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Findings (Pending)
#### P1) Standard recipe baseline inventory (order + step ids)
- Current base recipe order (`packages/mapgen-core/src/base/recipes/default.ts`), no `instanceId` usage:
  1) `foundation`
  2) `landmassPlates`
  3) `coastlines`
  4) `storySeed`
  5) `storyHotspots`
  6) `storyRifts`
  7) `ruggedCoasts`
  8) `storyOrogeny`
  9) `storyCorridorsPre`
  10) `islands`
  11) `mountains`
  12) `volcanoes`
  13) `lakes`
  14) `climateBaseline`
  15) `storySwatches`
  16) `rivers`
  17) `storyCorridorsPost`
  18) `climateRefine`
  19) `biomes`
  20) `features`
  21) `derivePlacementInputs`
  22) `placement`
- Step implementation files to translate (base pipeline):
  - `packages/mapgen-core/src/base/pipeline/foundation/FoundationStep.ts`
  - `packages/mapgen-core/src/base/pipeline/morphology/LandmassStep.ts`
  - `packages/mapgen-core/src/base/pipeline/morphology/CoastlinesStep.ts`
  - `packages/mapgen-core/src/base/pipeline/narrative/StorySeedStep.ts`
  - `packages/mapgen-core/src/base/pipeline/narrative/StoryHotspotsStep.ts`
  - `packages/mapgen-core/src/base/pipeline/narrative/StoryRiftsStep.ts`
  - `packages/mapgen-core/src/base/pipeline/morphology/RuggedCoastsStep.ts`
  - `packages/mapgen-core/src/base/pipeline/narrative/StoryOrogenyStep.ts`
  - `packages/mapgen-core/src/base/pipeline/narrative/StoryCorridorsStep.ts` (splits into pre/post)
  - `packages/mapgen-core/src/base/pipeline/morphology/IslandsStep.ts`
  - `packages/mapgen-core/src/base/pipeline/morphology/MountainsStep.ts`
  - `packages/mapgen-core/src/base/pipeline/morphology/VolcanoesStep.ts`
  - `packages/mapgen-core/src/base/pipeline/hydrology/LakesStep.ts`
  - `packages/mapgen-core/src/base/pipeline/hydrology/ClimateBaselineStep.ts`
  - `packages/mapgen-core/src/base/pipeline/narrative/StorySwatchesStep.ts`
  - `packages/mapgen-core/src/base/pipeline/hydrology/RiversStep.ts`
  - `packages/mapgen-core/src/base/pipeline/hydrology/ClimateRefineStep.ts`
  - `packages/mapgen-core/src/base/pipeline/ecology/BiomesStep.ts`
  - `packages/mapgen-core/src/base/pipeline/ecology/FeaturesStep.ts`
  - `packages/mapgen-core/src/base/pipeline/placement/DerivePlacementInputsStep.ts`
  - `packages/mapgen-core/src/base/pipeline/placement/PlacementStep.ts`

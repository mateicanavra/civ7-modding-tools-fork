---
id: AD-HOC-refactor-layout-and-registry
title: "Refactor MapGen Layout + Registry"
state: done
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: POST-M3
assignees: []
labels: [Improvement, Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Align `@swooper/mapgen-core`’s layout with the target domain phases (foundation/morphology/hydrology/ecology/narrative/placement) and route TaskGraph execution through a standard-library registry to reduce `MapOrchestrator` coupling.

## Deliverables

- [x] Domain modules under `packages/mapgen-core/src/layers/` with per-domain `register*Layer(...)` entrypoints.
- [x] Standard library aggregator `registerStandardLibrary(...)` that registers all domain layers into a `StepRegistry`.
- [x] TaskGraph execution path in `packages/mapgen-core/src/MapOrchestrator.ts` uses `registerStandardLibrary(...)`.

## Acceptance Criteria

- [x] TaskGraph stage registration is centralized in the standard library (not scattered across orchestrator code).
- [x] Domain logic lives under `packages/mapgen-core/src/layers/<domain>/` with clear phase boundaries.
- [x] `bun run check-types`, `bun run build`, and `pnpm test:mapgen` pass.

## Testing / Verification

- `bun run check-types`
- `bun run build`
- `pnpm test:mapgen`

## Dependencies / Notes

- This is tracked locally as an ad-hoc issue doc (no Linear issue).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Checklist

This checklist is a direct record of the refactor slices executed to reach the deliverables above.

#### 1. Foundation Domain (`packages/mapgen-core/src/layers/foundation/`)

- [x] Create directory: `packages/mapgen-core/src/layers/foundation/`
- [x] Create step: `FoundationStep.ts`
- [x] Create entry: `index.ts` (exports `registerFoundationLayer`)

#### 2. Morphology Domain (`packages/mapgen-core/src/layers/morphology/`)

- [x] Create directory: `packages/mapgen-core/src/layers/morphology/`
- [x] Move `packages/mapgen-core/src/layers/landmass-plate.ts` → `packages/mapgen-core/src/layers/morphology/landmass-plate.ts`
- [x] Move `packages/mapgen-core/src/layers/landmass-utils.ts` → `packages/mapgen-core/src/layers/morphology/landmass-utils.ts`
- [x] Create `LandmassStep.ts`
- [x] Move `packages/mapgen-core/src/layers/coastlines.ts` → `packages/mapgen-core/src/layers/morphology/coastlines.ts`
- [x] Create `CoastlinesStep.ts`
- [x] Create `RuggedCoastsStep.ts`
- [x] Move `packages/mapgen-core/src/layers/islands.ts` → `packages/mapgen-core/src/layers/morphology/islands.ts`
- [x] Create `IslandsStep.ts`
- [x] Move `packages/mapgen-core/src/layers/mountains.ts` → `packages/mapgen-core/src/layers/morphology/mountains.ts`
- [x] Create `MountainsStep.ts`
- [x] Move `packages/mapgen-core/src/layers/volcanoes.ts` → `packages/mapgen-core/src/layers/morphology/volcanoes.ts`
- [x] Create `VolcanoesStep.ts`
- [x] Create entry: `index.ts` (exports `registerMorphologyLayer`)

#### 3. Hydrology Domain (`packages/mapgen-core/src/layers/hydrology/`)

- [x] Create directory: `packages/mapgen-core/src/layers/hydrology/`
- [x] Move `packages/mapgen-core/src/layers/climate-engine.ts` → `packages/mapgen-core/src/layers/hydrology/climate.ts`
- [x] Create `ClimateBaselineStep.ts`
- [x] Create `ClimateRefineStep.ts`
- [x] Create `RiversStep.ts`
- [x] Create `LakesStep.ts`
- [x] Create entry: `index.ts` (exports `registerHydrologyLayer`)

#### 4. Ecology Domain (`packages/mapgen-core/src/layers/ecology/`)

- [x] Create directory: `packages/mapgen-core/src/layers/ecology/`
- [x] Move `packages/mapgen-core/src/layers/biomes.ts` → `packages/mapgen-core/src/layers/ecology/biomes.ts`
- [x] Create `BiomesStep.ts`
- [x] Move `packages/mapgen-core/src/layers/features.ts` → `packages/mapgen-core/src/layers/ecology/features.ts`
- [x] Create `FeaturesStep.ts`
- [x] Create entry: `index.ts` (exports `registerEcologyLayer`)

#### 5. Narrative Domain (`packages/mapgen-core/src/layers/narrative/`)

- [x] Create directory: `packages/mapgen-core/src/layers/narrative/`
- [x] Create steps (`StorySeedStep.ts`, `StoryHotspotsStep.ts`, `StoryRiftsStep.ts`, `StoryOrogenyStep.ts`, `StoryCorridorsStep.ts`, `StorySwatchesStep.ts`)
- [x] Create entry: `index.ts` (exports `registerNarrativeLayer`)

#### 6. Placement Domain (`packages/mapgen-core/src/layers/placement/`)

- [x] Create directory: `packages/mapgen-core/src/layers/placement/`
- [x] Move `packages/mapgen-core/src/layers/placement.ts` → `packages/mapgen-core/src/layers/placement/placement.ts`
- [x] Create `PlacementStep.ts`
- [x] Create entry: `index.ts` (exports `registerPlacementLayer`)

#### 7. Standard Library (`packages/mapgen-core/src/layers/index.ts`)

- [x] Implement `packages/mapgen-core/src/layers/standard-library.ts` and export via `packages/mapgen-core/src/layers/index.ts`

#### 8. Cleanup (`packages/mapgen-core/src/MapOrchestrator.ts`)

- [x] TaskGraph path calls `registerStandardLibrary(...)`

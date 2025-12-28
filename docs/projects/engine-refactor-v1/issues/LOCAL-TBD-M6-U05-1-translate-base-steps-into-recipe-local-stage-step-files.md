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

### Prework Findings
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

## Implementation Decisions

### Store standard runtime state per map context
- **Context:** Steps share mutable state (west/east continents, mapInfo, start sectors, start positions) but authoring `createStep` has no runtime injection hook.
- **Options:** (A) module-level singleton runtime, (B) publish artifacts for runtime data, (C) WeakMap keyed by `ExtendedMapContext`.
- **Choice:** Option C — use a WeakMap runtime helper for per-context state.
- **Rationale:** Keeps state scoped to a run without inventing new artifact tags or global singletons.
- **Risk:** If a context is reused across runs, runtime values may persist longer than intended.

### Derive mapInfo + start-sector defaults from adapter at runtime
- **Context:** Legacy task graph precomputed mapInfo, players-per-landmass, and start sectors before registering steps.
- **Options:** (A) pass mapInfo via recipe config/settings metadata, (B) compute from `EngineAdapter` per run.
- **Choice:** Option B — compute via adapter lookup/chooseStartSectors inside runtime helper.
- **Rationale:** Matches legacy behavior without expanding recipe config surface.
- **Risk:** Adapter implementations must support lookup methods for tests; missing data falls back to defaults.

### Inline ecology layer afterRun hooks into step implementations
- **Context:** Legacy registry passed `afterRun` callbacks to biomes/features for logging and cleanup.
- **Options:** (A) keep wrapper layer to inject hooks, (B) fold hooks into step run bodies.
- **Choice:** Option B — fold hooks into step run bodies.
- **Rationale:** Keeps steps self-contained and avoids recreating registry layer plumbing.
- **Risk:** Ordering changes could be missed if future hooks are added in a different layer.

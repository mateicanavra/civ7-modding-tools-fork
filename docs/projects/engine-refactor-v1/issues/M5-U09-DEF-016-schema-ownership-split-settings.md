---
id: M5-U09
title: "[M5] DEF-016 + follow-ups: schema ownership split (and “settings” migration where it belongs)"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Split the config schema monolith into domain-owned modules and migrate cross-cutting “settings-like” fields (starting with directionality) to the proper settings boundary.

## Goal

Make config ownership and discoverability match step/domain ownership after extraction. Reduce schema friction and eliminate ad-hoc “settings embedded inside step configs.”

## Deliverables

- Split the schema monolith into domain-owned schema modules with a clear barrel/index.
- Identify and migrate “settings-like” fields embedded in step configs into the intended `RunRequest.settings` surface where practical.
- Update imports without adding new layers of indirection.

## Acceptance Criteria

- `schema.ts` is split into domain-owned schema modules with a clear barrel/index.
- Cross-cutting settings (e.g., directionality) are represented as settings, not duplicated across unrelated step configs.
- Imports are updated without creating new “schema indirection” layers.

## Testing / Verification

- Workspace typecheck/build remains green.
- Config parse/validation tests (or smoke tests) still pass for standard run.

## Dependencies / Notes

- **Paper trail:** `docs/projects/engine-refactor-v1/deferrals.md` (DEF-016) + triage “directionality settings migration” follow-up from CIV-56.
- **Sequencing:** best after extraction (M5-U02–U06) so we colocate in the final package locations.
- **Complexity × parallelism:** low–medium complexity, high parallelism (mechanical split; the “settings” boundary calls are the serialized part).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Prefer colocation that matches the final ownership boundary; avoid transient halfway schema layouts.

## Prework Findings (Complete)

Goal: map the current schema monolith into domain-owned modules (post-extraction layout) and enumerate “settings-like” fields that should move to `RunRequest.settings` (starting with directionality).

### 1) Schema split mapping (current → proposed ownership)

Current monolith:
- `packages/mapgen-core/src/config/schema.ts` exports all `*Schema` constants and assembles `MapGenConfigSchema`.

Proposed domain-owned modules (file names illustrative; final location should match post-extraction package ownership from `M5-U02–U06`):
- **Morphology schemas**
  - `ContinentBoundsSchema`
  - `Landmass*Schema` (`LandmassTectonicsConfigSchema`, `LandmassGeometry*Schema`, `LandmassConfigSchema`)
  - `OceanSeparation*Schema`
  - `Coastlines*Schema`
  - `IslandsConfigSchema`
  - `MountainsConfigSchema`
  - `VolcanoesConfigSchema`
- **Foundation schemas**
  - `FoundationSeedConfigSchema`
  - `FoundationPlatesConfigSchema`
  - `FoundationDirectionalityConfigSchema`
  - `FoundationDynamicsConfigSchema`
  - `FoundationDiagnosticsConfigSchema`
  - (evaluate `[internal]` aliases: `FoundationSurfaceConfigSchema`, `FoundationPolicyConfigSchema`, `FoundationOceanSeparationConfigSchema`)
- **Narrative / story schemas**
  - `HotspotTunablesSchema`
  - `FeaturesConfigSchema` (story tunables for features)
  - `OrogenyTunablesSchema`, `RiftTunablesSchema`
  - `ContinentalMarginsConfigSchema`
  - `StoryConfigSchema`
  - `Corridors*Schema` (`SeaCorridorPolicySchema`, `IslandHopCorridorConfigSchema`, `LandCorridorConfigSchema`, `RiverCorridorConfigSchema`, `CorridorsConfigSchema`)
- **Hydrology / climate schemas**
  - `ClimateBaseline*Schema` + `ClimateBaselineSchema`
  - `ClimateRefine*Schema` + `ClimateRefineSchema`
  - `ClimateStory*Schema` + `ClimateStorySchema`
  - `ClimateConfigSchema`
- **Ecology schemas**
  - `BiomeConfigSchema`
  - `FeaturesDensityConfigSchema`
- **Placement schemas**
  - `FloodplainsConfigSchema`
  - `StartsConfigSchema`
  - `PlacementConfigSchema`
- **Top-level assembly**
  - `FoundationConfigSchema` (may move to foundation module)
  - `DiagnosticsConfigSchema` (legacy/no-op; candidate for deletion in `M5-U07`)
  - `MapGenConfigSchema` (final assembly “barrel” that imports domain-owned schemas)

Mechanical extraction approach:
- Split into per-domain files first, then keep a thin `schema.ts` barrel as the single public schema entrypoint for the standard mod.
- Avoid introducing extra indirection layers (no “schema registry”); prefer direct imports from domain-owned modules.

### 2) “Settings-like” fields embedded in step configs (directionality)

Directionality today:
- Defined as part of foundation config: `FoundationDirectionalityConfigSchema` → `foundation.dynamics.directionality`.
- Threaded into multiple step configs by the standard run-request builder:
  - `packages/mapgen-core/src/orchestrator/task-graph.ts` injects `foundation.dynamics.directionality` into:
    - `climateRefine`
    - `storyRifts`
    - `storyCorridorsPre` / `storyCorridorsPost`
    - `storySwatches`
- Step config schemas explicitly model the nested directionality block:
  - `packages/mapgen-core/src/pipeline/hydrology/ClimateRefineStep.ts`
  - `packages/mapgen-core/src/pipeline/narrative/StoryCorridorsStep.ts`
  - `packages/mapgen-core/src/pipeline/narrative/StorySwatchesStep.ts`
  - `packages/mapgen-core/src/pipeline/narrative/StoryRiftsStep.ts`

Recommended target home:
- Move directionality to `RunRequest.settings.directionality` (cross-cutting run-level setting).
- Keep `foundation.dynamics.directionality` as “foundation internal config” only to the extent it truly affects foundation tensor production (plate generation + wind/currents), but stop duplicating it in unrelated step configs.

### 3) Migration risks / sequencing notes

Backward compatibility risk:
- Moving directionality out of step configs and/or deleting legacy schema aliases is a breaking config-shape change for any mod configs outside this repo that rely on the old nesting.

Suggested sequencing:
- Do the schema split after extraction (`M5-U02–U06`) so the new files land in their final owner packages.
- Handle directionality boundary changes as an explicit, reviewed sub-slice (it affects multiple steps + the run-request builder).

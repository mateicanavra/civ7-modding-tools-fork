---
id: LOCAL-M3-BIOMES-FEATURES-WRAPPER
title: "[M3] Biomes & Features Step Wrapper (Consume Canonical Products)"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Ecology, Architecture]
parent: null
children: []
blocked_by: [LOCAL-M3-TASK-GRAPH-MVP, LOCAL-M3-HYDROLOGY-PRODUCTS, LOCAL-M3-STORY-SYSTEM]
blocked: [LOCAL-M3-PLACEMENT-WRAPPER]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Wrap biomes + features as Task Graph steps that consume canonical climate/story products and publish stable outputs for placement, without changing generation algorithms.

## Deliverables

- [ ] Implement `LegacyBiomesStep` and `LegacyFeaturesStep` wrappers as `MapGenStep`s with explicit `requires/provides`.
- [ ] Migrate rainfall/moisture reads to canonical `ClimateField` (avoid new direct `GameplayMap.getRainfall()` reads in modernized code paths).
- [ ] Consume narrative signals via canonical overlays (`StoryOverlays`) or a derived compatibility layer (avoid introducing new global-story dependencies).

## Acceptance Criteria

- [ ] Biomes/features stages run as steps via `PipelineExecutor` with explicit contracts
- [ ] No direct `GameplayMap` reads for rainfall/moisture data in modernized code paths
- [ ] Biome/feature distribution matches current orchestrator output (wrap-first; no algorithm changes)
- [ ] Steps fail fast if required products (`climatefield`, `storyoverlays`) are missing
- [ ] Both steps declare `requires`/`provides` that accurately reflect their dependencies

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`

## Dependencies / Notes

- **System area:** Ecology cluster (biomes/features) pipeline boundary + consumer reads.
- **Change:** Wrap existing `layers/biomes.ts` + `layers/features.ts` behavior as steps and make them consume canonical products.
- **Outcome:** Placement can depend on stable “biomes/features done” contracts; ecology becomes step-composable.
- **Scope guardrail:** Wrap-first only; do not retune or change biome/feature algorithms in M3.
- **Depends on:** `LOCAL-M3-TASK-GRAPH-MVP`, `LOCAL-M3-HYDROLOGY-PRODUCTS`, `LOCAL-M3-STORY-SYSTEM`.
- **Blocks:** `LOCAL-M3-PLACEMENT-WRAPPER`.
- **Historical:** `CIV-19` is archived and complete; this issue is step-wrapping + product consumption, not adapter wiring.
- **Open questions (track here):**
  - Contract keys: should `requires/provides` use `ClimateField`/`StoryOverlays`/`Biomes`/`Features` (recommended) vs lowercased keys? Must be consistent with the executor.
  - Rivers: do biomes/features require an explicit river product beyond `EngineAdapter.isAdjacentToRivers()` and climate buffers?
  - Heightfield: should this step declare `requires` on `Heightfield` (elevation/land mask) given some heuristics read elevation?

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Key Files (Expected)

- `packages/mapgen-core/src/steps/` (new: wrapper steps; exact location TBD)
- `packages/mapgen-core/src/layers/biomes.ts` (modify: read rainfall from context buffers/fields when available)
- `packages/mapgen-core/src/layers/features.ts` (modify: read rainfall from context buffers/fields when available)

### Design Notes

- Steps should be thin wrappers that delegate to existing logic
- Consumer migration can be incremental: start with wrapper, then migrate internal reads
- Keep existing function signatures for compatibility during transition

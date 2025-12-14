---
id: CIV-44
title: "[M3] Biomes & Features Step Wrapper (Consume Canonical Artifacts)"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Ecology, Architecture]
parent: null
children: []
blocked_by: [CIV-41, CIV-42, CIV-43]
blocked: [CIV-45]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Wrap biomes + features as Task Graph steps that consume canonical climate/story **artifacts** and publish stable outputs for placement, without changing generation algorithms.

## Deliverables

- [ ] Implement `LegacyBiomesStep` and `LegacyFeaturesStep` wrappers as `MapGenStep`s with explicit `requires/provides`.
- [ ] Migrate rainfall/moisture reads to canonical `ClimateField` (avoid new direct `GameplayMap.getRainfall()` reads in modernized code paths).
- [ ] Consume narrative signals via canonical overlays (`StoryOverlays`); if any legacy reads require `StoryTags`, keep them strictly derived from overlays (tracked in `docs/projects/engine-refactor-v1/deferrals.md` DEF-002).

## Acceptance Criteria

- [ ] Biomes/features stages run as steps via `PipelineExecutor` with explicit contracts
- [ ] No direct `GameplayMap` reads for rainfall/moisture data in modernized code paths
- [ ] Biome/feature distribution matches current orchestrator output (wrap-first; no algorithm changes)
- [ ] Steps fail fast if required dependency tags are missing (e.g., `artifact:climateField`, `artifact:storyOverlays`)
- [ ] Both steps declare `requires`/`provides` that accurately reflect their dependencies

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`

## Dependencies / Notes

- **System area:** Ecology cluster (biomes/features) pipeline boundary + consumer reads.
- **Change:** Wrap existing `layers/biomes.ts` + `layers/features.ts` behavior as steps and make them consume canonical artifacts.
- **Outcome:** Placement can depend on stable “biomes/features done” contracts; ecology becomes step-composable.
- **Scope guardrail:** Wrap-first only; do not retune or change biome/feature algorithms in M3.
- **Depends on:** CIV-41, CIV-42, CIV-43.
- **Blocks:** CIV-45.
- **Historical:** `CIV-19` is archived and complete; this issue is step-wrapping + artifact consumption, not adapter wiring.
- **Locked decisions for M3 (remove ambiguity):**
  - **Contract keys:** Standardize on prefixed dependency tags (`artifact:*`, `field:*`, `state:*`) per `docs/system/libs/mapgen/architecture.md`.
  - **Rivers input:** Do not make direct `EngineAdapter.isAdjacentToRivers()` calls inside biomes/features in M3; consume `artifact:riverAdjacency` from CIV-42.
  - **Heightfield dependency:** Declare `requires: [artifact:heightfield]` (or the equivalent heightfield/elevation artifact tag used by the spine) since biome/feature heuristics read elevation/land mask signals.

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

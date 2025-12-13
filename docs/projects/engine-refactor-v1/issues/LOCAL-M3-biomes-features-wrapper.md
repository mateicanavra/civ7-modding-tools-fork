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

Wrap biomes and features stages as `MapGenStep`s that consume canonical data products (`ClimateField`, `StoryOverlays`, river product) rather than mixed reads from `GameplayMap`/globals. This completes the ecology cluster's migration to the Task Graph architecture without changing generation algorithms.

## Context & Motivation

Biomes and features stages currently run through the orchestrator and read climate/story data via mixed paths:

- Some data via `GameplayMap` reads
- Some via globals
- Some via context

This inconsistency makes dependencies implicit and testing difficult. To achieve the Task Graph architecture, these stages must become `MapGenStep`s that:

- Declare their dependencies explicitly via `requires`
- Consume canonical products (`ClimateField`, `StoryOverlays`, river product)
- Publish their outputs via `provides` for downstream consumers

**Important:** Adapter-boundary biomes/features wiring landed in M1 (`CIV-19`, archived). This M3 work is about Task Graph step-wrapping + consuming canonical products, not re-doing adapter integration.

## Capability Unlocks

- Biomes/features logic becomes testable in isolation with mock contexts
- Dependencies are explicit and validated at runtime
- Steps can be reordered or replaced by mods
- Clear contract for what data biomes/features need and what they produce

## Deliverables

- [ ] **`LegacyBiomesStep` wrapper**
  - Implements `MapGenStep` interface
  - Calls existing `designateEnhancedBiomes` logic
  - Declares `requires: ["climatefield", "storyoverlays"]`
  - Declares `provides: ["biomes"]`

- [ ] **`LegacyFeaturesStep` wrapper**
  - Implements `MapGenStep` interface
  - Calls existing `addDiverseFeatures` logic
  - Declares `requires: ["climatefield", "storyoverlays", "biomes"]`
  - Declares `provides: ["features"]`

- [ ] **Consumer migration: rainfall/moisture**
  - Internal logic updated to read rainfall/moisture from `ClimateField` product
  - No direct `GameplayMap` reads for climate data in modernized code paths

- [ ] **Consumer migration: story tags**
  - Internal logic updated to read story tags from `StoryOverlays` product
  - No direct `StoryTags` reads in modernized code paths

## Acceptance Criteria

- [ ] Biomes/features stages run as steps via `PipelineExecutor` with explicit contracts
- [ ] No direct `GameplayMap` reads for rainfall/moisture data in modernized code paths
- [ ] Biome/feature distribution matches current orchestrator output (wrap-first; no algorithm changes)
- [ ] Steps fail fast if required products (`climatefield`, `storyoverlays`) are missing
- [ ] Both steps declare `requires`/`provides` that accurately reflect their dependencies

## Out of Scope

- Changing biome/feature generation algorithms (wrap-first only)
- Re-tuning biome/feature distribution parameters
- New biome types or features not present in current implementation

## Open Questions & Considerations

- **River product consumption:** Do biomes/features need river summary data beyond what's in `ClimateField`? If so, add to `requires`.
- **Heightfield consumption:** Should biomes/features declare `requires: ["heightfield"]` for elevation-based decisions, or is this already implicit via the current flow?

## Dependencies & Relationships

**Depends on:**
- `LOCAL-M3-TASK-GRAPH-MVP` (Stack 1): Pipeline primitives must exist
- `LOCAL-M3-HYDROLOGY-PRODUCTS` (Stack 2): `ClimateField` product must be canonical
- `LOCAL-M3-STORY-SYSTEM` (Stack 3): `StoryOverlays` product must be canonical

**Blocks:**
- `LOCAL-M3-PLACEMENT-WRAPPER` (Stack 5): Placement consumes biomes/features products

**Historical context:**
- `CIV-19` (archived): Adapter-boundary biomes/features wiring (M1 complete)

## Risk Controls

- **Branch safety:** Ensure biomes/features behavior stays coherent while consumers move to canonical products
- **No algorithm swaps:** Wrapper-first approach preserves current behavior
- **Fallback:** Current orchestrator path remains available during transition

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

### Key Files (Expected)

- `packages/mapgen-core/src/steps/legacy-biomes.ts` (new: wrapper step)
- `packages/mapgen-core/src/steps/legacy-features.ts` (new: wrapper step)
- `packages/mapgen-core/src/layers/biomes-enhanced.ts` (modify: consume ClimateField)
- `packages/mapgen-core/src/layers/features-diverse.ts` (modify: consume StoryOverlays)

### Design Notes

- Steps should be thin wrappers that delegate to existing logic
- Consumer migration can be incremental: start with wrapper, then migrate internal reads
- Keep existing function signatures for compatibility during transition

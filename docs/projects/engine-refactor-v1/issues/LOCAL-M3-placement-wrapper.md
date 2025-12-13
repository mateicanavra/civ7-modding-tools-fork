---
id: LOCAL-M3-PLACEMENT-WRAPPER
title: "[M3] Placement Step Wrapper (Consume Canonical Products)"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Placement, Architecture]
parent: null
children: []
blocked_by: [LOCAL-M3-BIOMES-FEATURES-WRAPPER]
blocked: [LOCAL-M3-CONFIG-EVOLUTION]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Wrap placement as a `MapGenStep` that consumes canonical data products from all prior phases (foundation, morphology, hydrology, ecology). This is the final generation phase and the most cross-cutting step in the pipeline—it touches biomes, features, rivers, terrain, and climate. Completing this wrapper finalizes Phase B of M3.

## Context & Motivation

Placement is the final generation phase, consuming outputs from all prior phases:

- Foundation: terrain base, plate boundaries
- Morphology: heightfield, mountains, coastlines
- Hydrology: rivers, rainfall, moisture
- Ecology: biomes, features

Currently it runs through the orchestrator with mixed data reads from `GameplayMap`, globals, and partial context access. To complete the Task Graph migration, placement must become a `MapGenStep` that explicitly declares its cross-cutting dependencies and consumes canonical products.

**Important:** Placement adapter integration (`CIV-20`, archived) and map-size awareness (`CIV-22`, archived) landed in M1. This M3 work is about Task Graph step-wrapping + consuming canonical products, not redoing those fixes.

## Capability Unlocks

- Placement logic becomes testable in isolation with mock contexts
- All placement dependencies are explicit and validated at runtime
- Clear visibility into what data placement consumes
- Foundation for custom placement logic by mods

## Deliverables

- [ ] **`LegacyPlacementStep` wrapper**
  - Implements `MapGenStep` interface
  - Calls existing `runPlacement` logic
  - Declares `requires: ["heightfield", "climatefield", "storyoverlays", "biomes", "features"]`
  - Declares `provides: ["placement"]`

- [ ] **Consumer migration: biomes/features**
  - Internal logic updated to read biomes/features from canonical products
  - No ad-hoc reads from intermediate state

- [ ] **Consumer migration: terrain/elevation**
  - Placement reads terrain/elevation via `Heightfield` product where applicable

- [ ] **Preserve existing outputs (wrap-first)**
  - Floodplains logic preserved
  - Natural wonders logic preserved
  - Start positions logic preserved

## Acceptance Criteria

- [ ] Placement stage runs as a step via `PipelineExecutor` with explicit contracts
- [ ] All placement outputs (starts, wonders, floodplains) match current orchestrator behavior
- [ ] Step fails fast if any required products are missing
- [ ] No silent degradation of placement quality due to missing dependencies
- [ ] Step declares `requires`/`provides` that accurately reflect its cross-cutting dependencies

## Out of Scope

- Changing placement algorithms (wrap-first only)
- Re-tuning start position or natural wonder placement parameters
- New placement features not present in current implementation

## Open Questions & Considerations

- **River product requirement:** Does placement need direct river data, or is it sufficient via biomes/features that already consumed hydrology?
- **Cross-cutting dependency list:** Is `["heightfield", "climatefield", "storyoverlays", "biomes", "features"]` the complete set, or are there additional implicit dependencies?
- **Adapter reads:** Which placement reads should remain adapter-boundary (engine-owned) vs. canonical product reads?

## Dependencies & Relationships

**Depends on:**
- `LOCAL-M3-BIOMES-FEATURES-WRAPPER` (Stack 4): Must have biomes/features as canonical products

**Blocks:**
- `LOCAL-M3-CONFIG-EVOLUTION` (Stack 6): All step wrappers should be in place before config cutover

**Historical context:**
- `CIV-20` (archived): Placement adapter integration (M1 complete)
- `CIV-22` (archived): Map-size awareness (M1 complete)

## Risk Controls

- **Branch safety:** Keep placement behavior stable while switching reads to canonical products
- **Late-phase integration:** Placement is highly cross-cutting; treat this as a late-phase integration cut
- **No algorithm swaps:** Wrapper-first approach preserves current behavior
- **Fallback:** Current orchestrator path remains available during transition

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

### Key Files (Expected)

- `packages/mapgen-core/src/steps/legacy-placement.ts` (new: wrapper step)
- `packages/mapgen-core/src/layers/placement.ts` (modify: consume canonical products)

### Design Notes

- Most cross-cutting step in the pipeline—validate dependency list carefully
- Start with wrapper, then incrementally migrate internal reads
- Placement touches many subsystems—be thorough about identifying all implicit dependencies

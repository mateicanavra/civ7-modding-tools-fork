# M3: Core Engine Refactor & Config Shape Evolution

**Milestone ID:** `M3-core-engine-refactor-config-evolution`  
**Status:** Planned  
**Owner:** Engineering  

> Note: Scope and exact issue mapping for this milestone may be revisited as we get closer to implementation. Treat this doc as a living plan that should be updated once work starts.

## Summary

Extend the task-graph architecture from the foundation slice to the full engine, while reshaping configuration to match the long-term design. This milestone is where most of the **core refactoring** happens (beyond the initial slice): pipeline-izing legacy phases, solidifying data products, and evolving `MapGenConfig`.

This milestone corresponds to **Milestone 3** in `PROJECT-engine-refactor-v1.md`.

## Objectives

- Make all major stages (foundation, morphology, hydrology/climate, narrative overlays, biomes, placement) run as pipeline steps with explicit `requires`/`provides`.
- Evolve `MapGenConfig` from the Phase 1 “hygiene” shape into a step-aligned, phase-aware configuration surface.
- Establish `FoundationContext`, `Heightfield`, `ClimateField`, and `StoryOverlays` as canonical data products across the engine.

## Scope

### Dependencies & Sequencing

- This milestone assumes:
  - **M1** has effectively completed the bulk of the TypeScript migration and package layout.
  - **M2** has delivered:
    - Phase 1 “Config Hygiene” from `resources/PRD-config-refactor.md`.
    - A validated-config + foundation slice driven by `MapOrchestrator`, with the modern foundation/plate stack integrated behind it.
- Within that baseline, M3 is responsible for:
  - Introducing the generic pipeline primitives (`MapGenStep`, `StepRegistry`, `PipelineExecutor`) on top of the stabilized data products.
  - Driving **Phase 2 & 3** of the config refactor (config integration + shape evolution).
  - Generalizing the pipeline from the foundation slice to all major clusters (morphology, hydrology/climate, overlays, biomes, placement).
  - Promoting the shared data products (`FoundationContext`, `Heightfield`, `ClimateField`, `StoryOverlays`) to canonical status across the engine.
- Detailed behavior and requirements remain in the feature PRDs:
  - Config: `resources/PRD-config-refactor.md` (Phase 2 & 3).
  - Pipeline: `resources/PRD-pipeline-refactor.md`.
  - Plates/foundation: `resources/PRD-plate-generation.md`.

### 1. Config Integration & Shape Evolution

- Ensure `MapGenContext` consistently carries `config: MapGenConfig` and that new steps read config via context rather than globals or tunables.
- Map domain-specific configs (e.g., `PlateGenerationConfig`) into sub-schemas of `MapGenConfig`.
- Flatten and rationalize config groups into step/phase-aligned sections such as:
  - `plates`, `landmass`, `mountains`, `volcanoes`
  - `climate`, `rivers`, `humidity`
  - `story`, `corridors`, `overlays`
  - `placement`, `diagnostics`
- Provide adapters for older config shapes where needed to avoid breaking existing Swooper map scripts immediately.

Related PRD: `resources/PRD-config-refactor.md` (Phase 2 & 3)

### 2. Pipeline Generalization

- Wrap legacy hydrology, climate, narrative overlays, biomes, and placement logic as `MapGenStep`s:
  - e.g., `LegacyHydrologyStep`, `LegacyClimateStep`, `LegacyBiomesStep`, `LegacyPlacementStep`.
- Gradually refactor internal logic to:
  - Consume `MapGenContext` artifacts (`Heightfield`, `ClimateField`, `StoryOverlays`).
  - Avoid direct `WorldModel` access in new/modernized code.
- Enforce phase boundaries (`setup`, `foundation`, `morphology`, `hydrology`, `ecology`, `placement`) and explicit `requires`/`provides` metadata on steps.

Related PRD: `resources/PRD-pipeline-refactor.md`

### 3. Data Products & Cluster Alignment

- Solidify the topology described in `PROJECT-engine-refactor-v1.md`:
  - Cluster stages by foundation, morphology, hydrology/climate, overlays, biomes/features, placement.
  - Ensure clusters consume and produce the expected data products.
- Make `FoundationContext`, `Heightfield`, `ClimateField`, and `StoryOverlays` the authoritative sources for downstream logic.
- Reduce or eliminate ad-hoc reads from `GameplayMap` and `StoryTags` in modernized stages.

Related system docs:

- `../../system/libs/mapgen/architecture.md`
- `../../system/libs/mapgen/foundation.md`
- `../../system/libs/mapgen/design.md`

### Parity Matrix & Follow-Up Issues

The JS-to-TS parity documents remain the canonical source of remaining behavioral gaps and intentional divergences:

- `resources/STATUS-M-TS-parity-matrix.md`
- `resources/STATUS-M-TS-typescript-migration-parity-notes.md`

As part of M3 (and, where appropriate, M4), we may break specific `Missing` and `Detraction / Open` rows from these docs into concrete issues targeting the relevant clusters (story/overlays, biomes/features, placement, etc.). The parity docs should stay canonical; issues should link back to them rather than duplicating the full matrix.

## Acceptance Criteria

- Major engine phases are represented as pipeline steps with clear dependency contracts.
- `MapGenConfig` reflects the engine’s phase/step structure and is used consistently via `MapGenContext`.
- Legacy tunables are either retired or reduced to a small compatibility layer.
- Downstream stages consume data products (e.g., `ClimateField`, `StoryOverlays`) rather than hard-coded globals.

## Candidate Issues / Deliverables

> These mappings are tentative and may be adjusted when the milestone is scheduled.

- Migration of remaining legacy story/climate/biome/placement code into steps:
  - CIV-19: Biomes & features adapter (`../issues/CIV-19-biomes-features-adapter.md`)
  - CIV-20: Placement adapter (`../issues/CIV-20-placement-adapter.md`)
  - CIV-21: Story tagging & overlays (`../issues/CIV-21-story-tagging.md`)
  - CIV-22: Map size awareness (`../issues/CIV-22-map-size-awareness.md`)
- Any new issues spawned from the parity matrix or config refactor PRD that touch multiple phases.

These may be split or reassigned across milestones as we refine the execution plan.

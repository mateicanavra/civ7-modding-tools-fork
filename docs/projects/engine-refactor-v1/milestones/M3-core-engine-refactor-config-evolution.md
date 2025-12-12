# M3: Core Engine Refactor & Config Shape Evolution

**Milestone ID:** `M3-core-engine-refactor-config-evolution`  
**Status:** Planned  
**Owner:** Engineering  

> Note: Scope and exact issue mapping for this milestone may be revisited as we get closer to implementation. Treat this doc as a living plan that should be updated once work starts.
>
> **Backlog state (draft):** This milestone is not yet fully grouped into formal issues. The “Draft Task Backlog” stubs below are rough M3 candidates only.
> - Each stub must be triaged before work starts to decide whether to create a real issue, change scope, or intentionally skip/deprecate parity.
> - Do not treat the stubs as committed scope until they are promoted into issue docs and scheduled.

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

**Story system note:** Minimal story parity (margins/hotspots/rifts ± orogeny) is restored in M2 via orchestrator stages. M3 owns the **remaining** story system (corridors, swatches, paleo, canonical overlay products) and the migration of story logic into Task Graph steps.

Related system docs:

- `../../system/libs/mapgen/architecture.md`
- `../../system/libs/mapgen/foundation.md`
- `../../system/libs/mapgen/design.md`

### Parity Matrix & Follow-Up Issues

The JS-to-TS parity documents remain the canonical source of remaining behavioral gaps and intentional divergences:

- `resources/STATUS-M-TS-parity-matrix.md`
- `resources/STATUS-M-TS-typescript-migration-parity-notes.md`

As part of M3 (and, where appropriate, M4), we may break specific `Missing` and `Detraction / Open` rows from these docs into concrete issues targeting the relevant clusters (story/overlays, biomes/features, placement, etc.). The parity docs should stay canonical; issues should link back to them rather than duplicating the full matrix.

### Draft Task Backlog (Not Yet Issues)

> Rough candidate tasks to be reviewed and promoted into real issues (or explicitly deprecated) when M3 is scheduled.

- **Pipeline generalization beyond foundation**
  - What/why: Extend `MapGenStep`/`PipelineExecutor` from the stabilized foundation slice to legacy clusters (morphology, hydrology/climate, overlays, biomes, placement), initially via wrapper steps, to unlock full Task Graph orchestration.
  - Open questions: How far do we go with “wrapper only” vs. internal refactors per cluster in M3? Which clusters must be fully native to hit M3 acceptance vs. can stay legacy‑wrapped?
  - Sources: `resources/PRD-pipeline-refactor.md`, `../../system/libs/mapgen/architecture.md`, pipeline skeleton issues `../issues/LOCAL-TBD-foundation-step-1-pipeline.md` through step‑5.

- **Config integration into `MapGenContext` (Phase 2)**
  - What/why: Make validated `MapGenConfig` the single read path for all steps via context, and map legacy groupings into canonical sub‑schemas.
  - Open questions: Which legacy groups should be preserved via adapters vs. removed outright? Any config groups that should be deprecated instead of parity?
  - Sources: `resources/PRD-config-refactor.md` (Phase 2), `resources/config-wiring-status.md`, `resources/PRD-plate-generation.md`.

- **Config shape evolution + tunables retirement (Phase 3)**
  - What/why: Reshape config to step/phase‑aligned sections, introduce compatibility shims where needed, and retire most legacy tunables as primary config stores.
  - Open questions: What minimal tunables surface remains for Swooper compatibility? What’s the cutover/migration plan for existing map entries?
  - Sources: `resources/PRD-config-refactor.md` (Phase 3), `resources/config-wiring-status.md`, `packages/mapgen-core/src/config/schema.ts` comments.

- **Presets/recipes and canonical BASE_CONFIG**
  - What/why: Make the `presets` field real by defining a canonical base config + recipe resolution model; enable named presets to supply per‑stage overrides coherently.
  - Open questions: Do we want full parity with legacy preset semantics, or simplify/deprecate the field? Where should resolution live (bootstrap vs. pipeline pre‑step)?
  - Sources: `resources/PRD-config-refactor.md`, `resources/config-wiring-status.md` (`presets` currently unused).

- **Canonical data products across clusters**
  - What/why: Formalize and standardize product shapes (`Heightfield`, `ClimateField`, `StoryOverlays`, plus any hydrology/biome products), and ensure legacy wrappers read/write through these products.
  - Open questions: Which products must be finalized in M3 vs. deferred to M4? Any products we should intentionally redesign rather than parity?
  - Sources: `PROJECT-engine-refactor-v1.md` topology, `resources/PRD-pipeline-refactor.md`, `../../system/libs/mapgen/foundation.md`, `resources/STATUS-M-TS-parity-matrix.md`.

- **Collapse the adapter boundary**
  - What/why: Extend `EngineAdapter` to cover map‑init responsibilities and delete the internal `OrchestratorAdapter` so implementation matches `architecture.md`.
  - Open questions: Any Civ7‑specific init behaviors that should stay outside the engine boundary? What’s the minimum API to support non‑Civ7 adapters later?
  - Sources: `../../system/libs/mapgen/architecture.md`, adapter boundary note in `M2-stable-engine-slice.md`.

- **StageManifest dependency semantics**
  - What/why: Start using `requires`/`provides` meaningfully on steps and ensure stage ordering/dependency graphs are validated at least in dev mode.
  - Open questions: Is runtime enforcement owned by late M3 or M4? Do we keep `requires/provides` parity with legacy stage toggles or rethink dependencies?
  - Sources: `resources/PRD-pipeline-refactor.md`, `resources/config-wiring-status.md` (`requires/provides` currently unused), M4 validation scope in `M4-tests-validation-cleanup.md`.

- **Config parity “keep vs. deprecate” decisions**
  - What/why: Resolve remaining config wiring gaps that affect behavior or diagnostics, and explicitly decide parity vs. deprecation for dead/legacy fields.
  - Open questions: Decide on at least: top‑level diagnostics flags vs. `diagnostics.*`; `foundation.seed.*` fields; `oceanSeparation.respectSeaLanes`; other `Missing` rows in `config-wiring-status.md`.
  - Sources: `resources/config-wiring-status.md`, `resources/PRD-config-refactor.md`, M2 outcomes in `M2-stable-engine-slice.md`.

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
  - CIV-21: Full story port parent (`../issues/CIV-21-story-tagging.md`)
    - Remaining M3 portion: `LOCAL-M3-STORY-SYSTEM` (`../issues/LOCAL-M3-story-system.md`)
  - CIV-22: Map size awareness (`../issues/CIV-22-map-size-awareness.md`)
- Any new issues spawned from the parity matrix or config refactor PRD that touch multiple phases.

These may be split or reassigned across milestones as we refine the execution plan.

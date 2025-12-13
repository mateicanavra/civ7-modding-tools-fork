# M3: Core Engine Refactor & Config Shape Evolution

**Milestone ID:** `M3-core-engine-refactor-config-evolution`  
**Status:** Planned  
**Owner:** Engineering  

> Note: M3 scope is **locked** (see Objectives + Scope). Issue IDs/titles and parent/child splits are still to be minted, but the work itself is no longer “optional”.
>
> **Backlog state (draft):** This milestone is not yet fully grouped into formal issues. The “Draft Task Backlog” section is retained as context/checklist, but should not be read as “scope negotiation”.

## Summary

Extend the task-graph architecture from the foundation slice to the full engine, while reshaping configuration to match the long-term design. This milestone is where most of the **core refactoring** happens (beyond the initial slice): pipeline-izing legacy phases, solidifying data products, and evolving `MapGenConfig`.

This milestone corresponds to **Milestone 3** in `PROJECT-engine-refactor-v1.md`.

**Milestone boundary note:** M3 owns config/behavior work that is tightly coupled to Task Graph primitives (`MapGenStep`, `PipelineExecutor`, `requires/provides`) and canonical data products, where wiring early would risk double‑refactoring. Stable‑slice config correctness that is meaningful in the current orchestrator flow (foundation + minimal story + diagnostics) is handled in M2.

## Objectives

- Make all major stages (foundation, morphology, hydrology/climate, narrative overlays, biomes, placement) run as pipeline steps with explicit `requires`/`provides`.
- Enforce `requires`/`provides` at runtime (fail-fast gating), so contract violations cannot silently limp through generation.
- Evolve `MapGenConfig` from the Phase 1 “hygiene” shape into a step-aligned, phase-aware configuration surface.
- Establish `FoundationContext`, `Heightfield`, `ClimateField`, and `StoryOverlays` as canonical data products across the engine.
- **Scope guardrail:** M3 is wrap‑first. Do not introduce new geomorphology/hydrology algorithms (e.g., stream power erosion, ocean currents, cryosphere, pedology); preserve current map quality by wrapping existing/engine behavior first.

## Scope

### Dependencies & Sequencing

- This milestone assumes:
  - **M1** has effectively completed the bulk of the TypeScript migration and package layout.
  - **M2** has delivered:
    - Phase 1 “Config Hygiene” from `resources/PRD-config-refactor.md`.
    - A validated-config + foundation slice driven by `MapOrchestrator`, with the modern foundation/plate stack integrated behind it.
- Within that baseline, M3 is responsible for:
  - Introducing the generic pipeline primitives (`MapGenStep`, `StepRegistry`, `PipelineExecutor`) on top of the stabilized data products.
  - Making `requires`/`provides` meaningful and enforced (runtime gating) so step contracts are real, not aspirational.
  - Driving **Phase 2 & 3** of the config refactor (config integration + shape evolution).
  - Generalizing the pipeline from the foundation slice to all major clusters (morphology, hydrology/climate, overlays, biomes, placement).
  - **Morphology posture:** wrap-first in M3; selective sub-step replacement is an explicit post‑M3 pathway once products + tests stabilize.
  - Promoting the shared data products (`FoundationContext`, `Heightfield`, `ClimateField`, `StoryOverlays`) to canonical status across the engine.
  - Collapsing the adapter boundary (`EngineAdapter` absorbs map-init; `OrchestratorAdapter` removed) to match the documented architecture.
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
  - Prefer migrating in-repo callers and presets/recipes to the new shape within the M3 stack; only keep a compatibility adapter if we intentionally commit to it as a post‑M3 deprecation path.

Related PRD: `resources/PRD-config-refactor.md` (Phase 2 & 3)

### 2. Pipeline Generalization

- Wrap legacy hydrology, climate, narrative overlays, biomes, and placement logic as `MapGenStep`s:
  - e.g., `LegacyHydrologyStep`, `LegacyClimateStep`, `LegacyBiomesStep`, `LegacyPlacementStep`.
- **Hydrology intent (M3):** treat hydrology as a wrapper over engine river modeling plus existing TS climate layers; the unlock is productization (publish river flow/summary data) and migration of consumers off `GameplayMap` toward `ClimateField`/overlays.
- Gradually refactor internal logic to:
  - Consume `MapGenContext` artifacts (`Heightfield`, `ClimateField`, `StoryOverlays`).
  - Avoid direct `WorldModel` access in new/modernized code.
- Enforce phase boundaries (`setup`, `foundation`, `morphology`, `hydrology`, `ecology`, `placement`) and explicit `requires`/`provides` metadata on steps.
- Gate execution at runtime using declared `requires`/`provides` (fail-fast), rather than only documenting dependencies.

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
- `../../system/libs/mapgen/morphology.md`
- `../../system/libs/mapgen/hydrology.md`
- `../../system/libs/mapgen/ecology.md`
- `../../system/libs/mapgen/narrative.md`

### Parity Matrix & Follow-Up Issues

The JS-to-TS parity documents remain the canonical source of remaining behavioral gaps and intentional divergences:

- `resources/STATUS-M-TS-parity-matrix.md`
- `resources/STATUS-M-TS-typescript-migration-parity-notes.md`

As part of M3 (and, where appropriate, M4), we may break specific `Missing` and `Detraction / Open` rows from these docs into concrete issues targeting the relevant clusters (story/overlays, biomes/features, placement, etc.). The parity docs should stay canonical; issues should link back to them rather than duplicating the full matrix.

### Draft Task Backlog (Not Yet Issues)

> These are scoped M3 workstreams that will be promoted into real issues when M3 is scheduled. “Open questions” here are packaging/shape details, not “should we do this in M3?”.

- **Pipeline generalization beyond foundation**
  - What/why: Extend `MapGenStep`/`PipelineExecutor` from the stabilized foundation slice to legacy clusters (morphology, hydrology/climate, overlays, biomes, placement), initially via wrapper steps, to unlock full Task Graph orchestration.
  - Open questions: What is the minimal wrapper boundary per cluster that yields clean `requires`/`provides` and canonical product read/write paths without changing generation algorithms?
  - Sources: `resources/PRD-pipeline-refactor.md`, `../../system/libs/mapgen/architecture.md`, pipeline skeleton issues `../issues/LOCAL-TBD-foundation-step-1-pipeline.md` through step‑5.

- **Config integration into `MapGenContext` (Phase 2)**
  - What/why: Make validated `MapGenConfig` the single read path for all steps via context, and map legacy groupings into canonical sub‑schemas.
  - Open questions: What is the minimal Phase 2 mapping that enables Phase 3 shape evolution and tunables retirement without leaving hidden global reads?
  - Sources: `resources/PRD-config-refactor.md` (Phase 2), `resources/config-wiring-status.md`, `resources/PRD-plate-generation.md`.

- **Config shape evolution + tunables retirement (Phase 3)**
  - What/why: Reshape config to step/phase‑aligned sections and retire most legacy tunables as primary config stores. Any compatibility shims should be explicitly time‑boxed and removed by M3 ship unless we intentionally adopt a post‑M3 deprecation path.
  - Open questions: What is the cutover plan for existing in-repo callers and presets/recipes so the new config shape is the supported path at M3 ship?
  - Sources: `resources/PRD-config-refactor.md` (Phase 3), `resources/config-wiring-status.md`, `packages/mapgen-core/src/config/schema.ts` comments.

- **Presets/recipes and canonical BASE_CONFIG**
  - What/why: Make the `presets` field real by defining a canonical base config + recipe resolution model; enable named presets to supply per‑stage overrides coherently.
  - Open questions: Do we want full parity with legacy preset semantics, or simplify/deprecate the field? Where should resolution live (bootstrap vs. pipeline pre‑step)?
  - Sources: `resources/PRD-config-refactor.md`, `resources/config-wiring-status.md` (`presets` currently unused).

- **Canonical data products across clusters**
  - What/why: Formalize and standardize product shapes (`Heightfield`, `ClimateField`, `StoryOverlays`, plus any hydrology/biome products), and ensure legacy wrappers read/write through these products.
  - Open questions: What is the minimal “canonical” contract for each product that is stable enough for step boundaries, without forcing deep algorithm rewrites?
  - Sources: `PROJECT-engine-refactor-v1.md` topology, `resources/PRD-pipeline-refactor.md`, `../../system/libs/mapgen/foundation.md`, `resources/STATUS-M-TS-parity-matrix.md`.

- **Collapse the adapter boundary**
  - What/why: Extend `EngineAdapter` to cover map‑init responsibilities and delete the internal `OrchestratorAdapter` so implementation matches `architecture.md`.
  - Open questions: Any Civ7‑specific init behaviors that should stay outside the engine boundary? What’s the minimum API to support non‑Civ7 adapters later?
  - Sources: `../../system/libs/mapgen/architecture.md`, adapter boundary note in `M2-stable-engine-slice.md`.

- **StageManifest dependency semantics**
  - What/why: Start using `requires`/`provides` meaningfully on steps and ensure stage ordering/dependency graphs are validated at least in dev mode.
  - Open questions: What is the minimal runtime validator that can safely gate execution in M3 (vs. more exhaustive validation/test hardening in M4)?
  - Sources: `resources/PRD-pipeline-refactor.md`, `resources/config-wiring-status.md` (`requires/provides` currently unused), M4 validation scope in `M4-tests-validation-cleanup.md`.

- **Config parity “keep vs. deprecate” decisions**
  - What/why: Resolve remaining config wiring gaps that affect behavior or diagnostics, and explicitly decide parity vs. deprecation for dead/legacy fields.
  - Open questions: Decide on remaining dead/legacy fields beyond the M2 stable slice (e.g., `foundation.seed.*`, `oceanSeparation.respectSeaLanes`, other `Missing` rows in `config-wiring-status.md`). Stable‑slice diagnostics + story‑rainfall surface alignment is owned by M2.
  - Sources: `resources/config-wiring-status.md`, `resources/PRD-config-refactor.md`, M2 outcomes in `M2-stable-engine-slice.md`.

## Sequencing & Parallelization Plan (Phases + Graphite Stacks)

> This section proposes an implementation sequencing plan (phases + stacks). It does not change this milestone’s scope; it describes one recommended way to land M3 safely while keeping `main` buildable and map generation coherent.
>
> **Phases** are planning/story units (not new Linear artifacts). **Stacks** describe how we expect to ship via Graphite stacked PRs (see `docs/process/GRAPHITE.md`).
>
> **Graphite execution decision (locked):** M3 will be developed as **one long-running Graphite stack** and merged to `main` at the end of the milestone. The “Stack 1–7” labels below are conceptual sub-stacks for planning/issue grouping, not independent merge tracks.

### Phase A — Task Graph MVP becomes “the way to run” (wrap-only)

**Goal:** Establish the Task Graph plumbing and a “standard pipeline entry” that can run steps end-to-end, without changing generation algorithms.

**Exit criteria (what’s true when done):**
- A `PipelineExecutor` + `StepRegistry` + `MapGenStep` contract exists and is used in at least one real engine entry path.
- A “standard pipeline recipe” exists (even if it maps to wrapper steps) and produces a coherent map.
- Wrapper steps can be introduced incrementally without breaking `main`.

**Stack 1 — Task Graph Core + Standard Pipeline Entry (issue to mint; ID/title TBD)**
- **Concept / parent issue (ID/title TBD):** `[M3] Task Graph MVP (MapGenStep/StepRegistry/PipelineExecutor + standard pipeline entry)`
- **What lands:** executor/registry/step interface + runtime `requires`/`provides` gating + step wrappers scaffold + a safe “standard pipeline” entry path.
- **Branch safety:** keep the stack runnable end-to-end (buildable and producing coherent maps) even while the default execution path is being switched over.
- **Risk controls:** keep the current orchestrator path as the fallback while the executor path is being introduced; switch defaults only when the standard pipeline recipe is complete and validated.

### Phase B — Product spine + consumer migration (still wrap-first)

**Goal:** Make canonical products real for downstream consumers (rainfall, rivers, overlays), then migrate consumers off implicit globals/`GameplayMap` reads.

**Exit criteria:**
- `ClimateField` is treated as the authoritative rainfall/moisture surface for consumers.
- A minimal “river data product” exists and can be required by steps.
- Remaining story system outputs are published via `StoryOverlays` and run as steps (wrapping/porting as needed).
- Biomes/features and placement are wired as steps and consume canonical products (even if internal logic remains adapter/legacy).

**Stack 2 — Hydrology Productization + Consumer Migration**
- **Parent issue:** `LOCAL-M3-HYDROLOGY-PRODUCTS` (`../issues/LOCAL-M3-hydrology-products.md`)
- **What lands:** publish river summary product + make `ClimateField` canonical for consumers + wrap-first hydrology/climate step boundary that provides these products.
- **Branch safety:** keep generation coherent while moving consumers to `ClimateField`/river products (no mid-milestone back-compat shims are required purely for `main` merges).

**Stack 3 — Story System Remainder as Steps + Canonical Overlays**
- **Parent issue:** `LOCAL-M3-STORY-SYSTEM` (`../issues/LOCAL-M3-story-system.md`)
- **What lands:** corridors/swatches/paleo + canonical `StoryOverlays` publication + story stages running as steps with explicit contracts.
- **Branch safety:** keep story generation coherent while completing corridors/swatches/paleo and publishing canonical overlays (no algorithm swaps; step/wrapper-first).

**Stack 4 — Biomes/Features Step Wrapper + Product Consumption (issue to mint; ID/title TBD)**
- **Concept / parent issue (ID/title TBD):** `[M3] Biomes & Features step wrapper (consume canonical products)`
- **Note:** adapter-boundary biomes/features wiring landed in M1 (`CIV-19`, archived). This M3 work is about Task Graph step-wrapping + consuming canonical products, not re-doing adapter integration.
- **What lands:** biomes/features run as a step wrapper and consume `ClimateField`/`StoryOverlays`/river product (no new algorithms).
- **Branch safety:** ensure biomes/features behavior stays coherent while consumers move to canonical products (no algorithm swaps; wrapper-first).

**Stack 5 — Placement Step Wrapper + Product Consumption (issue to mint; ID/title TBD)**
- **Concept / parent issue (ID/title TBD):** `[M3] Placement step wrapper (consume canonical products)`
- **Note:** placement adapter integration (`CIV-20`, archived) and map-size awareness (`CIV-22`, archived) landed in M1. This M3 work is about Task Graph step-wrapping + consuming canonical products, not redoing those fixes.
- **Branch safety:** keep placement behavior stable while switching reads to canonical products (placement is highly cross-cutting; treat this as a late-phase integration cut).

### Phase C — Config evolution + adapter-boundary cleanup (ship-ready M3)

**Goal:** Align configuration and engine boundaries with the Task Graph architecture and complete the config cutover (step/phase-aligned shape; tunables retired) without changing generation algorithms.

**Exit criteria:**
- `MapGenConfig` is step/phase-aligned and consistently read via context (or a clear per-step config convention).
- Presets/recipes resolution is defined (or intentionally deprecated), with a canonical base config model.
- Tunables are retired (no hidden global config).
- Adapter boundary matches documented architecture.

**Stack 6 — Config Phase 2/3 + Presets/Recipes + Tunables Retirement (issue to mint; ID/title TBD)**
- **Concept / parent issue (ID/title TBD):** `[M3] Config evolution (Phase 2/3) + presets/recipes + tunables retirement`
- **What lands:** config-in-context convention + step/phase-aligned shape evolution + presets/recipes resolution + tunables retirement (no hidden global config).
- **Branch safety:** intermediate states may be non-backwards-compatible while the cutover is in flight, but the stack should remain runnable by updating in-tree callers and scripts as part of the same milestone branch.

**Stack 7 — Collapse Adapter Boundary (issue to mint; ID/title TBD)**
- **Concept / parent issue (ID/title TBD):** `[M3] Collapse EngineAdapter/OrchestratorAdapter boundary`
- **What lands:** expand `EngineAdapter` to cover map-init responsibilities and delete `OrchestratorAdapter` so implementation matches `architecture.md`.
- **Branch safety:** treat as a late-milestone integration cut; keep a single, coherent “one adapter boundary” model by the time M3 merges.

### Merge Strategy (Graphite execution)

- M3 will be built as **one long-running Graphite stack** and merged to `main` at milestone completion.
- The “Stack 1–7” labels are for sequencing and issue grouping; they do not imply independent merge tracks.

## Acceptance Criteria

- Major engine phases are represented as pipeline steps with clear dependency contracts.
- Contract violations (missing `requires`, unexpected `provides`) fail fast at runtime via `PipelineExecutor` gating.
- `MapGenConfig` reflects the engine’s phase/step structure and is used consistently via `MapGenContext`.
- Legacy tunables are retired (no hidden global config).
- Downstream stages consume data products (e.g., `ClimateField`, `StoryOverlays`) rather than hard-coded globals.

## Candidate Issues / Deliverables

> Issue IDs/titles are still to be minted, but the workstreams listed here are **locked** M3 deliverables.

- Migration of remaining legacy story/climate/biome/placement code into steps:
  - **To mint (ID/title TBD):** `[M3] Biomes & Features step wrapper (consume canonical products)` (new issue; do not reuse `CIV-19`)
  - **To mint (ID/title TBD):** `[M3] Placement step wrapper (consume canonical products)` (new issue; do not reuse `CIV-20`/`CIV-22`)
  - CIV-21: Full story port parent (`../issues/CIV-21-story-tagging.md`)
    - Remaining M3 portion: `LOCAL-M3-STORY-SYSTEM` (`../issues/LOCAL-M3-story-system.md`)
- Data product unlocks:
  - `LOCAL-M3-HYDROLOGY-PRODUCTS` (`../issues/LOCAL-M3-hydrology-products.md`)
- Task Graph core:
  - **To mint (ID/title TBD):** `[M3] Task Graph MVP (MapGenStep/StepRegistry/PipelineExecutor + standard pipeline entry)`
- Config evolution:
  - **To mint (ID/title TBD):** `[M3] Config evolution (Phase 2/3) + presets/recipes + tunables retirement`
- Adapter boundary:
  - **To mint (ID/title TBD):** `[M3] Collapse EngineAdapter/OrchestratorAdapter boundary`
- Prerequisites already landed (M1):
  - `CIV-19` biomes/features adapter integration (`../issues/_archive/CIV-19-biomes-features-adapter.md`)
  - `CIV-20` placement adapter integration (`../issues/_archive/CIV-20-placement-adapter.md`)
  - `CIV-22` restore map-size awareness (`../issues/_archive/CIV-22-map-size-awareness.md`)
- Any new issues spawned from the parity matrix or config refactor PRD that touch multiple phases.

These may be split or reassigned across milestones as we refine the execution plan.

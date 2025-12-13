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

> These are scoped M3 workstreams that will be promoted into real issues when M3 is scheduled. "Open questions" here are packaging/shape details, not "should we do this in M3?".

- **Pipeline generalization beyond foundation**
  - **Context / why:** M2 delivers a stable foundation/plate slice running through `MapOrchestrator`, but this is orchestrator-centric, not Task Graph-driven. To achieve the target architecture, we must extend `MapGenStep`/`PipelineExecutor` from foundation to all legacy clusters (morphology, hydrology/climate, overlays, biomes, placement). This unlocks step-level composition, reordering, and modding while preserving current map quality via wrapper steps.
  - **Relationship:** This is the foundational infrastructure for Phase A (Stack 1). Stacks 2–5 depend on this plumbing being in place before they can wrap their respective clusters. Runs in parallel with early config integration work.
  - **Deliverables:**
    - `MapGenStep` interface, `StepRegistry`, and `PipelineExecutor` implemented in `core/pipeline.ts`.
    - Runtime `requires`/`provides` gating that throws `MissingDependencyError` on contract violations.
    - A "standard pipeline recipe" that runs wrapper steps for all major clusters and produces coherent maps.
    - Wrapper step scaffolding pattern documented so subsequent stacks follow a consistent approach.
  - **Acceptance criteria:**
    - A pipeline recipe can execute end-to-end via `PipelineExecutor` and produce the same map as the current orchestrator flow.
    - Steps declare `requires`/`provides` and the executor validates these before each step runs.
    - Both entry paths (new executor, legacy orchestrator) remain functional during transition.
  - **Open questions:** What is the minimal wrapper boundary per cluster that yields clean `requires`/`provides` and canonical product read/write paths without changing generation algorithms?
  - **Sources:** `resources/PRD-pipeline-refactor.md`, `../../system/libs/mapgen/architecture.md`, pipeline skeleton issues `../issues/LOCAL-TBD-foundation-step-1-pipeline.md` through step‑5.

- **Config integration into `MapGenContext` (Phase 2)**
  - **Context / why:** M2 validates config at the boundary and injects it into the orchestrator, but steps still read config via tunables or ad-hoc paths. Phase 2 makes `MapGenContext.config` the single source of truth for all step reads, and maps legacy config groupings (e.g., `FOUNDATION_CFG`, `CLIMATE_CFG`) into canonical sub-schemas. This is prerequisite for Phase 3 shape evolution and ensures no hidden global reads persist.
  - **Relationship:** Builds on M2 config hygiene. Must land before or alongside Phase 3 shape evolution. Enables Stacks 2–5 to read config consistently via context.
  - **Deliverables:**
    - `MapGenContext.config` is populated with validated `MapGenConfig` at pipeline start.
    - All new/modernized steps read config from `context.config`, not from tunables or globals.
    - Legacy config sub-schemas (`PlateGenerationConfig`, climate blocks, etc.) mapped into `MapGenConfig` sub-trees.
    - Audit and document remaining tunables usage as compatibility-only reads.
  - **Acceptance criteria:**
    - No new step code reads from `FOUNDATION_CFG`/`CLIMATE_CFG` directly; all reads go through `context.config`.
    - Step implementations can access their config via `context.config.<phase>` or a config helper.
    - Tunables remain available but marked as deprecated/compatibility layer in docs.
  - **Open questions:** What is the minimal Phase 2 mapping that enables Phase 3 shape evolution and tunables retirement without leaving hidden global reads?
  - **Sources:** `resources/PRD-config-refactor.md` (Phase 2), `resources/config-wiring-status.md`, `resources/PRD-plate-generation.md`.

- **Config shape evolution + tunables retirement (Phase 3)**
  - **Context / why:** The current config shape reflects legacy groupings (foundation nesting, tunables facades). Phase 3 reshapes config to align with Task Graph phases/steps (`plates`, `landmass`, `mountains`, `climate`, `story`, `placement`, etc.) and retires tunables as the primary config store. This makes the config surface intuitive for mod authors and step developers.
  - **Relationship:** Depends on Phase 2 config integration. Must coordinate with all wrapper steps (Stacks 2–5) so they read from the new shape. Part of Phase C (Stack 6).
  - **Deliverables:**
    - Revised `MapGenConfigSchema` with step/phase-aligned top-level sections.
    - Migration of in-repo callers (map scripts, presets, recipes) to the new config shape.
    - Removal of `bootstrap/tunables.ts` as a primary config source (reduce to compatibility shim or delete).
    - Updated docs and JSON Schema export reflecting the new shape.
  - **Acceptance criteria:**
    - All step config reads use the new phase-aligned shape via `context.config`.
    - No internal code uses tunables as a primary config path (only deprecated compatibility, if any).
    - In-repo map scripts and presets work with the new config shape.
  - **Open questions:** What is the cutover plan for existing in-repo callers and presets/recipes so the new config shape is the supported path at M3 ship?
  - **Sources:** `resources/PRD-config-refactor.md` (Phase 3), `resources/config-wiring-status.md`, `packages/mapgen-core/src/config/schema.ts` comments.

- **Presets/recipes and canonical BASE_CONFIG**
  - **Context / why:** The `presets` field exists in the schema but is currently unused (`bootstrap()` does not apply preset resolution). For Task Graph recipes and mod config to work coherently, we need a canonical base config and a clear preset/recipe resolution model where named presets supply per-stage overrides.
  - **Relationship:** Part of Phase C config evolution (Stack 6). Coordinates with config shape evolution. Enables pipeline recipes to reference named presets.
  - **Deliverables:**
    - Define a canonical `BASE_CONFIG` (either in-repo or documented default derivation).
    - Implement preset resolution in bootstrap or as a pipeline pre-step.
    - Decide and document whether legacy preset semantics (`classic`, `temperate`, etc.) are preserved, simplified, or deprecated.
    - Presets can supply per-step config overrides that merge cleanly with base config.
  - **Acceptance criteria:**
    - A pipeline recipe can reference a named preset and get coherent per-step config applied.
    - The resolution model is documented and tested.
    - Decision on legacy presets is explicit and reflected in docs.
  - **Open questions:** Do we want full parity with legacy preset semantics, or simplify/deprecate the field? Where should resolution live (bootstrap vs. pipeline pre‑step)?
  - **Sources:** `resources/PRD-config-refactor.md`, `resources/config-wiring-status.md` (`presets` currently unused).

- **Canonical data products across clusters**
  - **Context / why:** The architecture defines canonical products (`FoundationContext`, `Heightfield`, `ClimateField`, `StoryOverlays`) but current code has inconsistent read/write patterns (some via products, some via `GameplayMap`, some via globals). M3 formalizes these products so all steps read/write through explicit product contracts, enabling step composition and easier testing.
  - **Relationship:** Foundation for all wrapper steps (Stacks 2–5). `FoundationContext` contract is established in M2; M3 extends to `ClimateField`, `StoryOverlays`, and hydrology products. Unblocks biomes/features/placement migration.
  - **Deliverables:**
    - Stable type definitions and contracts for `Heightfield`, `ClimateField`, `StoryOverlays`, and a minimal hydrology product (river summary).
    - Product read/write helpers on `MapGenContext` (e.g., `context.products.climate`, `context.products.hydrology`).
    - Legacy wrappers updated to populate products even if internals remain engine-owned.
    - Documentation of product mutation rules (when products can be written, by which phases).
  - **Acceptance criteria:**
    - Each product has a documented contract (shape, provenance, mutation rules).
    - Wrapper steps declare which products they `require` and `provide`.
    - No new/modernized consumer reads directly from `GameplayMap` for data available as a product.
  - **Open questions:** What is the minimal "canonical" contract for each product that is stable enough for step boundaries, without forcing deep algorithm rewrites?
  - **Sources:** `PROJECT-engine-refactor-v1.md` topology, `resources/PRD-pipeline-refactor.md`, `../../system/libs/mapgen/foundation.md`, `resources/STATUS-M-TS-parity-matrix.md`.

- **Collapse the adapter boundary**
  - **Context / why:** The current implementation has two adapter boundaries: `EngineAdapter` (in `MapGenContext`) and `OrchestratorAdapter` (internal to `MapOrchestrator` for map-init concerns). The target architecture has a single adapter boundary at `EngineAdapter`. Collapsing these reduces complexity and aligns implementation with `architecture.md`.
  - **Relationship:** Late-phase work (Stack 7). Depends on pipeline generalization being complete so the orchestrator's map-init responsibilities can migrate to the adapter. Unblocks cleaner adapter extension for non-Civ7 targets.
  - **Deliverables:**
    - Extend `EngineAdapter` API to cover map-init responsibilities (map size lookup, `SetMapInitData`, `GameplayMap`/`GameInfo` wiring).
    - Update `Civ7Adapter` to implement the extended API.
    - Refactor `MapOrchestrator` to use only `EngineAdapter` via `MapGenContext.adapter`.
    - Delete `OrchestratorAdapter` and any internal adapter references.
  - **Acceptance criteria:**
    - Only one adapter boundary exists: `MapGenContext.adapter: EngineAdapter`.
    - `MapOrchestrator` (or the pipeline entry) has no internal adapter.
    - Implementation matches the single-adapter design in `architecture.md`.
  - **Open questions:** Any Civ7‑specific init behaviors that should stay outside the engine boundary? What's the minimum API to support non‑Civ7 adapters later?
  - **Sources:** `../../system/libs/mapgen/architecture.md`, adapter boundary note in `M2-stable-engine-slice.md`.

- **StageManifest dependency semantics**
  - **Context / why:** The `requires`/`provides` fields exist in `StageManifest` but are currently unused (`config-wiring-status.md` notes them as planned). For the Task Graph to enforce contracts, these must be meaningful at runtime—steps that declare `requires: ["heightfield"]` should fail fast if `heightfield` is missing from context.
  - **Relationship:** Part of Phase A (Stack 1) pipeline core. Enables all subsequent stacks to declare and enforce dependencies. Coordinates with M4 for more exhaustive validation/test hardening.
  - **Deliverables:**
    - `PipelineExecutor` validates `requires` before running each step; throws `MissingDependencyError` on failure.
    - `StepRegistry` tracks which products are available after each step via `provides`.
    - Steps declare `requires`/`provides` in their metadata.
    - Dev-mode validation that warns on undeclared dependencies.
  - **Acceptance criteria:**
    - A step with unmet `requires` fails fast with a clear error message.
    - The executor builds a dependency graph and validates it before execution (or incrementally per step).
    - No silent "limp through" behavior when dependencies are missing.
  - **Open questions:** What is the minimal runtime validator that can safely gate execution in M3 (vs. more exhaustive validation/test hardening in M4)?
  - **Sources:** `resources/PRD-pipeline-refactor.md`, `resources/config-wiring-status.md` (`requires/provides` currently unused), M4 validation scope in `M4-tests-validation-cleanup.md`.

- **Config parity "keep vs. deprecate" decisions**
  - **Context / why:** `config-wiring-status.md` documents many config fields with statuses like "Legacy-only", "Unused / planned", or "Partially wired". M3 must explicitly decide which fields to keep, wire, or deprecate—leaving them ambiguous causes confusion for mod authors and step developers.
  - **Relationship:** Part of Phase C config evolution. Coordinates with config shape evolution and tunables retirement. Depends on M2 stable-slice config surface alignment.
  - **Deliverables:**
    - Audit `config-wiring-status.md` for remaining `Missing` / `Legacy-only` / `Unused` rows.
    - For each: decide keep-and-wire, deprecate-with-warning, or remove.
    - Update schema to reflect decisions (remove fields, add deprecation markers, or wire new consumers).
    - Document decisions in `config-wiring-status.md` and changelog.
  - **Acceptance criteria:**
    - No ambiguous "Unused / planned" fields remain in the schema without an explicit decision.
    - Deprecated fields emit warnings when used.
    - `config-wiring-status.md` is fully resolved (all rows have clear status).
  - **Open questions:** Decide on remaining dead/legacy fields beyond the M2 stable slice (e.g., `foundation.seed.*`, `oceanSeparation.respectSeaLanes`, other `Missing` rows in `config-wiring-status.md`). Stable‑slice diagnostics + story‑rainfall surface alignment is owned by M2.
  - **Sources:** `resources/config-wiring-status.md`, `resources/PRD-config-refactor.md`, M2 outcomes in `M2-stable-engine-slice.md`.

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
- **Context / why:** This is the infrastructure unlock for M3. Without `PipelineExecutor` and `StepRegistry`, we cannot run steps with explicit contracts. This stack delivers the core plumbing that all other stacks depend on.
- **Relationship:** Foundation for all M3 work. Stacks 2–7 depend on this being in place. Runs as the first deliverable of Phase A.
- **Deliverables:**
  - `MapGenStep` interface with `id`, `phase`, `requires`, `provides`, `shouldRun`, `run` as defined in `architecture.md`.
  - `StepRegistry` for step registration and lookup by ID.
  - `PipelineExecutor` that iterates a recipe, resolves steps, validates `requires`, and executes.
  - Runtime `requires`/`provides` gating that throws `MissingDependencyError` on violations.
  - A "standard pipeline recipe" (JSON or code-driven) that wraps all current orchestrator stages as steps.
  - `LegacyMorphologyStep` wrapper (or equivalent) covering mountains/volcanoes/coastlines/islands that publishes `Heightfield` as a canonical product.
  - Parallel entry paths: new executor path alongside existing orchestrator path during transition.
- **Acceptance criteria:**
  - `PipelineExecutor.run(context, recipe)` executes a full map generation and produces coherent output.
  - Steps with unmet `requires` fail fast with clear error messages.
  - Both entry paths (executor and orchestrator) produce equivalent maps during transition.
  - Wrapper step pattern is documented for subsequent stacks.
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
- **Context / why:** Biomes and features stages currently run through the orchestrator and read climate/story data via mixed paths (some via `GameplayMap`, some via globals, some via context). To achieve the Task Graph architecture, these stages must become `MapGenStep`s that declare their dependencies and consume canonical products (`ClimateField`, `StoryOverlays`, river product).
- **Relationship:** Depends on Stack 1 (pipeline core) and Stack 2 (hydrology products) being in place. Runs in parallel with Stack 3 (story system). Consumed by Stack 5 (placement) which depends on biome assignments.
- **Note:** adapter-boundary biomes/features wiring landed in M1 (`CIV-19`, archived). This M3 work is about Task Graph step-wrapping + consuming canonical products, not re-doing adapter integration.
- **Deliverables:**
  - `LegacyBiomesStep` wrapper that implements `MapGenStep` and calls existing `designateEnhancedBiomes` logic.
  - `LegacyFeaturesStep` wrapper that implements `MapGenStep` and calls existing `addDiverseFeatures` logic.
  - Both steps declare `requires: ["climatefield", "storyoverlays"]` and `provides: ["biomes", "features"]`.
  - Internal logic updated to read rainfall/moisture from `ClimateField` product, not `GameplayMap`.
  - Internal logic updated to read story tags from `StoryOverlays` product.
- **Acceptance criteria:**
  - Biomes/features stages run as steps via `PipelineExecutor` with explicit contracts.
  - No direct `GameplayMap` reads for rainfall/moisture data in modernized code paths.
  - Biome/feature distribution matches current orchestrator output (wrap-first; no algorithm changes).
  - Steps fail fast if required products (`climatefield`, `storyoverlays`) are missing.
- **Branch safety:** ensure biomes/features behavior stays coherent while consumers move to canonical products (no algorithm swaps; wrapper-first).

**Stack 5 — Placement Step Wrapper + Product Consumption (issue to mint; ID/title TBD)**
- **Concept / parent issue (ID/title TBD):** `[M3] Placement step wrapper (consume canonical products)`
- **Context / why:** Placement is the final generation phase, consuming outputs from all prior phases (foundation, morphology, hydrology, ecology). Currently it runs through the orchestrator with mixed data reads. To complete the Task Graph migration, placement must become a `MapGenStep` that explicitly declares its cross-cutting dependencies and consumes canonical products.
- **Relationship:** Last step in Phase B. Depends on Stacks 2–4 delivering canonical products. Most cross-cutting step in the pipeline (touches biomes, features, rivers, terrain, climate). Treat as a late-phase integration cut.
- **Note:** placement adapter integration (`CIV-20`, archived) and map-size awareness (`CIV-22`, archived) landed in M1. This M3 work is about Task Graph step-wrapping + consuming canonical products, not redoing those fixes.
- **Deliverables:**
  - `LegacyPlacementStep` wrapper that implements `MapGenStep` and calls existing `runPlacement` logic.
  - Step declares `requires: ["heightfield", "climatefield", "storyoverlays", "biomes", "features"]` and `provides: ["placement"]`.
  - Internal logic updated to read biomes/features from canonical products.
  - Placement reads terrain/elevation via `Heightfield` product where applicable.
  - Floodplains, natural wonders, and start positions logic preserved (wrap-first).
- **Acceptance criteria:**
  - Placement stage runs as a step via `PipelineExecutor` with explicit contracts.
  - All placement outputs (starts, wonders, floodplains) match current orchestrator behavior.
  - Step fails fast if any required products are missing.
  - No silent degradation of placement quality due to missing dependencies.
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
- **Context / why:** M2 established config hygiene (validated schema, no globals), but config is still shaped around legacy groupings and read via tunables. Phase C completes the config story: steps read config via `context.config`, the schema is reshaped to match phases/steps, presets become real, and tunables are retired. This makes configuration intuitive for modders and consistent with the Task Graph model.
- **Relationship:** Part of Phase C (ship-ready M3). Depends on Stacks 1–5 delivering step wrappers that need to read config. Coordinates with Stack 7 (adapter cleanup). Must update all in-tree callers as part of the cutover.
- **Deliverables:**
  - **Phase 2 (config-in-context):**
    - `MapGenContext.config` populated at pipeline start.
    - All step wrappers read config via `context.config`, not tunables.
    - Legacy tunables marked as deprecated compatibility layer.
  - **Phase 3 (shape evolution):**
    - `MapGenConfigSchema` restructured with top-level phase/step-aligned sections (`plates`, `landmass`, `mountains`, `climate`, `story`, `placement`, `diagnostics`).
    - Migration of in-repo map scripts and presets to new shape.
    - `bootstrap/tunables.ts` removed or reduced to minimal compatibility shim.
  - **Presets/recipes:**
    - Canonical `BASE_CONFIG` defined.
    - Preset resolution implemented (bootstrap or pipeline pre-step).
    - Decision on legacy presets (`classic`, `temperate`) documented.
  - **Config parity decisions:**
    - All `config-wiring-status.md` rows resolved (keep/wire, deprecate, remove).
    - Deprecated fields emit warnings.
- **Acceptance criteria:**
  - All steps read config via `context.config` with the new phase-aligned schema.
  - No internal code uses tunables as a primary config path.
  - Preset resolution works and is tested.
  - `config-wiring-status.md` has no ambiguous "Unused / planned" rows.
  - In-repo map scripts work with the new config shape.
- **Branch safety:** intermediate states may be non-backwards-compatible while the cutover is in flight, but the stack should remain runnable by updating in-tree callers and scripts as part of the same milestone branch.

**Stack 7 — Collapse Adapter Boundary (issue to mint; ID/title TBD)**
- **Concept / parent issue (ID/title TBD):** `[M3] Collapse EngineAdapter/OrchestratorAdapter boundary`
- **Context / why:** The target architecture has a single adapter boundary at `EngineAdapter`, but the current implementation retains a second `OrchestratorAdapter` for map-init concerns (`SetMapInitData`, `GameplayMap`/`GameInfo` wiring, map size lookup). This tech debt complicates the adapter API and prevents clean extension for non-Civ7 targets. Collapsing to one boundary aligns implementation with `architecture.md`.
- **Relationship:** Late-phase work in Phase C. Depends on Stacks 1–6 being substantially complete so the orchestrator's responsibilities have migrated to the pipeline. Unblocks cleaner adapter design for future non-Civ7 adapters.
- **Deliverables:**
  - Extended `EngineAdapter` interface covering map-init responsibilities:
    - Map size/dimensions lookup.
    - `SetMapInitData` or equivalent initialization.
    - `GameplayMap`/`GameInfo` access methods.
  - Updated `Civ7Adapter` implementing the extended API.
  - Refactored `MapOrchestrator` (or pipeline entry) to use only `MapGenContext.adapter: EngineAdapter`.
  - Deletion of `OrchestratorAdapter` class and all internal adapter references.
  - Documentation of the adapter API for potential non-Civ7 implementations.
- **Acceptance criteria:**
  - Only one adapter boundary exists: `MapGenContext.adapter: EngineAdapter`.
  - `MapOrchestrator` and pipeline entry have no internal/secondary adapters.
  - Implementation matches the single-adapter design in `architecture.md`.
  - Adapter API is documented for potential extensibility.
- **Branch safety:** treat as a late-milestone integration cut; keep a single, coherent "one adapter boundary" model by the time M3 merges.

### Merge Strategy (Graphite execution)

- M3 will be built as **one long-running Graphite stack** and merged to `main` at milestone completion.
- The “Stack 1–7” labels are for sequencing and issue grouping; they do not imply independent merge tracks.

## Acceptance Criteria

- Major engine phases are represented as pipeline steps with clear dependency contracts.
- Contract violations (missing `requires`, unexpected `provides`) fail fast at runtime via `PipelineExecutor` gating.
- `MapGenConfig` reflects the engine’s phase/step structure and is used consistently via `MapGenContext`.
- Legacy tunables are retired (no hidden global config).
- Downstream stages consume data products (e.g., `ClimateField`, `StoryOverlays`) rather than hard-coded globals.

## Issue Map (Minting Reference)

> Compact reference for creating M3 issue docs. All parent issues use `[M3]` prefix. Stack numbers correspond to the Sequencing section above.

### Parent Issues to CREATE (new)

| Stack | Parent Issue Filename | Title | Blocked By | Blocks |
|-------|----------------------|-------|------------|--------|
| 1 | `LOCAL-M3-task-graph-mvp.md` | [M3] Task Graph MVP: Pipeline Primitives + Standard Entry | — | Stacks 2–7 |
| 4 | `LOCAL-M3-biomes-features-wrapper.md` | [M3] Biomes & Features Step Wrapper | Stack 1, 2, 3 | Stack 5 |
| 5 | `LOCAL-M3-placement-wrapper.md` | [M3] Placement Step Wrapper | Stack 4 | Stack 6 |
| 6 | `LOCAL-M3-config-evolution.md` | [M3] Config Evolution (Phase 2/3) + Tunables Retirement | Stacks 1–5 | Stack 7 |
| 7 | `LOCAL-M3-adapter-collapse.md` | [M3] Adapter Boundary Collapse | Stack 6 | — |

### Parent Issues that EXIST (update metadata only)

| Stack | Existing Issue | Title | Updates Needed |
|-------|---------------|-------|----------------|
| 2 | `LOCAL-M3-hydrology-products.md` | [M3] Hydrology Productization | Add `blocked_by: [LOCAL-M3-task-graph-mvp]`; ensure AC references runtime gating |
| 3 | `LOCAL-M3-story-system.md` | [M3] Story System Modernization | Add `blocked_by: [LOCAL-M3-task-graph-mvp]`; clarify StoryOverlays as canonical product |

### Historical / Parallel Issues (no changes)

| Issue | Status | Notes |
|-------|--------|-------|
| `CIV-21-story-tagging.md` | Keep as parent of Stack 3 | Stack 3 is the M3 portion; CIV-36 is M2 portion |
| `CIV-26-config-hygiene-parent.md` | Keep as M2 historical | Phase 1 complete; Stack 6 is M3 successor |
| `CIV-27..31` (config children) | Keep as M2 completed | Reference from Stack 6 as prerequisites |
| `CIV-40-system-docs-target-vs-current.md` | Keep parallel | Runs alongside M3; doesn't block/get blocked |

### Archived Issues (do NOT recreate)

| Issue | Reason |
|-------|--------|
| `_archive/CIV-19-biomes-features-adapter.md` | M1 complete; Stack 4 is step-wrapping, not adapter work |
| `_archive/CIV-20-placement-adapter.md` | M1 complete; Stack 5 is step-wrapping, not adapter work |
| `_archive/CIV-22-map-size-awareness.md` | M1 complete; not relevant to M3 |

### Draft Backlog → Stack Mapping

| Draft Backlog Item | Maps To |
|--------------------|---------|
| Pipeline generalization beyond foundation | Stack 1 |
| Config integration (Phase 2) | Stack 6 |
| Config shape evolution (Phase 3) | Stack 6 |
| Presets/recipes + BASE_CONFIG | Stack 6 |
| Canonical data products | Cross-cutting (Stacks 1–5 each publish products) |
| Collapse adapter boundary | Stack 7 |
| StageManifest dependency semantics | Stack 1 |
| Config parity decisions | Stack 6 |

### Recommended Minting Order

1. **Stack 1** — `LOCAL-M3-task-graph-mvp.md` (everything depends on this)
2. **Stacks 2–3** — Update existing `LOCAL-M3-hydrology-products.md` and `LOCAL-M3-story-system.md` metadata
3. **Stack 4** — `LOCAL-M3-biomes-features-wrapper.md`
4. **Stack 5** — `LOCAL-M3-placement-wrapper.md`
5. **Stack 6** — `LOCAL-M3-config-evolution.md`
6. **Stack 7** — `LOCAL-M3-adapter-collapse.md`

---

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

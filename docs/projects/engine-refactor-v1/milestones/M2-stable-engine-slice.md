# M2: Stable Shape & Instrumented Engine Slice

**Milestone ID:** `M2-stable-engine-slice`  
**Status:** Planned  
**Owner:** Engineering  

> Note: Scope and exact issue mapping for this milestone may be revisited as we get closer to implementation. Treat this doc as a living plan that should be updated once work starts.

## Summary

Establish a minimal but production-ready slice of the new engine architecture: validated configuration, task-graph pipeline, and modern foundation/plate stack, all wired into Swooper Maps with strong diagnostics. Downstream phases (climate, overlays, biomes, placement) remain mostly legacy in this milestone.

This milestone corresponds to **Milestone 2** in `PROJECT-engine-refactor-v1.md`.

## Objectives

- Introduce a single, validated `MapGenConfig` schema and fail-fast configuration loading.
- Implement the core task-graph infrastructure (`MapGenStep`, `StepRegistry`, `MapGenContext`, `PipelineExecutor`).
- Run the **foundation / plate generation** stack through the new pipeline slice and bridge its outputs into legacy downstream stages.
- Preserve existing map behavior as much as possible while enabling new diagnostics and determinism.

## Scope

### Dependencies & Sequencing

- This milestone executes:
  - **Config Refactor:** Phase 1 “Config Hygiene” from `resources/PRD-config-refactor.md`.
  - **Pipeline Refactor:** The core plumbing slice from `resources/PRD-pipeline-refactor.md` needed to run the foundation cluster through the task graph.
  - **Plate Generation:** The initial implementation and integration of the foundation/plate stack from `resources/PRD-plate-generation.md`.
- Work should land in this order:
  1. Implement config hygiene and fail-fast loading (`MapGenConfigSchema`, `parseConfig`, no globals).
  2. Wire `MapGenContext` and the task-graph plumbing (`MapGenStep`, `StepRegistry`, `PipelineExecutor`) to use validated config.
  3. Implement and integrate the foundation/plate steps as pipeline steps, with a legacy bridge into existing morphology.
  4. Layer on diagnostics and minimal smoke checks for foundation outputs.
- Later phases from these PRDs (e.g., config shape evolution, downstream cluster migration into the pipeline) are intentionally out of scope here and are owned by later milestones (see `M3-core-engine-refactor-config-evolution.md` and `M4-tests-validation-cleanup.md`).

### 1. Config Hygiene (Phase 1)

- Define `MapGenConfigSchema` and `MapGenConfig` as the canonical configuration shape for the engine.
- Implement a `parseConfig` helper that validates raw config and fails fast on invalid inputs.
- Refactor `MapOrchestrator` and bootstrap/tunables to:
  - Inject validated config at the boundary rather than relying on globals.
  - Preserve existing external config surface for Swooper Maps in this milestone.

Related PRD: `resources/PRD-config-refactor.md` (Phase 1)

### 2. Pipeline Core Plumbing (Phase 1)

- Define and implement:
  - `MapGenStep` interface.
  - `StepRegistry` for registering steps by ID.
  - `MapGenContext` structure (adapter, config, RNG, fields, artifacts).
  - `PipelineExecutor` to run a JSON recipe and enforce `requires`/`provides` at runtime.
- Adapt `MapOrchestrator` to:
  - Construct `MapGenContext` once per generation.
  - Run the `foundation` phase steps via `PipelineExecutor`.
  - Bridge results into `WorldModel` where legacy layers still expect it.

Related PRD: `resources/PRD-pipeline-refactor.md` (Phase 1)

### 3. Foundation / Plate Generation Integration

- Implement and/or finish:
  - `MeshBuilder` (Voronoi + Lloyd relaxation).
  - `CrustGenerator` (Craton seeding + noise).
  - `PlatePartitioner` (multi-source weighted flood fill).
  - `TectonicEngine` (vector physics + material-aware interactions).
- Wrap these as `MapGenStep`s in the `foundation` phase and ensure they:
  - Populate `context.artifacts.mesh`, `crust`, `plateGraph`, and `tectonics`.
  - Export a `FoundationContext` snapshot for diagnostics and legacy consumers.
- Ensure deterministic behavior and meet basic performance targets on typical map sizes.

Related PRD: `resources/PRD-plate-generation.md`

### 4. Diagnostics & Observability

- Ensure existing `[Foundation]` diagnostics (seed/plate/dynamics/surface logs, ASCII maps, histograms) are wired to the new pipeline.
- Add basic executor-level logging (start/finish of steps, durations, error reporting).
- Optionally, add minimal smoke checks for foundation outputs (e.g., non-empty plate graphs, sane uplift distributions).

## Acceptance Criteria

- Engine can execute the `foundation` pipeline slice via `PipelineExecutor` using validated config.
- `MapGenContext.artifacts.mesh`, `crust`, `plateGraph`, and `tectonics` are populated and consumed by existing morphology stages via the legacy bridge.
- Existing Swooper Maps entries still generate valid maps (no “null script” regressions) after this milestone.
- Diagnostics clearly reflect the new pipeline flow and foundation data.

## Candidate Issues / Deliverables

> These mappings are tentative and may be adjusted when the milestone is scheduled.

- Config hygiene & context wiring:
  - [ ] CIV-17: Config → manifest resolver (`../issues/CIV-17-config-manifest-resolver.md`)
  - [ ] CIV-18: Call-site fixes for climate/biomes (`../issues/CIV-18-callsite-fixes.md`)
- Foundation pipeline & diagnostics:
  - [ ] LOCAL-TBD: foundation stage parent and step issues (`../issues/LOCAL-TBD-foundation-stage-parent.md`, step 1–5 issues)
  - [ ] CIV-24: Dev diagnostics and executor logging (`../issues/CIV-24-dev-diagnostics.md`)

These may be split or reassigned across milestones as we refine the execution plan.

# M2: Stable Shape & Instrumented Engine Slice

**Milestone ID:** `M2-stable-engine-slice`  
**Status:** Planned  
**Owner:** Engineering  

> Note: Scope and exact issue mapping for this milestone may be revisited as we get closer to implementation. Treat this doc as a living plan that should be updated once work starts.

## Summary

Establish a minimal but production-ready slice of the new engine architecture: validated configuration and a modern foundation/plate stack wired into Swooper Maps with strong diagnostics, using the current `MapOrchestrator`-centric flow. Downstream phases (climate, overlays, biomes, placement) remain mostly legacy in this milestone, **except for minimal story parity** needed to stabilize narrative‑aware consumers.

This milestone corresponds to **Milestone 2** in `PROJECT-engine-refactor-v1.md`.

**Milestone boundary note:** M2 owns config parity/wiring and behavioral correctness for the **current orchestrator‑centric stable slice** (foundation + minimal story + diagnostics) where those configs are meaningful today and unlikely to be invalidated by later Task Graph work. Anything whose shape or wiring depends on `MapGenStep`/`PipelineExecutor` or canonical product boundaries is deferred to M3.

## Objectives

- Introduce a single, validated `MapGenConfig` schema and fail-fast configuration loading.
- Wire the existing `MapOrchestrator` and context/tunables flow to consume validated config instead of globals.
- Run the **foundation / plate generation** stack through this orchestrated slice and bridge its outputs into legacy downstream stages.
- Restore **minimal story parity** (margins + hotspots + rifts). **Orogeny belts are deferred out of M2** despite the stage flag existing, because they require additional cache/plumbing that is better handled once the remaining story stages are in view.
- Preserve existing map behavior as much as possible while enabling new diagnostics and determinism.

## Scope

### Dependencies & Sequencing

- This milestone executes:
  - **Config Refactor:** Phase 1 “Config Hygiene” from `resources/PRD-config-refactor.md`.
  - **Plate Generation:** The initial implementation and integration of the foundation/plate stack from `resources/PRD-plate-generation.md`.
- Work should land in this order:
  1. Implement config hygiene and fail-fast loading (`MapGenConfigSchema`, `parseConfig`, no globals).
  2. Wire `bootstrap()` / tunables / `MapOrchestrator` to use validated config and drive the foundation slice.
  3. Implement and integrate the foundation/plate stack behind the orchestrator and bridge its outputs into existing morphology.
  4. Layer on diagnostics and minimal smoke checks for foundation outputs.
- Later phases from these PRDs (e.g., config shape evolution, task-graph plumbing, downstream cluster migration into the pipeline) are intentionally out of scope here and are owned by later milestones (see `M3-core-engine-refactor-config-evolution.md` and `M4-tests-validation-cleanup.md`).

### 1. Config Hygiene (Phase 1)

- Define `MapGenConfigSchema` and `MapGenConfig` as the canonical configuration shape for the engine.
- Implement a `parseConfig` helper that validates raw config and fails fast on invalid inputs.
- Refactor `MapOrchestrator` and bootstrap/tunables to:
  - Inject validated config at the boundary rather than relying on globals.
  - Preserve existing external config surface for Swooper Maps in this milestone.

Related PRD: `resources/PRD-config-refactor.md` (Phase 1)

### 2. Foundation / Plate Generation Integration

- Implement and/or finish:
  - `MeshBuilder` (Voronoi + Lloyd relaxation).
  - `CrustGenerator` (Craton seeding + noise).
  - `PlatePartitioner` (multi-source weighted flood fill).
  - `TectonicEngine` (vector physics + material-aware interactions).
- Ensure these components populate the foundation data products (mesh, crust, plate graph, tectonics) and export a `FoundationContext` snapshot for diagnostics and legacy consumers.
- Ensure deterministic behavior and meet basic performance targets on typical map sizes.

Related PRD: `resources/PRD-plate-generation.md`

### 3. Diagnostics & Observability

- Ensure existing `[Foundation]` diagnostics (seed/plate/dynamics/surface logs, ASCII maps, histograms) are wired to the orchestrated foundation slice.
- Add basic stage-level logging (start/finish of stages, durations, error reporting).
- Optionally, add minimal smoke checks for foundation outputs (e.g., non-empty plate graphs, sane uplift distributions).

### 4. Minimal Story Parity (Narrative Seed)

- Port and wire the minimal story tagging subset from the JS archive:
  - Continental margins (active/passive shelves) + margins overlay publication.
  - Hotspot trails and rift valleys.
  - **Explicit deferral:** `storyTagOrogenyBelts` / orogeny windward‑lee caches are *not* part of M2. Even though M2 configs may enable `storyOrogeny`, the TS stable slice does not yet provide the necessary `OrogenyCache` plumbing into climate/swatches. This is tracked in project triage/backlog and revisited in M3.
- Run these through the existing story stages in `MapOrchestrator` without introducing pipeline primitives yet.
- Add a small smoke check or warning when story stages are enabled but produce empty tag sets.

### 5. Stable‑Slice Config Surface Alignment (Current‑Slice Correctness)

- Ensure the validated schema and docs reflect the config keys actually consumed in the M2 stable slice:
  - `foundation.diagnostics` dev flags (currently untyped but wired via `initDevFlags`).
  - Story‑driven rainfall knobs (`climate.story.rainfall.*`) that influence `climateRefine` once minimal story tags exist.
  - **Note:** story orogeny windward‑lee amplification (and any legacy `foundation.story.orogeny.*` knobs) is deferred to M3+ as a modern orogeny step/layer.
  - Resolve the mismatch between top‑level `diagnostics.*` aliases and the stable `foundation.diagnostics` block by treating `foundation.diagnostics` as canonical and deprecating/removing the unused top‑level surface.
- This work is limited to promoting and documenting keys already meaningful in the stable slice; no diagnostics redesign is intended in M2.
- Sources: `resources/config-wiring-status.md` (diagnostics + untyped stable‑slice keys), `resources/STATUS-M-TS-parity-matrix.md` (dev diagnostics + story/climate notes), `../issues/CIV-36-story-parity.md`, `../issues/CIV-38-dev-diagnostics.md`, `../issues/CIV-39-config-surface-alignment.md`.

## Acceptance Criteria

- Engine can execute the `foundation` slice via the `MapOrchestrator` using validated config.
- Foundation data products (mesh, crust, plate graph, tectonics / `FoundationContext`) are populated and consumed by existing morphology stages via the legacy bridge.
- When story stages are enabled, minimal story tags/overlays (margins/hotspots/rifts) are populated and visible to downstream consumers.
- Existing Swooper Maps entries still generate valid maps (no “null script” regressions) after this milestone.
- Diagnostics clearly reflect the foundation data and stage flow.

## Candidate Issues / Deliverables

> These mappings are tentative and may be adjusted when the milestone is scheduled.

- Config hygiene & context wiring:
  - [ ] CIV-17: Config → manifest resolver (`../issues/CIV-17-config-manifest-resolver.md`)
  - [ ] CIV-18: Call-site fixes for climate/biomes (`../issues/CIV-18-callsite-fixes.md`)
  - [ ] CIV-37: Foundation/mountains wiring into `WorldModel` (`../issues/CIV-37-worldmodel-mountains-wiring.md`)
- Foundation pipeline & diagnostics:
  - [ ] CIV-38: Dev diagnostics and executor logging (`../issues/CIV-38-dev-diagnostics.md`).
- Stable‑slice config correctness:
  - [ ] CIV-39: Align schema/docs for stable‑slice story‑rainfall/orogeny knobs (`../issues/CIV-39-config-surface-alignment.md`).
- Narrative parity:
  - [ ] CIV-36: Minimal story parity (`../issues/CIV-36-story-parity.md`)

These may be split or reassigned across milestones as we refine the execution plan.

### Intentionally Dropped (No Parity Targets)

- JS-era tunables facades (`CLIMATE_TUNABLES`, `FOUNDATION_TUNABLES`, `STORY_TUNABLES`) are intentionally **not** being reintroduced. TS layers should use the core tunables blocks and helpers from `bootstrap/tunables.ts` directly. See `resources/STATUS-M-TS-parity-matrix.md` §5.4 and `resources/PRD-config-refactor.md` (Phase 3 deprecations).

## Outcomes & Follow-Ups

- **Reframed M2 outcome.**
  - For planning and reconciliation after CIV-26–CIV-31, M2 is now defined as: “Config + foundation slice is stable, documented, and test-backed,” using the current `MapOrchestrator`-centric architecture.
  - M2 explicitly does *not* deliver the full generic `PipelineExecutor` / `MapGenStep` / `StepRegistry` abstraction; that work is deferred to early M3+.

- **Final M2 cleanup/stabilization batch (to land before calling the milestone fully done):**
  - **Docs alignment**
    - Update M2 docs and issue files so they accurately describe the current flow: `bootstrap() → MapGenConfig → tunables → MapOrchestrator → FoundationContext`, and remove or soften wording that assumes an already-implemented `PipelineExecutor` / `MapGenStep` / `StepRegistry`.
    - Remove or clearly mark as “future” any remaining references to `globalThis.__EPIC_MAP_CONFIG__` and the old global config pattern.
  - **Contract stabilization**
    - Make the `FoundationContext` contract explicit: what it guarantees to downstream consumers, and which data products exist at the end of the M2 slice (see `resources/CONTRACT-foundation-context.md` as the working contract doc).
    - Clarify the role of tunables as a view over `MapGenConfig` (derived/read-only perspective) rather than a primary config store.
  - **Tests**
    - Add at least one end-to-end `MapOrchestrator.generateMap` smoke test using a minimal/default `MapGenConfig` and a stub adapter, asserting that the foundation data products are populated and no stages regress.

- **These items should become discrete M2 follow-up issues (to be created in Linear later), for example:**
  - “Align M2 docs and status with the actual config/orchestrator implementation.”
  - “Document the `FoundationContext` contract and config → tunables → world model flow.”
  - “Add `MapOrchestrator.generateMap` smoke tests over the current slice.”

- **M3+ direction (for later adjustment, *not* to implement in M2 yet), summarized for future self:**
  - **M3 will own:**
    - Introducing `PipelineExecutor` / `MapGenStep` / `StepRegistry` *on top of* the now-stable data products, rather than in parallel to them.
    - Canonicalizing engine data products (`ClimateField`, river/hydrology products, `StoryOverlays`) and wiring stages to those products.
  - **M4 will own:**
    - Stronger contracts and validation around data products and `StageManifest` (requires/provides checking, integration tests, diagnostics).

### Adapter Boundary (EngineAdapter vs. OrchestratorAdapter)

- **Current state for M2 planning:** The architecture docs target a single adapter boundary at `MapGenContext.adapter: EngineAdapter`, but the current implementation still uses a second, internal `OrchestratorAdapter` inside `MapOrchestrator` for Civ7 map-init concerns (map size lookup, `SetMapInitData`, `GameplayMap`/`GameInfo` wiring). This two-adapter setup is intentional tech debt for now, not a new pattern to extend.
- **Out of scope for this milestone:** M2’s “config hygiene + foundation slice” does **not** attempt to collapse the adapter boundary; it only ensures config/tunables are validated and injected cleanly into the existing `MapOrchestrator`-centric flow.
- **Planned follow-up (M3+):** A later milestone will extend `EngineAdapter`/`Civ7Adapter` to cover map-init responsibilities, update `MapOrchestrator` to depend solely on `EngineAdapter` + validated `MapGenConfig`/`MapGenContext`, and delete `OrchestratorAdapter` so the implementation matches the single-adapter design in `architecture.md`.

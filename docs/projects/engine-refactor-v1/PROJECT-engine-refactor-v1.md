# PROJECT: MAPS Engine Refactor v1

**Status:** Active  
**Timeline:** Milestone-based — aligns with Swooper Maps feature cadence  
**Teams:** Swooper Maps (solo / AI-assisted)

## 1. Purpose & Context

Swooper Maps is a large-scale procedural map generation mod for Civilization VII that aims to deliver:

- Physics-based terrain generation using Voronoi plate tectonics.
- Climate simulation with baseline, swatch, and refinement layers.
- Narrative overlay system for geological storytelling.
- ~~Stage manifest-based orchestration and map presets.~~  
  **Update (2025-12-21, M4 planning):** Stage manifest/presets are legacy; target entry is recipe + settings (compiled to `ExecutionPlan`). See `milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

The current engine originated as a monolithic JavaScript script and has been partially migrated to TypeScript packages. We are in the middle of a multi-phase refactor that will:

- Finish the TypeScript migration and package architecture.
- Stabilize the engine architecture (task graph, context, config).
- Modernize foundation / plate generation and downstream consumers.
- Add robust configuration, validation, and testing.

This document is the **directional project brief** for **MAPS Engine Refactor v1**. It defines product-level goals and the milestone plan; feature-specific PRDs (config, pipeline, plates, etc.) remain canonical for their respective components and are linked from here.

## 2. Goals & Non-Goals

**Goals**

- Deliver a physics-first orchestration engine with a single authoritative world foundation (plates, uplift, winds, currents).
- Remove legacy fallbacks and implicit ordering so every stage consumes explicit inputs and produces explicit outputs.
- Keep physics mandatory (Voronoi + plate stack) and deterministic, with strong diagnostics and logging.
- Provide a clear, validated configuration model (`MapGenConfig`) with no global state and Fail Fast behavior.
- Make the engine modular and testable via a data-driven task graph (pipeline + registry).
- Ensure each milestone is a discrete, shippable unit that leaves the mod in a working state.

**Non-Goals (v1)**

- Designing a new in-game UX for map configuration (beyond what the schema enables).
- Implementing every possible storytelling overlay or preset; focus is engine capability and stability.
- Supporting non-standard engine embeddings beyond Civ7 (embedded V8).

## 3. Current Status (Snapshot)

- **Foundations and morphology:** ✅ Complete. Voronoi-only landmass pipeline, deterministic `PlateSeedManager`, `FoundationContext` emitted and asserted, heightfield buffers in place. Mountains/volcanoes, coasts, and landmass generation consume the physics stack. A working contract for `FoundationContext` and the config → tunables → orchestrator flow lives at `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md` and will be promoted into system docs once stable.
- **Climate:** ⚠️ Partial. Climate engine is centralized and rivers run after baseline, but consumers still read `GameplayMap` instead of `ClimateField`; river flow data is not published.
- **Narrative overlays:** ⏳ Not modernized. Margin overlays exist, but other story passes still mutate `StoryTags` directly and do not publish immutable overlays.
- **Biomes/features/placement:** ⏳ Legacy read paths (`GameplayMap` + `StoryTags`). No overlay/`ClimateField` consumption yet.
- **Manifest enforcement:** ⏳ Manifest describes `requires`/`provides`, but no runtime validator for data products; legacy shims still allow silent drift.
- **Tests/verification:** ⚠️ Partial. There is basic automated coverage for the stable slice (orchestrator integration + foundation smoke); broader validation remains manual and will be expanded in Milestone 4.
- **TypeScript migration:** ⚠️ Largely complete for core engine and Swooper Maps entrypoints, but some shims/edge modules remain and need cleanup and tests (see `milestones/M1-TS-typescript-migration.md`).

## 4. Milestone Plan

Engine refactor work is organized into milestones. Each milestone is intended to deliver a complete, usable unit of value and leave the mod in a working state.

### 4.1 Milestone 1 — TypeScript Migration & Package Architecture

**Status:** In progress (majority complete)  
**Milestone doc:** `milestones/M1-TS-typescript-migration.md`

**Intent**

Transform the legacy monolithic JavaScript mapgen stack into typed, testable TypeScript packages that can run both in Civ7 and in headless tooling.

**Key Outcomes**

- `packages/mapgen-core` established as the primary engine package.
- Core orchestration, world model, and major layers ported to TypeScript.
- Swooper Maps mod scripts use TypeScript entrypoints and build tooling.
- Basic pnpm-based build/test wiring in place.

**Residual Work / Carry-Over**

- Clean up remaining JavaScript shims or mixed TS/JS modules.
- Tighten types around configuration and context to avoid `any` escape hatches.
- Ensure the final TS layout matches the package architecture assumed by later milestones.

These residual tasks are tracked in the milestone doc and will be completed across Milestones 2–4 as the engine stabilizes.

### 4.2 Milestone 2 — Stable Shape & Instrumented Engine Slice

**Status:** Planned  
**Milestone doc:** `milestones/M2-stable-engine-slice.md`  
**Depends on:** Milestone 1, plus feature PRDs:

- `resources/_archive/PRD-config-refactor.md` (legacy config hygiene plan)
- `PRD-plate-generation.md`

**Intent**

Establish a minimal but production-ready slice of the new engine architecture: validated config and a modern plate/foundation stack wired into Swooper Maps with strong diagnostics via the existing `MapOrchestrator`-centric flow, while leaving most downstream stages in their existing form.

**M2 ↔ M3 boundary (config/behavior vs. architecture):** M2 is about a stable, reliable orchestrator‑centric engine slice, and it owns config parity/wiring and behavioral correctness for that slice (foundation + minimal story + diagnostics) where those configs are meaningful today. M3 is about architectural parity (Task Graph, steps, canonical products) and the config/behavior work that only makes sense once those primitives exist, to avoid double‑refactoring.

**Scope**  
See `milestones/M2-stable-engine-slice.md` for detailed scope, dependency mapping, and sequencing. At a high level, this milestone covers:

- **Config hygiene (Phase 1)**
  - Define `MapGenConfigSchema` and `MapGenConfig` as the canonical engine config.
  - Implement `parseConfig` and fail-fast validation at engine entry.
  - Refactor `MapOrchestrator` and bootstrap/tunables to consume validated config instead of globals.
  - Preserve external config shape for Swooper Maps; no large-scale reshaping yet.

- **Foundation / plate generation**
  - Implement `MeshBuilder`, `CrustGenerator`, `PlatePartitioner`, and `TectonicEngine` according to `foundation.md` and `PRD-plate-generation.md`.
  - Ensure these strategies populate the foundation data products (mesh, crust, plate graph, tectonics) and expose `FoundationContext` as the legacy bridge.
  - Ensure deterministic behavior and basic performance targets on typical map sizes.

- **Diagnostics & instrumentation**
  - Ensure `[Foundation]` diagnostics are wired to the orchestrated foundation slice (seed/plate/dynamics/surface logs, ASCII maps, histograms).
  - Add basic stage-level logging around the foundation slice (start/finish, duration, errors).

- **Minimal story parity**
  - Restore margins/hotspots/rifts (± orogeny) via orchestrator story stages to re‑enable narrative‑aware consumers.
  - See `issues/CIV-36-story-parity.md` under parent `issues/CIV-21-story-tagging.md`.

**Out of Scope (Milestone 2)**

- Full config shape evolution or tunables retirement.
- Refactoring non-foundation phases (climate, overlays, biomes, placement) into first-class pipeline steps.
- Full story system modernization (corridors, swatches, paleo, canonical overlays, step wrapping).
- Comprehensive test suite or manifest validator (those land in Milestone 4, with some groundwork here).

**Exit Criteria**

- Engine can run the `foundation` slice via `MapOrchestrator` using validated config.
- Plate generation is powered by the new mesh–crust–partition–physics stack.
- ~~Existing Swooper Maps presets still generate valid maps via the legacy downstream stages.~~  
  **Update (2025-12-21, M4 planning):** Presets are removed in M4; entry becomes explicit recipe + settings selection. See `milestones/M4-target-architecture-cutover-legacy-cleanup.md`.
- Diagnostics clearly report foundation behavior and stage flow.

### 4.3 Milestone 3 — Core Engine Refactor & Config Shape Evolution

**Status:** Planned  
**Milestone doc:** `../../_archive/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`  
**Depends on:** Milestones 1–2

**Intent**

Extend the task-graph architecture and data-product model across the full engine, while reshaping configuration to match the long-term design. This is where most core refactoring happens, including introducing generic pipeline primitives on top of the stable M2 slice.

**Scope**  
See `../../_archive/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md` for detailed scope and sequencing. At a high level, this milestone covers:

- **Config integration and evolution**
  - Use `RunRequest.settings` + recipe config as the run boundary (no `context.config` global overrides).
  - Map `PlateGenerationConfig` and other domain configs into sub-schemas within `MapGenConfig`.
  - Flatten and rationalize the external config shape into step-aligned groups (e.g., `plates`, `landmass`, `mountains`, `climate`, `story`, `placement`, `diagnostics`).
  - Provide adapters for older config shapes where necessary to ease migrations.

- **Pipeline generalization**
  - Define and implement `MapGenStep`, `StepRegistry`, `MapGenContext` (including artifacts), and `PipelineExecutor` per the architecture docs.
  - Wrap legacy hydrology, climate, narrative, biome, and placement logic in `MapGenStep`s (e.g., `LegacyHydrologyStep`), then progressively refactor internals.
  - Enforce phase boundaries (`setup`, `foundation`, `morphology`, `hydrology`, `ecology`, `placement`), and ensure each step declares `requires`/`provides`.
  - Remove direct `WorldModel` usage from new steps; `MapGenContext` artifacts/buffers become canonical, and narrative is expressed as explicit story entry artifacts (with derived views for inspection/debug).

- **Data products and cluster alignment**
  - Solidify `FoundationContext`, `Heightfield`, `ClimateField`, and narrative story entries (typed story entry artifacts by motif; derived views for inspection/debug) as core data products.
  - Ensure clusters follow the target topology and consume these products instead of ad-hoc globals.

**Exit Criteria**

- All major stages (foundation, morphology, hydrology/climate, overlays, biomes, placement) run as pipeline steps with explicit dependencies.
- Config shape matches the step/phase architecture; tunables are either retired or reduced to a thin compatibility shim.
- New data products are the canonical inputs for downstream logic; legacy flows are optional or removed.

### 4.4 Milestone 4 — Target Architecture Cutover & Legacy Cleanup

**Status:** Planned  
**Milestone doc:** `milestones/M4-target-architecture-cutover-legacy-cleanup.md`  
**Depends on:** Milestones 1–3

**Intent**

Harden the engine with automated tests, manifest validation, and cleanup. This milestone closes remaining TS migration carry-over work and removes legacy fallbacks.

**Scope**  
See `milestones/M4-target-architecture-cutover-legacy-cleanup.md` for detailed scope and sequencing. At a high level, this milestone covers:

- **Testing**
  - ~~Add Vitest smoke tests for the orchestrator and pipeline using a stub adapter and representative presets.~~  
    **Update (2025-12-21, M4 planning):** M4 uses Bun smoke tests; inputs are explicit recipe + settings selection (no presets). See `milestones/M4-target-architecture-cutover-legacy-cleanup.md`.
  - Add targeted tests for foundation, climate, narrative, and placement steps where feasible.
  - ~~Introduce regression tests for key map presets to guard against unintended changes.~~  
    **Update (2025-12-21, M4 planning):** Regression tests are recipe+settings selections (no preset resolution). See `milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

- **Manifest & data-product validation**
  - Implement a lightweight validator that ensures `requires` inputs are present before a step runs.
  - Validate that required data products (artifacts/buffers) exist before consumers execute, including narrative story entries when required by downstream steps.

- **Cleanup & TS migration finish**
  - Remove remaining JS shims and deprecated paths.
  - Remove legacy fallbacks and "null" adapters that produce empty maps.
  - Clean up configuration/tunables shims once all consumers have been migrated.

**Exit Criteria**

- Engine has a basic automated safety net and manifest validation.
- TS migration is fully complete; code is consistently typed and structured.
- Legacy fallbacks are removed; failures surface early and loudly.

## 5. Target Engine Shape

The milestones above converge on a target engine that follows the cluster topology and data-product model below.

### 5.1 Target Stage Topology

| Cluster | Stages | Required Inputs | Outputs |
| --- | --- | --- | --- |
| Foundations | `foundation`, `landmassPlates` | Engine seed, map dimensions, Civ Voronoi utilities | Plate seeds, plate tensors, initial landmask, `FoundationContext` |
| Morphology | `coastlines`, `mountains`, `volcanoes`, `lakes`, `terrainAdjust` | `FoundationContext`, heightfield buffer | Final heightfield, shore mask, margin metadata |
| Hydrology & Climate | `rivers`, `rainfallBaseline`, `climateRefine`, `humidity` | Heightfield, wind/currents, shore mask | Rainfall/humidity grids, water flow graph |
| Narrative | `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridors`, `storySwatches` | Heightfield, climate grids, plate tensors | Typed story entries by motif (derived views available for inspection/debug) |
| Biomes & Features | `biomes`, `features` | Heightfield, climate grids, narrative story entries | Final biomes/features, validation metrics |
| Placement & Finalization | `placement`, `finalize` | All prior fields | Player starts, resources, discoveries |

### 5.2 Data Products

- `FoundationContext`: immutable snapshot bundling plate IDs, boundary metadata, uplift/rift fields, wind/currents, shared seeds.
- `Heightfield`: staged terrain buffer (elevation + terrain) flushed to the engine only at cluster boundaries.
- `ClimateField`: rainfall/humidity/temperature arrays (read-only to consumers; authored by climate engine).
- Narrative story entries: typed, versioned motif records; narrative views are derived snapshots for inspection/debug only.

### 5.3 Guiding Principles

- **One source of truth:** Foundations (tectonics, climate primitives) originate from a single module and feed every downstream stage.
- **Explicit data contracts:** Stages declare required inputs and emitted outputs.
- **Physics before narrative:** Morphology and climate operate on the finished heightfield before narrative story entry publication and placement.
- **Determinism & observability:** Shared seeds and logging ensure reproducibility; diagnostics track data products instead of implicit state.
- **No optional physics:** Physics stack is always on; legacy non-physics flows become opt-in extensions.
- **Voronoi physics stack:** The Civ VII Voronoi + physics integration is canonical; “legacy” never reuses the Voronoi label.

## 6. Risks & Mitigations

- **Complex migration:** ~~Proceed cluster-by-cluster and milestone-by-milestone; keep feature flags scoped to staging and preserve working presets at each step.~~  
  **Update (2025-12-21, M4 planning):** Preserve working recipe+settings selections (not presets) at each step. See `milestones/M4-target-architecture-cutover-legacy-cleanup.md`.
- **Performance regressions:** Instrument buffer operations and pipeline timings; cache expensive computations (Voronoi, climate) for diagnostics where needed.
- **Manifest drift:** Enforce manifests with data-product validation to prevent entropy; keep `requires`/`provides` definitions close to step implementations.
- **Config churn:** ~~Use adapters and clear deprecation periods when evolving config shapes; keep `MapGenConfig` as the single source of truth.~~  
  **Update (2025-12-21, M4 planning):** `RunRequest = { recipe, settings }` and compiled `ExecutionPlan` are the boundary/source of truth; legacy `MapGenConfig` is transitional only. See `milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

## 7. Links & References

- **Milestones**
  - `milestones/M1-TS-typescript-migration.md`
  - `milestones/M2-stable-engine-slice.md`
  - `../../_archive/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`
  - `milestones/M4-target-architecture-cutover-legacy-cleanup.md`
- **Feature PRDs**
  - `resources/_archive/PRD-config-refactor.md`
  - `resources/PRD-pipeline-refactor.md`
  - `resources/PRD-plate-generation.md`
  - `resources/PRD-target-task-graph-runtime.md`
  - `resources/PRD-target-registry-and-tag-catalog.md`
  - `resources/PRD-target-context-and-dependency-contract.md`
  - `resources/PRD-target-narrative-and-playability.md`
  - `resources/PRD-target-observability-and-validation.md`
- **System docs**
  - `../../system/mods/swooper-maps/architecture.md`
  - `../../system/libs/mapgen/architecture.md`
  - `../../system/libs/mapgen/foundation.md`
  - `../../system/libs/mapgen/morphology.md`
  - `../../system/libs/mapgen/hydrology.md`
  - `../../system/libs/mapgen/ecology.md`
  - `../../system/libs/mapgen/narrative.md`
- **Code & diagnostics**
  - `mods/mod-swooper-maps/mod/maps/` (orchestrator, layers, bootstrap, world model).
  - `mods/mod-swooper-maps/mod/maps/bootstrap/dev.js` (diagnostics).
  - `mods/mod-swooper-maps/mod/maps/core/types.js` (types/contexts).
  - `mods/mod-swooper-maps/mod/maps/bootstrap/resolved.js`, `mods/mod-swooper-maps/mod/maps/bootstrap/tunables.js` (config resolution).

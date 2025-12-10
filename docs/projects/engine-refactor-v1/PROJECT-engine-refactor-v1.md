# PROJECT: MAPS Engine Refactor v1

**Status:** Active  
**Timeline:** Milestone-based — aligns with Swooper Maps feature cadence  
**Teams:** Swooper Maps (solo / AI-assisted)

## 1. Purpose & Context

Swooper Maps is a large-scale procedural map generation mod for Civilization VII that aims to deliver:

- Physics-based terrain generation using Voronoi plate tectonics.
- Climate simulation with baseline, swatch, and refinement layers.
- Narrative overlay system for geological storytelling.
- Stage manifest-based orchestration and map presets.

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
- Supporting non-standard engine embeddings beyond Civ7 + QuickJS.

## 3. Current Status (Snapshot)

- **Foundations and morphology:** ✅ Complete. Voronoi-only landmass pipeline, deterministic `PlateSeedManager`, `FoundationContext` emitted and asserted, heightfield buffers in place. Mountains/volcanoes, coasts, and landmass generation consume the physics stack.
- **Climate:** ⚠️ Partial. Climate engine is centralized and rivers run after baseline, but consumers still read `GameplayMap` instead of `ClimateField`; river flow data is not published.
- **Narrative overlays:** ⏳ Not modernized. Margin overlays exist, but other story passes still mutate `StoryTags` directly and do not publish immutable overlays.
- **Biomes/features/placement:** ⏳ Legacy read paths (`GameplayMap` + `StoryTags`). No overlay/`ClimateField` consumption yet.
- **Manifest enforcement:** ⏳ Manifest describes `requires`/`provides`, but no runtime validator for data products; legacy shims still allow silent drift.
- **Tests/verification:** ⏳ No automated smoke for the orchestrator/context; verification is manual via diagnostics.
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

- `PRD-config-refactor.md` (Phase 1)
- `PRD-pipeline-refactor.md` (Phase 1)
- `PRD-plate-generation.md`

**Intent**

Establish a minimal but production-ready slice of the new engine architecture: validated config, task-graph pipeline, and modern plate/foundation stack, all wired into Swooper Maps with strong diagnostics, while leaving most downstream stages in their existing form.

**Scope**  
See `milestones/M2-stable-engine-slice.md` for detailed scope, dependency mapping, and sequencing. At a high level, this milestone covers:

- **Config hygiene (Phase 1)**
  - Define `MapGenConfigSchema` and `MapGenConfig` as the canonical engine config.
  - Implement `parseConfig` and fail-fast validation at engine entry.
  - Refactor `MapOrchestrator` and bootstrap/tunables to consume validated config instead of globals.
  - Preserve external config shape for Swooper Maps; no large-scale reshaping yet.

- **Pipeline core plumbing (Phase 1)**
  - Define `MapGenStep`, `StepRegistry`, `MapGenContext`, and `PipelineExecutor` per the architecture docs.
  - Refactor `MapOrchestrator` to:
    - Construct `MapGenContext` (including `config`, RNG, adapter, fields/artifacts).
    - Execute a pipeline recipe for the `foundation` phase via the executor.
    - Bridge results into the legacy `WorldModel` where needed for downstream stages.

- **Foundation / plate generation**
  - Implement `MeshBuilder`, `CrustGenerator`, `PlatePartitioner`, and `TectonicEngine` according to `foundation.md` and `PRD-plate-generation.md`.
  - Wrap these strategies as `MapGenStep`s in the `foundation` phase.
  - Populate `context.artifacts.mesh`, `crust`, `plateGraph`, and `tectonics`, and expose `FoundationContext` as the legacy bridge.
  - Ensure deterministic behavior and basic performance targets on typical map sizes.

- **Diagnostics & instrumentation**
  - Ensure `[Foundation]` diagnostics are wired to the new pipeline (seed/plate/dynamics/surface logs, ASCII maps, histograms).
  - Add basic step-level logging around the executor (start/finish, duration, errors).

**Out of Scope (Milestone 2)**

- Full config shape evolution or tunables retirement.
- Refactoring non-foundation phases (climate, overlays, biomes, placement) into first-class steps.
- Comprehensive test suite or manifest validator (those land in Milestone 4, with some groundwork here).

**Exit Criteria**

- Engine can run via the new `foundation` pipeline slice using validated config.
- Plate generation is powered by the new mesh–crust–partition–physics stack.
- Existing Swooper Maps presets still generate valid maps via the legacy downstream stages.
- Diagnostics clearly report pipeline and foundation behavior.

### 4.3 Milestone 3 — Core Engine Refactor & Config Shape Evolution

**Status:** Planned  
**Milestone doc:** `milestones/M3-core-engine-refactor-config-evolution.md`  
**Depends on:** Milestones 1–2

**Intent**

Extend the task-graph architecture and data-product model across the full engine, while reshaping configuration to match the long-term design. This is where most core refactoring happens.

**Scope**  
See `milestones/M3-core-engine-refactor-config-evolution.md` for detailed scope and sequencing. At a high level, this milestone covers:

- **Config integration and evolution**
  - Embed `MapGenConfig` into `MapGenContext` consistently (`context.config`).
  - Map `PlateGenerationConfig` and other domain configs into sub-schemas within `MapGenConfig`.
  - Flatten and rationalize the external config shape into step-aligned groups (e.g., `plates`, `landmass`, `mountains`, `climate`, `story`, `placement`, `diagnostics`).
  - Provide adapters for older config shapes where necessary to ease migrations.

- **Pipeline generalization**
  - Wrap legacy hydrology, climate, narrative overlay, biome, and placement logic in `MapGenStep`s (e.g., `LegacyHydrologyStep`), then progressively refactor internals.
  - Enforce phase boundaries (`setup`, `foundation`, `morphology`, `hydrology`, `ecology`, `placement`), and ensure each step declares `requires`/`provides`.
  - Remove direct `WorldModel` usage from new steps; `MapGenContext` + overlays become canonical.

- **Data products and cluster alignment**
  - Solidify `FoundationContext`, `Heightfield`, `ClimateField`, and `StoryOverlays` as the core data products.
  - Ensure clusters follow the target topology (see Section 5.1) and consume these products instead of ad-hoc globals.

**Exit Criteria**

- All major stages (foundation, morphology, hydrology/climate, overlays, biomes, placement) run as pipeline steps with explicit dependencies.
- Config shape matches the step/phase architecture; tunables are either retired or reduced to a thin compatibility shim.
- New data products are the canonical inputs for downstream logic; legacy flows are optional or removed.

### 4.4 Milestone 4 — Tests, Validation & Cleanup

**Status:** Planned  
**Milestone doc:** `milestones/M4-tests-validation-cleanup.md`  
**Depends on:** Milestones 1–3

**Intent**

Harden the engine with automated tests, manifest validation, and cleanup. This milestone closes remaining TS migration carry-over work and removes legacy fallbacks.

**Scope**  
See `milestones/M4-tests-validation-cleanup.md` for detailed scope and sequencing. At a high level, this milestone covers:

- **Testing**
  - Add Vitest smoke tests for the orchestrator and pipeline using a stub adapter and representative presets.
  - Add targeted tests for foundation, climate, overlays, and placement steps where feasible.
  - Introduce regression tests for key map presets to guard against unintended changes.

- **Manifest & data-product validation**
  - Implement a lightweight validator that ensures `requires` inputs are present before a step runs.
  - Validate that data products like `FoundationContext`, `Heightfield`, `ClimateField`, and `StoryOverlays` exist before consumers execute.

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
| Narrative Overlays | `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`, `storyCorridors`, `storySwatches` | Heightfield, climate grids, plate tensors | Overlay layers (`corridors`, `hotspots`, `swatches`, etc.) |
| Biomes & Features | `biomes`, `features` | Heightfield, climate grids, overlays | Final biomes/features, validation metrics |
| Placement & Finalization | `placement`, `finalize` | All prior fields | Player starts, resources, discoveries |

### 5.2 Data Products

- `FoundationContext`: immutable snapshot bundling plate IDs, boundary metadata, uplift/rift fields, wind/currents, shared seeds.
- `Heightfield`: staged terrain buffer (elevation + terrain) flushed to the engine only at cluster boundaries.
- `ClimateField`: rainfall/humidity/temperature arrays (read-only to consumers; authored by climate engine).
- `StoryOverlays`: structured map of sparse overlays (corridors, hotspots, active/passive margins).

### 5.3 Guiding Principles

- **One source of truth:** Foundations (tectonics, climate primitives) originate from a single module and feed every downstream stage.
- **Explicit data contracts:** Stages declare required inputs and emitted outputs.
- **Physics before narrative:** Morphology and climate operate on the finished heightfield before story overlays/placement.
- **Determinism & observability:** Shared seeds and logging ensure reproducibility; diagnostics track data products instead of implicit state.
- **No optional physics:** Physics stack is always on; legacy non-physics flows become opt-in extensions.
- **Voronoi physics stack:** The Civ VII Voronoi + physics integration is canonical; “legacy” never reuses the Voronoi label.

## 6. Risks & Mitigations

- **Complex migration:** Proceed cluster-by-cluster and milestone-by-milestone; keep feature flags scoped to staging and preserve working presets at each step.
- **Performance regressions:** Instrument buffer operations and pipeline timings; cache expensive computations (Voronoi, climate) for diagnostics where needed.
- **Manifest drift:** Enforce manifests with data-product validation to prevent entropy; keep `requires`/`provides` definitions close to step implementations.
- **Config churn:** Use adapters and clear deprecation periods when evolving config shapes; keep `MapGenConfig` as the single source of truth.

## 7. Links & References

- **Milestones**
  - `milestones/M1-TS-typescript-migration.md`
  - `milestones/M2-stable-engine-slice.md`
  - `milestones/M3-core-engine-refactor-config-evolution.md`
  - `milestones/M4-tests-validation-cleanup.md`
- **Feature PRDs**
  - `resources/PRD-config-refactor.md`
  - `resources/PRD-pipeline-refactor.md`
  - `resources/PRD-plate-generation.md`
- **System docs**
  - `../../system/mods/swooper-maps/architecture.md`
  - `../../system/libs/mapgen/architecture.md`
  - `../../system/libs/mapgen/foundation.md`
  - `../../system/libs/mapgen/design.md`
- **Code & diagnostics**
  - `mods/mod-swooper-maps/mod/maps/` (orchestrator, layers, bootstrap, world model).
  - `mods/mod-swooper-maps/mod/maps/bootstrap/dev.js` (diagnostics).
  - `mods/mod-swooper-maps/mod/maps/core/types.js` (types/contexts).
  - `mods/mod-swooper-maps/mod/maps/bootstrap/resolved.js`, `mods/mod-swooper-maps/mod/maps/bootstrap/tunables.js` (config resolution).

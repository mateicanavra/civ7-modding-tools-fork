# PRD: Plate & Landmass Generation

## 1. Overview

This document defines the requirements for the **Foundation Stage** of the map generation pipeline. The goal is to replace the legacy "nearest-neighbor" plate generation with a robust **Mesh -> Crust -> Partition -> Physics** model to improve map realism and stability.

**Key Objectives:**
1.  **Realism:** Generate organic continents and island chains using weighted plate partitioning.
2.  **Physics:** Drive mountain uplift and rift valleys via vector simulation rather than random noise.
3.  **Ownership:** Remove reliance on opaque game engine utilities by owning the mesh generation stack.
4.  **Stability:** Eliminate "silent failures" and ensure reproducible results via Lloyd relaxation.
5.  **Decoupling:** Separate kinematic plate boundaries from material landmass definitions to support realistic continental shelves and passive margins.

---

## 2. Problem Statement

The current plate generation system has several critical flaws:
*   **"Wall of Mountains":** The legacy logic often creates artificial, straight lines of mountains due to poor boundary resolution.
*   **Uniform Plates:** All plates tend to be roughly the same size, preventing the formation of realistic "Continental" vs "Oceanic" plates.
*   **Broken Fallback:** The fallback Voronoi implementation (used when game engine utils fail) is broken, leading to empty maps in test environments.
*   **Opaque Physics:** Mountain placement is based on "scoring" rather than physical forces, making it hard to tune.

---

## 3. Requirements

### 3.1. Functional Requirements
*   **REQ-FND-1 (Mesh):** The system must generate a regularized Voronoi mesh to serve as the simulation board.
*   **REQ-FND-2 (Crust):** The system must generate a `CrustMask` (Continental vs. Oceanic) independent of plate boundaries, supporting "Craton" seeding for stable continental cores.
*   **REQ-FND-3 (Partitioning):** The system must support "Major" and "Minor" plate types (kinematic scale, not material), with configurable counts and strengths.
*   **REQ-FND-4 (Physics):** The system must:
    *   Calculate `upliftPotential` (convergence), `riftPotential` (divergence), and `shearStress` (transform) based on relative plate velocity vectors.
    *   Resolve interaction type based on Crust Type (Cont-Cont Collision vs. Ocean-Cont Subduction vs. Ocean-Ocean).
    *   Output `volcanism` and `fracture` tensors derived from subduction zones and shear.
    *   Support **Iterative Accumulation** (Eras) via a `cumulativeUplift` buffer.
*   **REQ-FND-5 (Output / Delivery Contract):** The stage must publish its data products in a way compatible with the hybrid pipeline:
    *   **Canonical consumer contract:** `ctx.foundation` must be set to a `FoundationContext` snapshot and must satisfy the dependency tag `artifact:foundation` (the M2/M3 consumer boundary for “foundation physics”).
    *   **Intermediate foundation artifacts:** `RegionMesh`, `CrustData`, `PlateGraph`, and `TectonicData` must be published via `ctx.artifacts` as tagged data products (rather than a bespoke nested object). Adopt dependency-tag keys (for example `artifact:regionMesh`, `artifact:crustData`, `artifact:plateGraph`, `artifact:tectonicData`) so future steps can declare `requires`/`provides` against them.
    *   **Step structure:** The Mesh/Crust/Partition/Physics sequence may be implemented as one composite `foundation` step or as multiple `MapGenStep`s, but the *published contracts* above must be satisfied at the end of the Foundation stage.

### 3.2. Non-Functional Requirements
*   **REQ-PERF-1:** Mesh generation (4000 cells) must complete in under 100ms on standard hardware.
*   **REQ-STAB-1:** The system must be deterministic given a seed.
*   **REQ-COMP-1:** The implementation must run in the Civ7 QuickJS environment (ES2020 compatible).

---

## 4. System Design

The architectural design, data models, and algorithms for this stage are defined in the canonical system documentation.

*   **Canonical Design:** [`docs/system/libs/mapgen/foundation.md`](../../../system/libs/mapgen/foundation.md)
*   **Architecture:** [`docs/system/libs/mapgen/architecture.md`](../../../system/libs/mapgen/architecture.md)
*   **Binding Contract (M2 Slice):** [`docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md`](./CONTRACT-foundation-context.md)

Implementers should refer to `foundation.md` for the specific math behind Lloyd Relaxation, Weighted Flood Fill, and Vector Collision.

---

## 5. Execution Plan

### Phase 1: Infrastructure & Dependencies
*   Install `d3-delaunay` and configure `tsup` to bundle it.
*   Define the `RegionMesh`, `CrustData`, `PlateGraph`, and `TectonicData` interfaces in `core/types.ts`.
*   Ensure the configuration parameters required for plate generation are represented in, and validated by, the shared `MapGenConfig` schema (see `PRD-config-refactor.md`, Phase 1).

### Phase 2: Strategy Implementation
*   Implement `MeshBuilder` (Voronoi/Lloyd).
*   Implement `CrustGenerator` (Craton/Noise).
*   Implement `PlatePartitioner` (Flood Fill).
*   Implement `TectonicEngine` (Vector Physics with Material-Aware Interactions).

### Phase 3: Integration
*   Wire the strategies into the current `MapOrchestrator`-centric stable slice (M2).
*   Wrap the strategies as `MapGenStep`s and register them via `StepRegistry` / `PipelineExecutor` (hybrid architecture). Use dependency tags for `requires`/`provides` wiring and publish the artifacts described in **REQ-FND-5**.
*   Implement the "Legacy Bridge" as an explicit projection from the Foundation outputs (`ctx.foundation` + tagged artifacts) into any legacy consumer surface that still expects `WorldModel`-style data. Avoid making downstream stages depend on a `WorldModel` singleton as their primary interface.

---

## 6. Technical Implementation Notes

*   **Library Selection:** We have selected **`d3-delaunay`** (based on Delaunator) over the game's internal `VoronoiUtils` or `typescript-voronoi`.
    *   *Reasoning:* Delaunator is significantly faster (5-10x), actively maintained, and produces identical mathematical results. It allows us to run the engine in a headless test environment without mocking game internals.
*   **WrapX Support:** Horizontal map wrapping (cylindrical worlds) is **out of scope** for v1.
    *   *Note:* Civ7 defaults to `wrapX: 0`. We will implement standard bounded Voronoi first. Wrapping logic can be added later by duplicating "ghost sites" at the boundaries during mesh generation.
*   **Crust-Plate Decoupling:** The `CrustMask` (Continental/Oceanic) is generated *before* plates are defined, ensuring that landmasses can exist in the middle of plates (Passive Margins like East Coast USA) or span across plate boundaries. This supports realistic geology where a single plate can contain both ocean and continent.
*   **Material-Aware Physics:** Tectonic interactions must resolve differently based on crust types:
    *   Continent-Continent Convergence → High Uplift, Low Volcanism (Himalayas)
    *   Ocean-Continent Convergence → Medium Uplift, High Volcanism (Andes/Subduction)
    *   Ocean-Ocean Convergence → Low Uplift, Island Arcs (Japan)
*   **Iterative Simulation (Eras):** The Foundation stage can be run in multiple passes to simulate geologic history. Each era accumulates uplift into `cumulativeUplift`, allowing ancient mountain ranges to be represented alongside modern tectonics.
*   **Legacy Bridge:** Treat `ctx.foundation` (and tagged artifacts) as the canonical Foundation outputs. If legacy morphology code still depends on `WorldModel`-shaped data, provide an explicit bridge/shim to project from the Foundation outputs into that shape, rather than having downstream stages read global singleton state.
*   **Performance:** Default cell count should be **4000**. This provides sufficient resolution for a "Large" map (approx 10k hexes) while keeping Voronoi generation time negligible (~10ms).

---

## 7. Dependencies

This PRD depends on the configuration hygiene work described in `PRD-config-refactor.md`:

* The plate/foundation parameters described here must be modeled as part of `MapGenConfig` and validated at engine startup.
* The Foundation stage should read its configuration through `MapGenContext.config`, consistent with the engine architecture in `docs/system/libs/mapgen/architecture.md`.

While exploratory work on the Foundation algorithms can begin earlier, production
integration of the Foundation stage into the pipeline should assume Phase 1 of
the config refactor is in place. Milestone ownership and timing for this work is
tracked in the engine-level project brief (`PROJECT-engine-refactor-v1.md`) and milestone
docs (for example, `milestones/M2-stable-engine-slice.md`).

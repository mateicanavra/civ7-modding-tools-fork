# PRD: Plate & Landmass Generation

## 1. Overview

This document defines the requirements for the **Foundation Stage** of the map generation pipeline. The goal is to replace the legacy "nearest-neighbor" plate generation with a robust **Mesh -> Partition -> Physics** model to improve map realism and stability.

**Key Objectives:**
1.  **Realism:** Generate organic continents and island chains using weighted plate partitioning.
2.  **Physics:** Drive mountain uplift and rift valleys via vector simulation rather than random noise.
3.  **Ownership:** Remove reliance on opaque game engine utilities by owning the mesh generation stack.
4.  **Stability:** Eliminate "silent failures" and ensure reproducible results via Lloyd relaxation.

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
*   **REQ-FND-2 (Partitioning):** The system must support "Major" (Continental) and "Minor" (Oceanic) plate types, with configurable counts and strengths.
*   **REQ-FND-3 (Physics):** The system must calculate `upliftPotential` (convergence), `riftPotential` (divergence), and `shearStress` (transform) based on relative plate velocity vectors.
*   **REQ-FND-4 (Output):** The stage must produce an immutable `FoundationContext` containing the Mesh, PlateGraph, and Tectonic tensors.

### 3.2. Non-Functional Requirements
*   **REQ-PERF-1:** Mesh generation (4000 cells) must complete in under 100ms on standard hardware.
*   **REQ-STAB-1:** The system must be deterministic given a seed.
*   **REQ-COMP-1:** The implementation must run in the Civ7 QuickJS environment (ES2020 compatible).

---

## 4. System Design

The architectural design, data models, and algorithms for this stage are defined in the canonical system documentation.

*   **Canonical Design:** [`docs/system/libs/mapgen/foundation.md`](../../../system/libs/mapgen/foundation.md)
*   **Architecture:** [`docs/system/libs/mapgen/architecture.md`](../../../system/libs/mapgen/architecture.md)

Implementers should refer to `foundation.md` for the specific math behind Lloyd Relaxation, Weighted Flood Fill, and Vector Collision.

---

## 5. Execution Plan

### Phase 1: Infrastructure & Dependencies
*   Install `d3-delaunay` and configure `tsup` to bundle it.
*   Define the `RegionMesh` and `PlateGraph` interfaces in `core/types.ts`.

### Phase 2: Strategy Implementation
*   Implement `MeshBuilder` (Voronoi/Lloyd).
*   Implement `PlatePartitioner` (Flood Fill).
*   Implement `TectonicEngine` (Vector Physics).

### Phase 3: Integration
*   Wire the strategies into the `MapOrchestrator` via the new `StepRegistry`.
*   Implement the "Legacy Bridge" to sync the new `FoundationContext` to the old `WorldModel` singleton (to keep downstream morphology scripts working).

---

## 6. Technical Implementation Notes

*   **Library Selection:** We have selected **`d3-delaunay`** (based on Delaunator) over the game's internal `VoronoiUtils` or `typescript-voronoi`.
    *   *Reasoning:* Delaunator is significantly faster (5-10x), actively maintained, and produces identical mathematical results. It allows us to run the engine in a headless test environment without mocking game internals.
*   **WrapX Support:** Horizontal map wrapping (cylindrical worlds) is **out of scope** for v1.
    *   *Note:* Civ7 defaults to `wrapX: 0`. We will implement standard bounded Voronoi first. Wrapping logic can be added later by duplicating "ghost sites" at the boundaries during mesh generation.
*   **Legacy Bridge:** The `MapOrchestrator` must explicitly copy `context.artifacts.tectonics` arrays into the `WorldModel` singleton after the Foundation stage runs. This is a temporary measure to avoid refactoring the entire Morphology layer in this PR.
*   **Performance:** Default cell count should be **4000**. This provides sufficient resolution for a "Large" map (approx 10k hexes) while keeping Voronoi generation time negligible (~10ms).

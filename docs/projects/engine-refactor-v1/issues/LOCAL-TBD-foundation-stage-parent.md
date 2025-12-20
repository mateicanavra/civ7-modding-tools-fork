---
id: LOCAL-TBD
title: Refactor Foundation Stage (Mesh -> Crust -> Partition -> Physics)
state: planned
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: [codex]
labels: [Improvement, Architecture, Technical Debt]
parent: null
children: [LOCAL-TBD-1, LOCAL-TBD-2, LOCAL-TBD-2.5, LOCAL-TBD-3, LOCAL-TBD-4, LOCAL-TBD-5]
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Replace the legacy "nearest-neighbor" plate generation with a robust, data-driven **Foundation Pipeline** composed of four atomic strategies: Voronoi Mesh, Crust Generation, Weighted Partitioning, and Vector Physics. This architecture explicitly decouples **Kinematics** (Plate Movement) from **Material** (Crust Type), enabling realistic passive margins and subduction zones.

## Deliverables
- **Core Infrastructure:** A functional `StepRegistry` and `MapGenContext` supporting the new Task Graph architecture.
- **Four Concrete Strategies:**
    1.  `core.mesh.voronoi`: Generates a Lloyd-relaxed mesh using `d3-delaunay`.
    2.  `core.crust.craton`: Generates Continental/Oceanic crust masks using Craton seeding, independent of plate boundaries.
    3.  `core.plates.weighted`: Partitions the mesh into "Major" and "Minor" plates via flood fill (kinematic scale, not material type).
    4.  `core.tectonics.standard`: Simulates vector physics with material-aware interactions (Subduction, Orogeny, Rifting) by intersecting the Plate Graph with the Crust Mask.
- **Integration:** A refactored `MapOrchestrator` that executes this pipeline and bridges the output to the legacy `WorldModel` for downstream compatibility.

## Acceptance Criteria
- [ ] **Pipeline Execution:** The `MapOrchestrator` successfully runs the Foundation stage via the `StepRegistry` based on a JSON config.
- [ ] **Mesh Quality:** The generated Voronoi mesh is regularized (via Lloyd relaxation) and covers the map bounds.
- [ ] **Crust Generation:** The map contains distinct Continental and Oceanic crust zones that do not perfectly align with plate boundaries (Passive Margins).
- [ ] **Plate Distribution:** The map contains a mix of large "Major" plates and smaller "Minor" plates, respecting the configuration (kinematic scale, not material).
- [ ] **Physics Output:** Tectonic tensors (`upliftPotential`, `riftPotential`, `volcanism`, `cumulativeUplift`) correctly reflect material-aware interactions (Subduction vs. Collision).
- [ ] **Legacy Compat:** Downstream stages (Morphology, Biomes) continue to function by reading from the bridged `WorldModel`.
- [ ] **Fail Fast:** Missing dependencies or configuration errors cause immediate, clear failures (no silent null maps).

## Testing / Verification
- **Unit Tests:** `pnpm test:mapgen` must pass for all new strategies.
- **Integration Test:** Run `civ7 map generate --json`.
- **Visual Verification:** Use the CLI to dump the `foundation` context and verify plate shapes and boundary intensity via ASCII logs.

## Dependencies / Notes
- **PRD:** [Plate & Landmass Generation](../resources/PRD-plate-generation.md)
- **Architecture:** [Map Generation Architecture](../../../system/libs/mapgen/architecture.md)
- **System Design:** [Foundation Stage Architecture](../../../system/libs/mapgen/foundation.md)

**Sub-Issues:**
- LOCAL-TBD-1: Establish Core Pipeline Infrastructure
- LOCAL-TBD-2: Implement Mesh Generation Strategy
- LOCAL-TBD-2.5: Implement Crust Generation Strategy
- LOCAL-TBD-3: Implement Plate Partitioning Strategy
- LOCAL-TBD-4: Implement Tectonic Physics Strategy
- LOCAL-TBD-5: Integrate Foundation Pipeline into Orchestrator

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

This refactor is broken down into 6 sequential steps (Sub-Issues). Each step must leave the codebase in a compilable state.

### Step 1: Core Pipeline Infrastructure
**Goal:** Establish the "Skeleton" (Types & Registry).
- Define `MapGenStep` interface with `phase`, `requires`, `provides`.
- Implement `StepRegistry` (simple Map-based plugin system).
- Update `MapGenContext` to split `fields` (Canvas) vs `artifacts` (Intermediate).
- Define `CrustData` interface with `type` and `age` arrays.
- **Outcome:** We can register dummy steps and pass a context around.

### Step 2: Mesh Generation Strategy
**Goal:** Build the "Board" (Voronoi Mesh).
- Install `d3-delaunay` and configure `tsup`.
- Implement `MeshBuilder` strategy.
- Logic: Generate random points -> Lloyd Relaxation -> Build `RegionMesh` (sites, neighbors, centroids).
- **Outcome:** `context.artifacts.mesh` is populated with a valid graph.

### Step 2.5: Crust Generation Strategy
**Goal:** Define the "Material" (Land Potential).
- Implement `CrustGenerator` strategy.
- Logic: Seed Cratons (ancient stable cores) -> Grow Continental crust using noise/distance fields -> Define Oceanic crust for remaining area.
- Generate `CrustData` with `type` (Continental=1, Oceanic=0) and `age` (Ancient=255, New=0) arrays.
- **Outcome:** `context.artifacts.crust` is populated, independent of plate boundaries.

### Step 3: Plate Partitioning Strategy
**Goal:** Create the "Pieces" (Plates - Kinematic, not Material).
- Implement `PlatePartitioner` strategy.
- Logic: Select N seeds (Major/Minor) -> Priority Queue Flood Fill -> Build `PlateGraph`.
- Note: Plate type (major/minor) refers to kinematic scale, NOT material. A single plate can contain both ocean and continent.
- **Outcome:** `context.artifacts.plateGraph` maps every mesh cell to a Plate ID.

### Step 4: Tectonic Physics Strategy
**Goal:** Simulate the "Dynamics" (Forces via Intersection Model).
- Implement `TectonicEngine` strategy.
- Logic: Identify boundary edges -> Calculate relative velocity vectors -> **Resolve Interaction based on Crust Type** -> Rasterize to grid.
- Material-aware resolution:
  - Cont-Cont Convergence → High Uplift, Low Volcanism (Himalayas)
  - Ocean-Cont Convergence → Medium Uplift, High Volcanism (Andes/Subduction)
  - Ocean-Ocean Convergence → Low Uplift, Island Arcs (Japan)
- Output: `volcanism`, `fracture`, and `cumulativeUplift` tensors in addition to uplift/rift/shear.
- **Outcome:** `context.artifacts.tectonics` contains all physics tensors.

### Step 5: Orchestrator Integration
**Goal:** Wire it up (The "Brain").
- Refactor `MapOrchestrator` to use **Constructor Injection** for the Adapter.
- Replace the hardcoded `computePlatesVoronoi` call with a `PipelineExecutor` loop.
- Implement the **Legacy Bridge**: Copy `context.artifacts.tectonics` and `context.artifacts.crust` -> `WorldModel` singleton.
- **Outcome:** The game generates maps using the new engine, but old biomes/rivers still work.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

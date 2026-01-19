# Phase 1: Morphology Current-State Spike

- Status: Draft / Evidence
- Author: System
- Date: 2025-05-18
- Scope: Inventory and analysis of the existing Morphology domain implementation.
- Reference: `mods/mod-swooper-maps/src/domain/morphology/` and `mods/mod-swooper-maps/src/recipes/standard/stages/`

## 1. Executive Summary

Current Morphology execution is distributed across three recipe stages: `morphology-pre`, `morphology-mid`, and `morphology-post`. While it successfully generates a playable heightmap, it suffers from Domain Bleed (owning logic that belongs in Hydrology) and Legacy Coupling (reliance on narrative overlays and magic numbers).

### Key Findings:

- Fragmentation: Logic is split arbitrarily between "Pre", "Mid", and "Post" stages without clear semantic distinction.
- Hydrology Leakage: The `morphology-mid` stage currently executes routing (Flow Routing), which Phase 0.5 explicitly assigns to the Hydrology domain.
- Overlay Dependency: The system currently relies on story/overlays to force shapes, violating the "Physics First" and "No Overlays" rules of the refactor.
- Opaque Inputs: Tectonic interactions are modeled loosely via `plateGraph` and `tectonics` steps in Foundation, but Morphology consumes them largely as static masks rather than dynamic stress vectors.

## 2. Domain Inventory

### 2.1 Pipeline Stages & Steps

Evidence location: `mods/mod-swooper-maps/src/recipes/standard/stages/`

| StageStep ID | Operation / Implementation | Notes |
| --- | --- | --- |
| morphology-prelandmassPlates | `ops/compute-landmasses` | Determines rough land/ocean shapes from plates. |
| coastlines | `ops/compute-coastline-metrics` | Calculates distance-to-coast; critical for downstream. |
| morphology-midgeomorphology | `ops/compute-geomorphic-cycle` | The heavy lifting: erosion, noise, heightmap sculpting. |
| ruggedCoasts | `ops/compute-base-topography` (partial) | Seems to re-apply noise for coastal roughness. |
| routing | `ops/compute-flow-routing` | [OUT OF SCOPE] Calculates flow directions. Belongs in Hydrology. |
| morphology-postmountains | `ops/plan-ridges-and-foothills` | Places mountain ranges. |
| volcanoes | `ops/plan-volcanoes` | Places volcanoes. |
| islands | `ops/plan-island-chains` | Adds island geometry. |
| landmasses | `ops/compute-landmask` | Finalizes the land/water boolean mask. |

### 2.2 Domain Operations (Ops)

Evidence location: `mods/mod-swooper-maps/src/domain/morphology/ops/`

- `compute-base-topography`: Generates raw noise fields.
- `compute-landmasses`: Uses plate data to define land blobs.
- `compute-coastline-metrics`: Derives distance fields from the land/water boundary.
- `compute-geomorphic-cycle`: Simulates erosion and weathering (hydraulic/thermal).
- `compute-flow-routing`: [Legacy] Computes downhill directions. Move to Hydrology.
- `compute-sea-level`: Determines the Z-slice for water.
- `compute-substrate`: Defines rock types (Sedimentary/Igneous). Good, keep for Ecology.
- `plan-ridges-and-foothills`: Specific mountain placement logic.
- `plan-volcanoes`: Point-based volcano placement.
- `plan-island-chains`: Seamount/hotspot logic.

### 2.3 Artifacts Produced

- GlobalHeightmap: The primary Float32Array elevation buffer.
- Landmask: Boolean or Uint8Array (1=Land, 0=Water).
- CoastlineDistance: Scalar field.
- FlowDirections: [Legacy] Currently produced here, moving to Hydrology.
- SubstrateMap: Rock types.

## 3. Current Contract Matrix

| Consumer | Input (From Morphology) | Usage | Status |
| --- | --- | --- | --- |
| Hydrology | GlobalHeightmap | Flow accumulation, river generation. | Keep. |
| Hydrology | FlowDirections | Routing water. | CHANGE: Hydrology should derive this itself. |
| Ecology | GlobalHeightmap | Temperature lapse rates (altitude cooling). | Keep. |
| Ecology | CoastlineDistance | Biome selection (Continentality). | Keep. |
| Ecology | SubstrateMap | Vegetation rules (soil types). | Keep. |
| Placement | Landmask | Valid plot checks for units/cities. | Keep. |
| Engine | TerrainType | [CRITICAL] Morphology currently might NOT output TerrainTypes directly, but `morphology-post/steps/mountains.ts` likely writes to the Engine's Terrain surface. | CHANGE: Must output an abstract artifact, not write to Engine. |

## 4. Legacy Surface Inventory

### 4.1 Narrative Overlays

- Evidence: `mods/mod-swooper-maps/src/recipes/standard/overlays.ts`
- The current pipeline explicitly imports `src/domain/narrative/overlays`.
- Impact: Overlays inject hard-coded shapes or masks that bypass the geomorphic simulation.
- Action: As per Phase 0.5, these must be removed. Shape control must move to Input Parameters (e.g., specific plate generation seeds or constraint maps) rather than post-process overwrites.

### 4.2 Hidden Constants & Magic Numbers

- Evidence: `mods/mod-swooper-maps/src/domain/morphology/config.ts`
- Many tuning values (erosion rates, noise scales, mountain thresholds) are likely buried in default strategy files (e.g., `strategies/default.ts` inside op folders) rather than exposed in a top-level schema.
- Action: These must be surfaced into the MorphologyConfig schema or defined as explicit internal constants.

## 5. Upstream Intake Scan (Foundation)

### Current Consumption:

- Morphology reads FoundationContext.
- Uses plates (ID map) and mesh (Voronoi geometry).

### Gap (vs Phase 0.5):

- No explicit PlateMotionVectors or Stress fields are currently consumed to drive orogeny.
- Mountains are likely placed based on simple "Edge Distance" logic rather than "Convergence Velocity".

## 6. Greenfield Delta Notes (Comparison to Phase 0.5)

| Feature | Phase 0.5 Vision | Current State (Phase 1) | Gap / Action |
| --- | --- | --- | --- |
| Orogeny | Derived from Tectonic Stress Vectors. | Derived from Plate Edge Proximity. | Major: Need vector math in Foundation to drive this. |
| Hydrology | Separate domain owns Flow Routing. | Morphology owns `compute-flow-routing`. | Refactor: Move routing step to Hydrology. |
| Volcanism | Physically simulated (Flux/Hotspots). | "Planned" (`plan-volcanoes`) via strategies. | Minor: Current strategy pattern is good, just needs physics inputs. |
| Bathymetry | First-class citizen (Continental Shelves). | Binary Land/Water focus. | Moderate: Need to ensure GlobalHeightmap includes negative values for ocean depth. |
| Overlays | BANNED. | Active part of the recipe. | Delete: Remove overlay steps. |

## 7. Downstream Consumer Risks

- Hydrology Breakage: Moving `compute-flow-routing` out of Morphology will break the current Hydrology stage if it expects those artifacts to already exist in the Context. Hydrology must be updated to run this op itself.
- Engine Projection: If `morphology-post` steps are writing directly to the C++ engine (e.g. `TerrainBuilder.setTerrain(...)`), this coupling must be broken. Morphology should output a POJO/TypedArray, and a separate Adapter step should write to the Engine.

## Lookback 1

- Did we invent new designs? No. We strictly cataloged the existing pre/mid/post structure and the ops within `src/domain/morphology`.
- Did we find the legacy overlays? Yes, `src/recipes/standard/overlays.ts` is the smoking gun.
- Is the upstream gap confirmed? Yes, Foundation provides plates, but not the rich vector data envisioned in Phase 0.5.
- Is the downstream leak confirmed? Yes, `compute-flow-routing` is currently residing in Morphology, confirming the need to move it to Hydrology.

# SPIKE: Hydrology Domain Current State Analysis (Phase 1)

- Status: Phase 1 Output (Current State)
- Author: Gemini
- Date: 2026-01-16
- Scope: Hydrology Domain (Legacy mod-swooper-maps)
- Reference: docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-greenfield.md (Phase 0.5)

## 1. Executive Summary

The current Hydrology domain is pipeline-fractured and heuristic-driven. Unlike the physics-based vision of Phase 0.5, the existing implementation treats Climate and Water as separate, loosely coupled concerns spread across three distinct pipeline stages (hydrology-pre, hydrology-core, hydrology-post).

Crucially, the current system relies on Designer Intervention ("Swatches" and "Refinements") to achieve playability, forcing specific climate bands and creating artificial "oasis" effects. This explicitly contradicts the target "Physics-First" architecture.

## 2. Domain Inventory

### 2.1 File & Module Inventory

The domain is currently split between domain/ logic and recipes/ orchestration.

| Location | Path | Responsibility |
| --- | --- | --- |
| Domain Logic | src/domain/hydrology/index.ts | Barrel file. |
| Domain Logic | src/domain/hydrology/config.ts | Config definitions (HydrologyConfig). |
| Domain Logic | src/domain/hydrology/ops.ts | Op definitions. |
| Climate Logic | src/domain/hydrology/climate/baseline.ts | Generates initial Temp/Moisture bands. |
| Climate Logic | src/domain/hydrology/climate/distance-to-water.ts | BFS for coastal distance. |
| Climate Logic | src/domain/hydrology/climate/orographic-shadow.ts | Heuristic for rain shadows. |
| Climate Logic | src/domain/hydrology/climate/refine/ | [KILL] Post-processing (Hotspots, River Corridors). |
| Climate Logic | src/domain/hydrology/climate/swatches/ | [KILL] Map-specific climate overrides (e.g., macro-desert-belt). |
| Pipeline Steps | src/recipes/standard/stages/hydrology-pre/ | Baseline Climate, Lakes. |
| Pipeline Steps | src/recipes/standard/stages/hydrology-core/ | Rivers (Flow Routing). |
| Pipeline Steps | src/recipes/standard/stages/hydrology-post/ | [KILL] Climate Refine (Adjusting biomes based on rivers). |

### 2.2 Functional Inventory (Capabilities)

- **Lake Generation:** Identifies depressions in the heightmap and fills them (Sink filling).
- **Flow Routing:** Calculates flow directions based on steepest descent (Planchon-Darboux).
- **River Definition:** Accumulates flow flux; thresholds define "River" vs "Stream".
- **Climate Baseline:** Generates Temperature/Moisture based on Latitude and Perlin noise.
- **Microclimates:** "Swatches" allow overriding climate rules. (To be removed)

## 3. Contract Matrix (Current)

### 3.1 Inputs (Upstream Dependencies)

The domain heavily relies on Morphology and Foundation.

| Source | Artifact / Field | Usage |
| --- | --- | --- |
| Foundation | VoronoiMesh | Topology for neighbor lookups and distance calcs. |
| Morphology | Elevation (Field) | Determines temperature (lapse rate) and flow direction. |
| Morphology | LandMask (Field) | Distinguishes Land vs Ocean (affects evaporation/distance). |
| Morphology | MountainMask (Field) | Used for rain shadow heuristics (rudimentary). |

### 3.2 Outputs (Downstream Consumers)

Hydrology produces artifacts consumed by Ecology and Placement.

| Consumer | Product | Usage |
| --- | --- | --- |
| Ecology | Moisture (Field) | Primary input for Biome classification (Whittaker diagram). |
| Ecology | Temperature (Field) | Primary input for Biome classification. |
| Placement | Rivers (Graph/Mask) | Used for start bias, fresh water modifiers, and unit movement costs. |
| Visuals | LakeMask | Used to render water bodies. |

## 4. Pipeline & Data Flow (The "Split" Problem)

The current pipeline executes in a disjointed order to solve the "River vs Rain" dependency loop:

- hydrology-pre: Calculates Baseline Climate (Temp/Rain). Identifies Lakes.
- hydrology-core: Calculates Rivers (Flow routing). Flux is currently topological (cell count), not physical (rain volume).
- hydrology-post: Refines Climate based on Rivers.

Critique: This stage exists to artificially "wet" areas near rivers ("Nile Paradox"). It represents a "Designer Thumb on the Scale" to fix the fact that the baseline climate didn't generate enough rain to justify the rivers, or simply to force gameplay zones.

Target State: Eliminate hydrology-post. River presence should be a result of Physics, and Soil Moisture (a new field) should be the interface for Ecology, naturally fed by rivers without modifying the Climate (Rainfall) map.

## 5. Greenfield Delta Analysis

Comparing Phase 0.5 (Ideal) vs Phase 1 (Reality).

| Feature | Phase 0.5 (Greenfield) | Phase 1 (Current State) | Delta / Friction |
| --- | --- | --- | --- |
| Wind | Vector Field Simulation (Hadley Cells). | Implicit / None. Static bands. | Major. Needs new data structure (GlobalWindField). |
| Rainfall | Advection (Transport) of moisture. | Perlin Noise + Latitude Bands. | Major. Current logic is static; new logic requires iterative simulation. |
| Rivers | Flux = Precip * Area. | Flux = Grid Cell Count (Topology). | Moderate. River graph logic exists but needs to accept a PrecipitationMap weight. |
| Control | Planetary Physics Knobs (Tilt, Temp). | "Swatches" & "Refinements" (Manual Paint). | Critical. The Swatch system must be deleted. |
| Orography | Physics-based Lift (Wind * Slope). | Heuristic "Shadow" checks. | High. Depends on Wind Vectors being present. |

### Constraints & Blockers

- MapConfig Types: The current MapConfig schema exposes "Swatch" selection directly (e.g. climateSwatch: "desert"). This needs to be migrated to a "Physical Parameters" schema (e.g. aridity: "dry" | "standard" | "wet") that drives internal physics constants.
- Migration: Existing maps (like shattered-ring) rely on swatches to break standard climate rules. They will look different under a pure physics engine. We accept this variance.

## 6. Lookback 1 (Current State Synthesis)

Key Insight:
The existing system is designed to fake a climate. The target system is designed to simulate a climate. There is no middle ground.

Strategy Shift:
- We are not preserving the "Swatch" or "Refine" systems.
- Delete src/domain/hydrology/climate/swatches/.
- Delete src/domain/hydrology/climate/refine/.
- Delete the hydrology-post pipeline stage.
- Replace the public schema climateSwatch knobs with high-level physical descriptors (dryness, temperature, seaLevel) that map to simulation constants (not texture overlays).

Next Step: Phase 2 Modeling will focus on the Atmosphere Subdomain as the primary driver of the pipeline, ensuring it produces the necessary precipitation inputs for the River graph without manual intervention.

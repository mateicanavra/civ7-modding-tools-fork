# PRD: Foundation — Plate & Tectonics Generation (Mesh → Crust → Partition → Tectonics)

## 1. Objective

Define the **canonical, Earth-like Foundation stage** for MapGen: a mesh-first plate tectonics system that produces crust/material signals and tectonic force fields, and publishes them as **explicit, versioned artifacts** under the M4/M5 architecture (`RunRequest → ExecutionPlan → PipelineExecutor`, registry-validated tags, `ctx.artifacts`).

This PRD is a north-star statement of the **desired algorithms and domain logic** (Voronoi mesh, crust-first substrate, plate partitioning, boundary physics). Current M5 tile-tensor logic is treated as baseline/legacy behavior and must not be re-enshrined as the target design.

## 2. Status (M5 baseline vs PRD target)

- **Already true in M5:** Recipe → `ExecutionPlan` orchestration, tag registry validation, and versioned Foundation consumer artifacts (`artifact:foundation.plates@v1`, `artifact:foundation.dynamics@v1`, etc.).
- **Not yet true (this PRD’s core value):** The consumer artifacts are not yet derived from the mesh/crust/partition/tectonics model (and some current implementations still couple to engine surfaces like `isWater` / `getVoronoiUtils`).
- **PRD posture:** Preserve the new architecture’s contract surfaces and determinism; upgrade the internal algorithms to the mesh-first physics model.

## 3. Scope & Ownership (Earth-first boundaries)

### 3.1 In scope

- The Foundation stage’s **physical substrate model**:
  - Simulation board geometry (region mesh)
  - Lithosphere substrate signals (crust type/age/thickness)
  - Kinematics (plate partition + motion)
  - Boundary physics (convergence/divergence/transform) and derived drivers (uplift/rift/shear/volcanism/fracture)
- The **artifact contracts** for those products (inputs/outputs, invariants, versioning, indexing).
- Explicit ownership boundaries between Foundation and Morphology (and other domains).

### 3.2 Out of scope

- Morphology’s “shape the surface” responsibilities: turning physics into land/ocean decisions, elevation, coasts, erosion, deposition.
- Hydrology/climate, ecology, narrative/playability, placement (consumers of the Foundation substrate).
- Engine adapter wiring details beyond requirements for engine-optional execution (Foundation must be runnable offline).

### 3.3 Ownership boundary (binding for this PRD)

This boundary is chosen for “Earth-like physical causality” and is a hard constraint on design and implementation.

**Foundation owns**
- Mesh topology and geometry invariants (wrap semantics, neighbor relationships, sampling/projection).
- Lithosphere substrate: crust signals that exist *before* land/ocean/elevation interpretation.
- Plate kinematics: plate identity per region, motion vectors/rotations, boundary classification.
- Tectonic force fields and long-term accumulation hooks (“eras”).
- Mantle/planetary drivers that are substrate-level (hotspots/plumes as physical sources, not “story motifs”).

**Morphology owns**
- Land/ocean decisions, sea level application, coastlines.
- Elevation shaping and erosion cycle.
- Turning “crust-first” + tectonics into playable landmass geometry.

**Hydrology/Climate owns**
- Climate fields derived from topography + landmask + winds (including orographic effects).

**Narrative owns**
- Interpretation and optional injections layered *on top* of physical substrate (motifs, corridors, themed features).

## 4. Canonical References

Internal (canonical for this repo):
- Algorithms & data products: `docs/system/libs/mapgen/foundation.md`
- Domain layering: `docs/system/libs/mapgen/architecture.md`
- Target architecture: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`
- Post‑M4 cleanup context: `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-2025-12-26-m5-clean-architecture-finalization-scope.md`

External (conceptual grounding):
- USGS (plate boundary types, plate motion concepts): https://pubs.usgs.gov/gip/dynamic/understanding.html
- Cortial et al. (2019), “Procedural Tectonic Planets” (procedural approximation of subduction/collision/rifting): https://hal.science/hal-02136820v1/file/2019-Procedural-Tectonic-Planets.pdf

## 5. Architecture Contract (M4/M5 framing)

### 5.1 Non-negotiables

- No legacy stage orchestration (`stageManifest`, `STAGE_ORDER`, runtime enablement/silent skips).
- Dependencies are expressed only via registry-validated `requires`/`provides` dependency tags.
- Artifacts are published/read only via `ctx.artifacts` (no `WorldModel`, no hidden module singletons).
- Foundation must be runnable in a fully offline test harness (adapter optional; no required engine reads such as `isWater`).

### 5.2 Foundation step decomposition (canonical IDs)

Foundation is a set of steps; the recipe chooses ordering and composition.

Canonical step set:
1. `foundation.mesh.voronoi` (phase `foundation`)
2. `foundation.crust.craton` (phase `foundation`)
3. `foundation.plates.partition` (phase `foundation`)
4. `foundation.tectonics.physics` (phase `foundation`)
5. `foundation.project.tiles` (phase `foundation`)
6. `foundation.dynamics.background` (phase `foundation`) (optional; may run before/after projection)

Canonical dependency wiring:
- `foundation.mesh.voronoi`
  - `requires: []`
  - `provides: ["artifact:foundation.mesh@v1"]`
- `foundation.crust.craton`
  - `requires: ["artifact:foundation.mesh@v1"]`
  - `provides: ["artifact:foundation.crust@v1"]`
- `foundation.plates.partition`
  - `requires: ["artifact:foundation.mesh@v1", "artifact:foundation.crust@v1"]`
  - `provides: ["artifact:foundation.plateGraph@v1"]`
- `foundation.tectonics.physics`
  - `requires: ["artifact:foundation.mesh@v1", "artifact:foundation.crust@v1", "artifact:foundation.plateGraph@v1"]`
  - `provides: ["artifact:foundation.tectonics@v1"]`
- `foundation.project.tiles`
  - `requires: ["artifact:foundation.mesh@v1", "artifact:foundation.crust@v1", "artifact:foundation.plateGraph@v1", "artifact:foundation.tectonics@v1"]`
  - `provides: ["artifact:foundation.plates@v1"]` (and any additional tile-indexed Foundation artifacts)
- `foundation.dynamics.background`
  - `requires: []` (or `requires: ["artifact:foundation.plates@v1"]` if coupling is explicitly opted into by recipe)
  - `provides: ["artifact:foundation.dynamics@v1"]`

Notes:
- A recipe may temporarily use a composite “foundation” step for migration, but the contracts above remain the source of truth.
- Artifact tags and stable consumer shapes currently live in `packages/mapgen-core/src/core/types.ts` and `packages/mapgen-core/src/base/tags.ts`. This PRD defines the **ideal end-state contracts** and is allowed to extend beyond current code.

## 6. Data Products & Contracts (Artifacts)

### 6.1 Coordinate systems and indexing (canonical)

**Tile space (consumer space)**
- Tile-indexed tensors are 1D typed arrays in row-major order:
  - `i = y * width + x` where `0 ≤ x < width`, `0 ≤ y < height`
- Wrap semantics:
  - `wrapX = true` (cylindrical wrap) is the canonical default for Civ maps.
  - `wrapY = false` (clamped at poles).

**Mesh space (simulation board space)**
- Mesh sites exist in continuous 2D coordinates derived from the hex grid’s geometry (“hex space”), so that Euclidean distances correspond more closely to hex adjacency.
- Wrap semantics are explicit in the mesh representation; neighbor relationships must be wrap-correct.

### 6.2 Contracted artifact inventory (target)

This PRD defines two classes of artifacts:
- **Mesh-first intermediates**: enable the canonical physics model and are directly testable.
- **Tile-indexed consumer contracts**: stable surfaces for downstream stages while they remain tile-based.

**Mesh-indexed intermediates (target additions; first-class artifacts)**
- `artifact:foundation.mesh@v1`
- `artifact:foundation.crust@v1`
- `artifact:foundation.plateGraph@v1`
- `artifact:foundation.tectonics@v1`

**Tile-indexed consumer contracts (existing in M5; remain stable)**
- `artifact:foundation.plates@v1`
- `artifact:foundation.dynamics@v1`
- `artifact:foundation.seed@v1`
- `artifact:foundation.config@v1`
- `artifact:foundation.diagnostics@v1`

### 6.3 Artifact schemas (implementation-ready)

The following TypeScript interfaces define the canonical payload shapes. Implementations may store additional internal data, but anything outside these contracts must not be required by downstream steps.

In this section, `meshCellCount` refers to `RegionMeshV1.sites.length`.

#### 6.3.1 `artifact:foundation.mesh@v1` — `RegionMeshV1`

```ts
export type MeshIndex = number;

export interface Vec2 {
  x: number;
  y: number;
}

export interface RegionMeshV1 {
  /** Mesh version for forward compatibility (mirrors tag version). */
  version: 1;
  /** Hex-space wrap width (for periodic distance in X). */
  wrapWidth: number;
  /** Sites (centroids) in hex space; length = cellCount. */
  sites: ReadonlyArray<Vec2>;
  /**
   * Adjacency list; neighbors[i] contains mesh indices of adjacent cells.
   * Must be symmetric: if j ∈ neighbors[i] then i ∈ neighbors[j].
   */
  neighbors: ReadonlyArray<ReadonlyArray<MeshIndex>>;
  /** Approximate cell areas (hex-space units); length = cellCount. */
  areas: Float32Array;
  /** Optional: polygon vertices per cell for diagnostics/visualization. */
  polygons?: ReadonlyArray<ReadonlyArray<Vec2>>;
}
```

**Invariants**
- `sites.length === neighbors.length === areas.length`.
- No invalid indices in adjacency lists.
- Deterministic for a given `seed + mesh config + dimensions`.

#### 6.3.2 `artifact:foundation.crust@v1` — `CrustDataV1`

Crust is the lithosphere substrate produced *before* plates are partitioned.

```ts
export const CRUST_TYPE = {
  oceanic: 0,
  continental: 1,
} as const;
export type CrustType = (typeof CRUST_TYPE)[keyof typeof CRUST_TYPE];

export interface CrustDataV1 {
  version: 1;
  /** Mesh-cell crust type. */
  type: Uint8Array; // values are CRUST_TYPE
  /**
   * 0..255 “geologic age” (relative, not absolute years).
   * Higher values represent older, more stable crust (cratons).
   */
  age: Uint8Array;
  /**
   * Optional: relative thickness 0..1 used by morphology for uplift response / erosion resistance.
   * If omitted, consumers derive thickness from type+age.
   */
  thickness01?: Float32Array;
}
```

**Invariants**
- `type.length === age.length === meshCellCount`.
- `type[i] ∈ {0,1}`.
- `age[i] ∈ [0,255]`.

#### 6.3.3 `artifact:foundation.plateGraph@v1` — `RegionPlateGraphV1`

This is a kinematics partition of mesh cells (plates are kinematic domains, not material domains).

```ts
export type PlateId = number;

export interface PlateKinematicsV1 {
  id: PlateId;
  kind: "major" | "minor";
  /** Plate seed location in hex space (for debugging and partition bias). */
  seed: Vec2;
  /** Linear motion vector (unitless, normalized for relative comparisons). */
  velocity: Vec2;
  /** Angular velocity around seed (unitless scalar). */
  rotation: number;
}

export interface RegionPlateGraphV1 {
  version: 1;
  /** For each mesh cell, the assigned plate id. */
  cellToPlate: Int32Array;
  /** Plate definitions; indexed by plate id. */
  plates: ReadonlyArray<PlateKinematicsV1>;
  /**
   * Optional adjacency at plate level.
   * If present, must be symmetric.
   */
  plateNeighbors?: ReadonlyArray<ReadonlyArray<PlateId>>;
}
```

**Invariants**
- `cellToPlate.length === meshCellCount`.
- Plate IDs are dense: `0..plates.length-1`.
- Each plate has at least one cell.

#### 6.3.4 `artifact:foundation.tectonics@v1` — `TectonicDataV1`

Tectonic fields are derived from **relative plate motion intersecting with crust type/age**.

```ts
export const BOUNDARY_TYPE = {
  none: 0,
  convergent: 1,
  divergent: 2,
  transform: 3,
} as const;

export type BoundaryType = (typeof BOUNDARY_TYPE)[keyof typeof BOUNDARY_TYPE];

export interface TectonicDataV1 {
  version: 1;

  /** 0..255 convergence-driven uplift potential per mesh cell. */
  upliftPotential: Uint8Array;
  /** 0..255 divergence-driven rift potential per mesh cell. */
  riftPotential: Uint8Array;
  /** 0..255 transform/shear stress per mesh cell. */
  shearStress: Uint8Array;

  /** 0..255 volcanism driver (subduction arcs + hotspots). */
  volcanism: Uint8Array;
  /** 0..255 fracture driver (rift + shear). */
  fracture: Uint8Array;

  /** 0..255 long-term uplift accumulator (for “eras”). */
  cumulativeUplift: Uint8Array;

  /**
   * Optional: boundary edge list for visualization and downstream edge-aware logic.
   * If present, edges reference mesh cell indices.
   */
  boundaryEdges?: ReadonlyArray<{
    a: MeshIndex;
    b: MeshIndex;
    type: BoundaryType;
    /** 0..255 strength (interpretation depends on type). */
    strength: number;
  }>;
}
```

**Invariants**
- All arrays have length `meshCellCount`.
- Values are finite and within expected ranges.

#### 6.3.5 `artifact:foundation.plates@v1` — tile-indexed consumer tensors

This is the stable cross-domain surface used by downstream tile-based stages. It is the projection of mesh-first products plus tile-level derived fields (notably boundary distance fields).

The canonical v1 shape (as in `packages/mapgen-core/src/core/types.ts`) is:

```ts
export interface FoundationPlateFieldsV1 {
  id: Int16Array;
  boundaryCloseness: Uint8Array;
  boundaryType: Uint8Array;
  tectonicStress: Uint8Array;
  upliftPotential: Uint8Array;
  riftPotential: Uint8Array;
  shieldStability: Uint8Array;
  movementU: Int8Array;
  movementV: Int8Array;
  rotation: Int8Array;
}
```

**Semantics (binding)**
- `id`: tile plate id (projection of mesh plate id).
- `boundaryType`: `BOUNDARY_TYPE` per tile (derived from nearest boundary edge and/or neighbor plate relationships).
- `boundaryCloseness`: 0..255, higher closer to boundary (computed by a deterministic tile-space distance transform).
- `upliftPotential` / `riftPotential`: projection of mesh potentials into tile space, normalized/clamped to 0..255.
- `tectonicStress`: aggregate stress magnitude (canonical: max of uplift/rift/shear, optionally weighted).
- `shieldStability`: 0..255, higher for stable interiors (canonical: inverse of boundaryCloseness and/or low stress).
- `movementU` / `movementV` / `rotation`: plate motion proxies for narrative/morphology alignment. These are not “meters/year”; they are normalized directional drivers.

#### 6.3.6 `artifact:foundation.dynamics@v1` — background circulation tensors

`artifact:foundation.dynamics@v1` is a **background dynamics model**, not a full climate solution:
- It must not depend on a landmask (Morphology-owned).
- It may depend on latitude bands and configurable directionality.

Canonical v1 shape (as in `packages/mapgen-core/src/core/types.ts`) is:

```ts
export interface FoundationDynamicsFieldsV1 {
  windU: Int8Array;
  windV: Int8Array;
  currentU: Int8Array;
  currentV: Int8Array;
  pressure: Uint8Array;
}
```

**Semantics (binding)**
- `windU/windV`: prevailing wind vector field (coarse).
- `currentU/currentV`: background “ocean circulation intent” field; consumers must treat it as a hint unless/until later stages refine it with basins/topography.
- `pressure`: mantle/planetary driver scalar (not necessarily sea-level atmospheric pressure); used as a large-scale forcing input for hotspots/directionality.

#### 6.3.7 `artifact:foundation.seed@v1`, `artifact:foundation.config@v1`, `artifact:foundation.diagnostics@v1`

- `seed@v1`: captures determinism provenance (seed mode, fixed seed, offsets, plate seed locations, etc.).
- `config@v1`: the config snapshot actually used (for debugging and reproducibility).
- `diagnostics@v1`: stable presence, flexible internal shape; may include mesh polygons, boundary edges, histograms, and per-step summaries.

## 7. Algorithms (Implementation Expectations)

This section is detailed and implementation-ready, but remains a PRD: it specifies “what must be true” and the canonical algorithmic approach, not code structure.

### 7.1 Mesh generation (`foundation.mesh.voronoi`)

**Goal:** Create a uniform, organic simulation board approximating equal-area regions.

**Canonical algorithm**
- Generate `N` random sites in tile coordinate space.
- Convert to hex-space positions for distance computations.
- Compute Voronoi diagram and apply Lloyd relaxation for `K` iterations.
- Emit adjacency lists and approximate cell areas.

**Wrap semantics**
- `wrapX = true` is canonical: Voronoi must treat X as periodic.
- Implementations may use periodic replication (`x±wrapWidth`) to approximate toroidal Voronoi behavior.

**Determinism**
- All site generation and relaxation steps must be driven by deterministic RNG seeded from `RunRequest.settings + step config`.

### 7.2 Crust generation (`foundation.crust.craton`)

**Goal:** Produce crust type/age independent of plate boundaries.

**Canonical model**
- Seed `cratonCount` continental cores (older, stable).
- Expand continental crust outward using a weighted growth process over mesh adjacency.
- Ensure a target continental area ratio (by mesh area).
- Produce a crust age field where cratons are oldest and margins are younger; oceanic crust starts young and may be refined by tectonics later.

**Earth-like constraints**
- Continents can exist in plate interiors (passive margins are allowed).
- Crust type is not derived from plate IDs.

### 7.3 Plate partitioning (`foundation.plates.partition`)

**Goal:** Partition the mesh into kinematic plates while respecting crust resistance.

**Canonical algorithm**
- Choose `majorPlates` and `minorPlates` seed cells.
- Assign each seed a kinematics vector/rotation (optionally directionality-biased).
- Perform a multi-source weighted region-growth / Dijkstra flood fill across the mesh:
  - Cost prefers boundaries in oceanic crust.
  - Cost resists cutting through old continental cratons (high age / thickness).
  - Area weights avoid microplates dominating the map unless explicitly configured.

### 7.4 Tectonic physics (`foundation.tectonics.physics`)

**Goal:** Compute boundary types and force fields from relative plate motion, modulated by crust type/age.

**Canonical boundary classification**
- For each mesh edge between cells on different plates:
  - Compute relative velocity at the edge.
  - Decompose into normal (convergence/divergence) and tangential (transform) components.
  - Assign boundary type using thresholds/hysteresis:
    - Convergent if normal component indicates approach above threshold.
    - Divergent if normal component indicates separation above threshold.
    - Transform if tangential dominates and normal is near zero.

**Canonical interaction rules (Earth-like)**
- Oceanic–continental convergence: oceanic subducts; uplift and volcanism biased onto the continental side.
- Oceanic–oceanic convergence: older plate subducts; island arc volcanism.
- Continental–continental convergence: collision/orogeny (strong uplift; broad belts).
- Divergence: rifting/spreading (rift potential + volcanism along ridges).
- Transform: shear zones (fracture + moderate uplift in bends).

### 7.5 Hotspots / mantle plumes (Foundation-owned)

Hotspots are physical sources (mantle plumes), not narrative motifs.

**Canonical model**
- Generate a small number of hotspot sources in mesh space.
- Advect hotspot influence along plate motion to create linear volcanic chains (optional downstream consumer use).
- Feed hotspot influence into `tectonics.volcanism` as a non-boundary term.

### 7.6 Era accumulation (“geologic history”)

**Goal:** Allow multiple passes (“eras”) where crust persists and plate kinematics change.

**Canonical mechanism**
- `cumulativeUplift` is a stable accumulator in `artifact:foundation.tectonics@v1`.
- A recipe may include multiple Foundation passes, reusing crust and accumulating tectonics.

### 7.7 Mesh → tile projection (`foundation.project.tiles`) (decided)

**Decision:** Use a deterministic nearest-site mapping from tile centers to mesh cells, plus a tile-space distance transform to compute boundary closeness.

Canonical projection strategy:
1. Assign each tile to a mesh cell by nearest site in hex space with wrap-correct distance.
2. Tile plate id is the plate id of the owning mesh cell.
3. Tile potentials (`upliftPotential`, `riftPotential`, etc.) are taken from the owning mesh cell and then optionally smoothed in tile space.
4. Boundary tiles are detected by hex-neighbor plate-id changes in tile space.
5. `boundaryCloseness` is produced by a deterministic BFS distance field seeded by boundary tiles and encoded into 0..255.

**Projection invariants**
- Projection must be stable for a given seed/config/dimensions (no iteration-order nondeterminism).
- WrapX must be handled consistently across neighbor checks and distance propagation.

### 7.8 Background dynamics (`foundation.dynamics.background`)

**Goal:** Provide a base circulation intent compatible with Earth-like latitude bands without requiring a landmask.

**Canonical baseline**
- Compute latitude-only prevailing wind bands (trade winds, westerlies, polar easterlies) with configurable noise/jitter.
- Optionally bias winds/currents using directionality settings and (explicitly opted-in) plate motion coupling.
- `pressure` represents large-scale mantle/planetary forcing (used for hotspot biasing and macro patterns).

## 8. Configuration Contracts (Step-local, recipe-authored)

This PRD defines target configuration groups; current config may not yet match.

At minimum, each Foundation step must have a strict config schema and reject unknown keys at compile time.

Suggested config structure:

```ts
interface FoundationMeshConfig {
  cellCount: number;          // default ~4000 for large maps (scale with area)
  relaxationSteps: number;    // default 5
  wrapX: true;
}

interface FoundationCrustConfig {
  continentalRatio: number;   // 0..1 by mesh area
  cratonCount: number;
  cratonMinSeparation: number;
  ageSmoothing: number;       // 0..1
}

interface FoundationPartitionConfig {
  majorPlates: number;
  minorPlates: number;
  oceanBoundaryBias: number;  // prefer boundaries in oceanic crust
  cratonResistance: number;   // resist splitting old continental crust
}

interface FoundationTectonicsConfig {
  convergenceThreshold: number;
  divergenceThreshold: number;
  transformThreshold: number;
  hotspotCount: number;
  subductionBias: number;     // strength of oceanic subduction preference
  collisionBeltWidth: number; // broadening for continent-continent collisions
  eraCount: number;           // for multi-pass recipes
}
```

## 9. Observability & Diagnostics (PRD-level expectations)

- Every Foundation run must publish `artifact:foundation.seed@v1` and `artifact:foundation.config@v1`.
- `artifact:foundation.diagnostics@v1` must always exist but may be empty; when enabled, it should include:
  - Plate summary (counts, area distribution)
  - Boundary type distribution
  - Mesh cell count, relaxation steps, timing
  - Optional boundary edge list and/or mesh polygons for visualization

## 10. Acceptance Criteria (Definition of Done)

### 10.1 Contract correctness
- All required artifacts are present when their producing steps are included in the recipe.
- All published artifacts satisfy schema/invariant checks (sizes, value ranges, determinism).
- No Foundation step requires `isWater` or any landmask-like engine read.

### 10.2 Physics plausibility (not “perfect geology”, but Earth-like)
- Plate boundaries are a mixture of convergent/divergent/transform (configurable).
- Continents are not forced to coincide with plate boundaries; passive margins exist.
- Convergent boundaries generate uplift; divergent generate rift; transforms generate shear/fracture.

### 10.3 Determinism
- Identical `RunRequest.settings + recipe + config` yields byte-identical artifacts.

### 10.4 Performance
- Mesh generation at default resolution completes within a tight budget suitable for Civ runtime.

## 11. Migration Notes (keep contracts stable while upgrading algorithms)

- `artifact:foundation.plates@v1` remains the primary downstream dependency surface while Morphology/Hydrology/etc are tile-based.
- Mesh-first artifacts are added as new tags (`artifact:foundation.mesh@v1`, etc.) and can be adopted incrementally by consumers.
- Current tile-based plate utilities (`packages/mapgen-core/src/base/foundation/plates.ts`) are treated as baseline reference only; they should be replaced/refactored to align with the mesh-first artifacts rather than being extended ad-hoc.

## 12. Open Questions (narrow, non-blocking)

- Spherical mesh vs cylindrical wrap: PRD assumes cylindrical wrapX; a later PRD may introduce true spherical triangulation if warranted.
- Whether to version-bump `artifact:foundation.plates` to add explicit `shearStress` (currently folded into `tectonicStress`).

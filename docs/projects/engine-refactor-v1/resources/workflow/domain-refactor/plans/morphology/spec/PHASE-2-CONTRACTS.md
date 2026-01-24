# Morphology Phase 2 — Contracts

This is a canonical Phase 2 spec file.

Historical source material (archived; do not edit):
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/v3/spike-morphology-modeling-gpt.md`

Rules:
- Keep one canonical copy of each concept (link across spec files; do not duplicate).
- Completeness-first (no “minimal” framing).

This file owns the **cross-domain contract surfaces** for Morphology Phase 2:
- **Inputs** from Foundation → Morphology (artifact schemas + semantics)
- **Truth outputs** from Morphology → Hydrology/Ecology/Gameplay (artifact schemas + semantics)
- **Coordinate spaces, indexing, determinism, and freeze semantics** shared across these contracts

Non-scope for this file:
- The overall pipeline narrative and operation catalog (see `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`)
- Gameplay projections (`artifact:map.*`) and Civ7 stamping/materialization effects (see `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`)

---

## Global invariants (apply to every contract here)

### Topology lock (Civ7 canonical)

- `wrapX = true` (east–west wraps)
- `wrapY = false` (north–south does not wrap)
- There is **no** environment/config knob that can change these; wrap flags must not appear in any contract input.

### Tile indexing space

- Tile coordinates are `(x, y)` with:
  - `x ∈ [0, width-1]`
  - `y ∈ [0, height-1]`
- Flattened index:
  - `tileIndex = y * width + x`
- All tile-indexed typed arrays are **dense**, length = `width * height`, in `tileIndex` order.

### Mesh indexing space (Foundation)

- Foundation mesh is indexed by `cellIndex ∈ [0, cellCount-1]`.
- Mesh-typed arrays are **dense**, length = `cellCount`, in `cellIndex` order.

### Canonical mesh → tile projection (deterministic)

Morphology consumes Foundation truth artifacts (mesh-first truths plus derived tile views like `artifact:foundation.plates` and `artifact:foundation.crustTiles`) and produces tile-indexed Morphology truth artifacts. Any mesh-indexed driver field used to produce tile-indexed values uses this canonical, deterministic projection rule:

- Define `tileToCellIndex[tileIndex]` by nearest mesh site in mesh “hex space”, with wrapX periodic distance:
  - For each tile `(x, y)` compute `tileHex = projectOddqToHexSpace(x, y)` (mesh hex-space coordinates).
  - Choose `cellIndex` that minimizes:
    - `dx = wrapAbsDeltaPeriodic(tileHex.x - mesh.siteX[cellIndex], mesh.wrapWidth)`
    - `dy = tileHex.y - mesh.siteY[cellIndex]`
    - `dist2 = dx*dx + dy*dy`
  - Tie-breaker: smallest `cellIndex`.
- Sample any mesh field `fieldByCell[cellIndex]` to tile as `fieldByTile[tileIndex] = fieldByCell[tileToCellIndex[tileIndex]]`.
- Foundation publishes the canonical mapping as `artifact:foundation.tileToCellIndex` (dense Int32Array in `tileIndex` order).

Evidence pointer (current implementation of the projection rule):
- `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts` (`tileToCell` mapping; `projectOddqToHexSpace`; periodic distance via `wrapAbsDeltaPeriodic`)

### Determinism requirements

Every artifact here is deterministic with respect to:
- upstream artifacts (Foundation) and env constants (width/height/latitude),
- Morphology config (after schema defaulting),
- deterministic seed inputs (when the contract includes an explicit seed input).

Where a contract includes lists or IDs, it must also include:
- a stable ordering rule,
- tie-breakers for equal scores/values,
- explicit wrap-aware semantics for any X-coordinate derived values.

### Seed inputs (determinism contract)

The canonical root seed is provided by the pipeline environment:
- `context.env.seed: number` (required; see `packages/mapgen-core/src/core/env.ts`)

Rules:
- Seeds cross boundaries as data only (numbers), never as RNG objects/functions.
- Steps derive deterministic per-step seeds from the root seed using a stable label, then pass those derived seeds into ops that require randomness.
- Canonical derivation primitive (evidence pointer):
  - `deriveStepSeed(context.env.seed, "<stable-label>")` as used in `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/inputs.ts`.
  - Stable labels must be treated as part of determinism: use stable step/op ids (not filenames/line numbers).

### Lifecycle / freeze semantics

This spec uses the freeze points defined in the Phase 2 model:
- See `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md` “3.2 Canonical freeze points (Phase 2 named)” for the full F1–F5 set.

Truth contracts in this file are primarily concerned with:
- **F1:** after Foundation (Foundation truth artifacts frozen)
- **F2:** after Morphology (Morphology truth artifacts frozen)

Contracts in this file must specify:
- **publish time** (which freeze point),
- **mutability posture** (buffer handle refined in-place until freeze vs immutable snapshot at publish),
- downstream read expectations (truth-only; no engine coupling).

### Canonical tile neighbor graph (determinism anchor)

Whenever this spec refers to the “canonical tile neighbor graph”, it means:
- Odd-q offset coordinates `(x, y)` with east–west wrap (`wrapX=true`) and hard north/south bounds (`wrapY=false`).
- Neighbor iteration MUST use the same neighbor ordering as `packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts`:
  - For odd columns (`x & 1 === 1`): `[-1,0]`, `[1,0]`, `[0,-1]`, `[0,1]`, `[-1,1]`, `[1,1]`
  - For even columns: `[-1,0]`, `[1,0]`, `[0,-1]`, `[0,1]`, `[-1,-1]`, `[1,-1]`

Determinism note:
- Flood-fill, BFS distance, connected-component, and “first encountered” tie-breakers must respect this neighbor ordering, and must use wrapped X coordinates (see `packages/mapgen-core/src/lib/grid/wrap.ts`).

### Truth-only inputs (no backfeeding; no projections)

Locked:
- Morphology truth production must not consume any Gameplay-owned surfaces:
  - `artifact:map.*` (projection artifacts)
  - `effect:map.*` (stamping/materialization effects; execution guarantees)
- Morphology truth production must not consume any overlays (Narrative/Gameplay “stories”), regardless of wiring:
  - `artifact:storyOverlays` and any legacy overlay containers
  - `overlay:*` (where/if modeled as a first-class dependency kind)

Evidence pointer (legacy violation; to be removed in Phase 3 wiring):
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts` reads overlays (`readOverlayCorridors`, `readOverlayMotifsMargins`) to build sea-lane/margin masks. This is not permitted under the Phase 2 model.

---

## Upstream contracts (Foundation → Morphology)

Evidence pointers (current schemas; Phase 3 updates shapes, but keys remain canonical):
- `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`

### `artifact:foundation.mesh` (required)

Owner: Foundation  
Publish/freeze: F1 (immutable after F1)  
Indexing: mesh (`cellIndex`)

Schema (current):
- `cellCount: number`
- `wrapWidth: number` — mesh-space periodic width (X wrap only)
- `siteX: Float32Array[cellCount]`
- `siteY: Float32Array[cellCount]`
- `neighborsOffsets: Int32Array[cellCount + 1]` — CSR offsets
- `neighbors: Int32Array[neighborsOffsets[cellCount]]` — CSR neighbor list
- `areas: Float32Array[cellCount]`
- `bbox: { xl: number, xr: number, yt: number, yb: number }`

Semantics:
- The mesh is a **cylindrical** surface: periodic in X, clamped in Y.
- Neighbor relations must already reflect wrapX behavior in mesh-space. Consumers must not “re-wrap” mesh adjacency.

Determinism:
- `neighbors` ordering is deterministic. If multiple valid triangulations exist, Foundation must pick a deterministic tie-breaker upstream; Morphology treats this as canonical.

### `artifact:foundation.crust` (required)

Owner: Foundation  
Publish/freeze: F1  
Indexing: mesh (`cellIndex`)

Schema (current):
- `type: Uint8Array[cellCount]` — `0=oceanic`, `1=continental`
- `age: Uint8Array[cellCount]` — `0=new`, `255=ancient`

Semantics:
- `type` is **material**, not “plate kind” and not “continent id”.
- `age` is a monotone “relative age” proxy; consumers must not treat it as years.

### `artifact:foundation.tileToCellIndex` (required; derived mapping)

Owner: Foundation  
Publish/freeze: F1  
Indexing: tiles (`tileIndex`)

Schema (current):
- `Int32Array[width * height]` — `tileToCellIndex[tileIndex]` (dense; values are mesh `cellIndex`)

Semantics:
- This is the canonical, deterministic mesh→tile projection mapping defined above.
- Downstream domains MUST use this mapping (or an equivalent implementation of the same rule) for any mesh-sampled driver field.

### `artifact:foundation.crustTiles` (required; derived material view)

Owner: Foundation  
Publish/freeze: F1  
Indexing: tiles (`tileIndex`)

Schema (current):
- `type: Uint8Array[width * height]` — sampled from `artifact:foundation.crust.type` via `tileToCellIndex`
- `age: Uint8Array[width * height]` — sampled from `artifact:foundation.crust.age` via `tileToCellIndex`

Semantics:
- This is a deterministic tile-space view of `artifact:foundation.crust` for tile-based consumers (especially Morphology substrate/erodibility).

### `artifact:foundation.plateGraph` (required)

Owner: Foundation  
Publish/freeze: F1  
Indexing: mesh (`cellIndex`) + plate list

Schema (current):
- `cellToPlate: Int16Array[cellCount]` — plate id per mesh cell
- `plates: Array<{ id: number, kind: "major" | "minor", seedX: number, seedY: number, velocityX: number, velocityY: number, rotation: number }>`

Semantics:
- Plate IDs are **dense and index-stable**: for `i ∈ [0, plates.length-1]`, `plates[i].id === i`.
- `cellToPlate[cellIndex]` stores the plate id for that cell, and therefore is also an index into `plates[]`.
- `kind` is kinematic scale only; it must not be used as a proxy for “continent”.

Determinism:
- `plates` ordering is deterministic (ascending `id`).
- `cellToPlate` values must be stable for fixed inputs/seeds.

### `artifact:foundation.tectonics` (required)

Owner: Foundation  
Publish/freeze: F1  
Indexing: mesh (`cellIndex`)

Schema (current):
- `boundaryType: Uint8Array[cellCount]` — boundary classification (domain enum; 0 = none/unknown)
- `upliftPotential: Uint8Array[cellCount]` — `0..255`
- `riftPotential: Uint8Array[cellCount]` — `0..255`
- `shearStress: Uint8Array[cellCount]` — `0..255`
- `volcanism: Uint8Array[cellCount]` — `0..255` (includes hotspots + arc volcanism drivers)
- `fracture: Uint8Array[cellCount]` — `0..255`
- `cumulativeUplift: Uint8Array[cellCount]` — `0..255` (multi-era accumulator when enabled)

Semantics:
- These are **driver fields**, not realized landforms.
- `volcanism` is the canonical upstream driver Morphology uses to compute **volcanism intent** (no overlays).
- `boundaryType` values are the canonical tectonic regime enum:
  - `0 = none`
  - `1 = convergent`
  - `2 = divergent`
  - `3 = transform`
  - Evidence pointer: `mods/mod-swooper-maps/src/domain/foundation/constants.ts`

Polar boundary interaction controls (Foundation-owned; contract-locked):
- Purpose: treat the north/south edges as **real boundary regimes** (virtual “polar plates”), and allow authors to control how intense those interactions are without reintroducing legacy “boundary bias” knobs in Morphology.
- Contract surface shape (defaulted deterministically; no presence-gating after defaulting):
  ```ts
  type PolarBoundaryRegime = "convergent" | "divergent" | "transform";

  type FoundationPolarBoundary = {
    // Selected boundary regime for the polar edge interaction.
    // This is a control input; Foundation translates it into driver fields deterministically.
    regime: PolarBoundaryRegime;

    // Normalized scalar multiplier for how strongly the polar edge interaction contributes to
    // the tectonic driver fields near that edge (relative to typical interior boundary strength).
    // This is not a Morphology knob.
    intensity: number;
  };

  type FoundationTectonicsConfig = {
    polarBoundary: {
      north: FoundationPolarBoundary;
      south: FoundationPolarBoundary;
    };
  };
  ```
- Defaults (explicit):
  - `polarBoundary.north.regime = "transform"`
  - `polarBoundary.north.intensity = 1.0`
  - `polarBoundary.south.regime = "transform"`
  - `polarBoundary.south.intensity = 1.0`
- Range guidance (locked as a semantic contract even if enforcement is runtime-schema-specific):
  - `intensity ∈ [0, 2]` (0 yields negligible edge driver contribution; >1 exaggerates edge effects)
- Semantics (required):
  - Foundation MUST treat north/south edges as boundary interactions against virtual polar plates, not dead cutoffs.
  - The chosen `regime` MUST be reflected in how edge interactions contribute to driver fields. At minimum, the edge interactions MUST influence:
    - `upliftPotential`, `riftPotential`, `shearStress`, `volcanism`, `fracture` (and `cumulativeUplift` when enabled).
  - `intensity` scales the polar-edge interaction’s contribution into those driver fields before any clamping/quantization to `0..255`.
  - Edge effects MUST taper smoothly into the interior over some deterministic band; the exact taper function and band size are internal numeric method choices, but the presence of a smooth taper is a Phase 2 contract requirement.

### `artifact:foundation.plates` (required; derived physics view)

Owner: Foundation  
Publish/freeze: F1  
Indexing: tiles (`tileIndex`)

Purpose:
- Provide a deterministic **tile-space view** of mesh-first tectonic truths for tile-based physics consumers (especially Morphology).
- Avoid duplicated/reimplemented mesh→tile projection math across multiple downstream steps.

Important posture (locked):
- `artifact:foundation.plates` is **derived-only** from frozen mesh-first truths (`artifact:foundation.mesh`, `artifact:foundation.plateGraph`, `artifact:foundation.tectonics`) using `artifact:foundation.tileToCellIndex` (canonical mesh→tile projection rule: wrapX periodic distance + tie-breakers).
- It is a physics-side view artifact (Foundation → Morphology is allowed). It is not a Gameplay projection surface and must not be modeled under `artifact:map.*`.

Projection config (Foundation-owned; single-sourced; defaulted deterministically):
- `boundaryInfluenceDistance: int` — default `5`, range `[1, 32]`
  - Interpreted as a max hex-step distance (on the canonical tile neighbor graph, wrapX=true) over which `boundaryCloseness` is non-zero.
  - For distance `d >= boundaryInfluenceDistance`, `boundaryCloseness = 0`.
- `boundaryDecay: number` — default `0.55`, range `[0.05, 1]`
  - Exponential decay coefficient applied to boundary distance when computing `boundaryCloseness` (see Semantics).
- `movementScale: number` — default `100`, range `[1, 200]`
  - Scale factor mapping `artifact:foundation.plateGraph.plates[].velocityX|velocityY` into `movementU|movementV` int8 fields (see Semantics).
- `rotationScale: number` — default `100`, range `[1, 200]`
  - Scale factor mapping `artifact:foundation.plateGraph.plates[].rotation` into the `rotation` int8 field (see Semantics).

Schema (current; must remain stable at the field level):
```ts
type FoundationPlatesArtifact = {
  // Plate id per tile (dense; values are indices into `artifact:foundation.plateGraph.plates[]`).
  id: Int16Array;

  // 0..255 closeness to a plate boundary on the canonical hex tile neighbor graph
  // (wrapX=true). 0 = far, 255 = on/near boundary.
  boundaryCloseness: Uint8Array;

  // Boundary regime classification for boundary tiles; 0 for non-boundary tiles.
  // Values align with `artifact:foundation.tectonics.boundaryType`.
  boundaryType: Uint8Array;

  // 0..255 aggregate “how tectonically active” this tile’s source cell is
  // (canonical baseline: max(upliftPotential, riftPotential, shearStress)).
  tectonicStress: Uint8Array;

  // 0..255 sampled from `artifact:foundation.tectonics.*` at `tileToCellIndex`.
  upliftPotential: Uint8Array;
  riftPotential: Uint8Array;

  // 0..255 canonical baseline: `255 - boundaryCloseness`.
  shieldStability: Uint8Array;

  // Plate motion/rotation signals sampled per tile (int8, clamped).
  // Semantics are “relative scale” drivers; do not treat as physical units.
  movementU: Int8Array;
  movementV: Int8Array;
  rotation: Int8Array;
};
```

Semantics (canonical):
- `id[tileIndex]` is derived by sampling `artifact:foundation.plateGraph.cellToPlate` at `tileToCellIndex[tileIndex]`.
  - Range invariant: `id[tileIndex] ∈ [0, artifact:foundation.plateGraph.plates.length-1]`.
  - Identity invariant: `artifact:foundation.plateGraph.plates[id[tileIndex]].id === id[tileIndex]`.
- A tile is a “plate boundary tile” if any of its canonical hex neighbors (wrapX=true) has a different `id`.
- `boundaryCloseness` is a deterministic monotone decay of hex-step distance from the nearest boundary tile, clamped into `[0,255]`.
  - Canonical baseline: let `d = hexStepDistanceToNearestBoundaryTile(tileIndex)` (BFS on the tile neighbor graph; wrapX=true). Then:
    - if `d >= boundaryInfluenceDistance`, `boundaryCloseness = 0`
    - else `boundaryCloseness = clampByte(round(exp(-d * boundaryDecay) * 255))`
  - Evidence pointer (current baseline implementation): `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts` (`computeHexWrappedDistanceField`, `boundaryDecay` exponential).
- `boundaryType[tileIndex]` is `artifact:foundation.tectonics.boundaryType[tileToCellIndex[tileIndex]]` if the tile is a boundary tile, else `0`.
- `tectonicStress[tileIndex]` is a deterministic aggregate sampled from the tile’s source cell:
  - Canonical baseline: `tectonicStress = clampByte(max(upliftPotential, riftPotential, shearStress))` where `shearStress` is read from `artifact:foundation.tectonics.shearStress[tileToCellIndex[tileIndex]]`.
- `upliftPotential`, `riftPotential` sample `artifact:foundation.tectonics.*` at `tileToCellIndex[tileIndex]`.
- `shieldStability[tileIndex]` is the canonical inverse of boundary proximity: `shieldStability = 255 - boundaryCloseness`.
- `movementU|movementV|rotation` sample per-plate values from `artifact:foundation.plateGraph.plates[]` after deterministic scaling/clamping:
  - `movementU = clampInt8(round(plates[id].velocityX * movementScale))`
  - `movementV = clampInt8(round(plates[id].velocityY * movementScale))`
  - `rotation = clampInt8(round(plates[id].rotation * rotationScale))`

Determinism:
- All arrays are a deterministic function of upstream frozen Foundation truths + Foundation projection config (after defaulting).
- Any future optimization (spatial indexing, nearest-site acceleration) must preserve the canonical selection/tie-breaker behavior of `tileToCellIndex`.

---

## Environment inputs (non-artifact, still contract-relevant)

Morphology (and downstream consumers of Morphology truths) must have:
- `width: number`
- `height: number`
- `latitudeByRowDeg: Float32Array[height]` where:
  - row `y=0` is northmost, row `y=height-1` is southmost
  - values are in degrees (`[-90, 90]`)

Derivations (deterministic, not separate contracts):
- `latitudeDegByTile[tileIndex] = latitudeByRowDeg[y]` for `tileIndex = y * width + x`

The topology lock applies: wrap is not a provided input.

---

## Downstream truth contracts (Morphology → Hydrology/Ecology/Gameplay)

Evidence pointers (current/legacy schemas that Phase 2 supersedes; listed to anchor names):
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`

### `artifact:morphology.topography` (required; truth)

Owner: Morphology  
Publish/freeze: publish-once handle; frozen as truth at F2  
Indexing: tiles (`tileIndex`) + scalar

Schema (Phase 2 canonical):
```ts
type MorphologyTopographyArtifact = {
  // Signed elevation relative to a shared datum (units: meters).
  // Phase 2 semantic lock: values represent **integer meters** (quantized deterministically).
  elevation: Int16Array;

  // Global sea level threshold in the same datum and units as elevation (meters).
  // Phase 2 semantic lock: this is a `number` and is allowed to be fractional (e.g., hypsometry-derived).
  seaLevel: number;

  // Derived classification: 1=land, 0=water.
  // Must be consistent with `elevation` and `seaLevel`.
  landMask: Uint8Array;

  // Derived bathymetry relative to sea level (units: meters).
  // Convention (semantic): `bathymetryMeters[i] = min(0, elevationMeters[i] - seaLevelMeters)` (0 on land, negative in water).
  // Phase 2 storage lock: when stored as an `Int16Array`, bathymetry MUST be quantized deterministically:
  // - `bathymetry[i] = clampInt16(roundHalfAwayFromZero(bathymetryMeters[i]))`
  bathymetry: Int16Array;
};
```

Semantics:
- Land/water threshold is strict and unambiguous:
  - `landMask[i] = (elevationMeters[i] > seaLevelMeters ? 1 : 0)` (equality is water).
  - `elevationMeters[i]` is the semantic value represented by `elevation[i]` (integer meters).
  - `seaLevelMeters` is the semantic value represented by `seaLevel` (allowed to be fractional).
- `bathymetry` is a derived field and MUST be consistent with `elevation` + `seaLevel` under the convention above:
  - Land tiles MUST have `bathymetry[i] = 0`.
  - Water tiles MUST have `bathymetry[i] <= 0`.
- Quantization rule (Phase 2 determinism anchor):
  - `roundHalfAwayFromZero(x)` rounds `+0.5 -> +1` and `-0.5 -> -1` (not banker's rounding).
  - `clampInt16(x)` clamps to `[-32768, 32767]` after rounding.
- This artifact is **physics truth only**. It must not include engine-facing classifications (terrain ids, tags, region ids).
- This artifact’s `elevation` is not the Civ7 engine’s derived elevation bands, and it does not define the Civ7 cliff graph. Any decision that must match `GameplayMap.getElevation(...)` / `GameplayMap.isCliffCrossing(...)` belongs in Gameplay/map logic after `effect:map.elevationBuilt` (see `spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`).

Determinism:
- All derived fields are deterministically derived from `elevation` + `seaLevel`.

Downstream consumption:
- Hydrology consumes this as its canonical topography input (Phase 2 posture: Hydrology must not rely on legacy `artifact:heightfield` reads).
- Evidence pointer (legacy Hydrology input artifact): `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts` defines `artifact:heightfield`.

Evidence pointers (legacy/current typing that Phase 2 corrects):
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts` defines `artifact:morphology.topography` as a buffer handle with `{ elevation: i16, terrain: u8, landMask: u8 }`. The Phase 2 contract:
  - removes `terrain` from the Morphology truth surface (Gameplay projection owns it),
  - locks `elevation`/`seaLevel`/`bathymetry` units to meters (current op contracts still describe “normalized units”; see `mods/mod-swooper-maps/src/domain/morphology/ops/compute-sea-level/contract.ts`).

### `artifact:morphology.substrate` (required; truth)

Owner: Morphology  
Publish/freeze: publish-once handle; frozen as truth at F2  
Indexing: tiles (`tileIndex`)

Schema (Phase 2 canonical):
```ts
type MorphologySubstrateArtifact = {
  // Erodibility / softness proxy. Larger values erode more easily.
  // Units are dimensionless (model coefficient), normalized so that relative comparisons are meaningful.
  erodibilityK: Float32Array;

  // Accumulated loose sediment thickness proxy (units: meters).
  sedimentDepth: Float32Array;
};
```

Semantics:
- `erodibilityK` must be derived deterministically from Foundation-provided Physics driver fields (and Morphology rules); it must not be “authored” as a paint mask or gameplay overlay.
  - Phase 2 baseline uses the drivers that exist at tile resolution (`artifact:foundation.plates` tectonic signals) as a proxy.
  - If/when Foundation publishes explicit material/lithology drivers (e.g., projected crust/material fields), they become the primary substrate driver surface without changing the “no overlays / no author painting” rule.
- `sedimentDepth` is updated by Morphology geomorphic cycles; downstream domains treat it as truth at F2.

### `artifact:morphology.coastlineMetrics` (required; truth)

Owner: Morphology  
Publish/freeze: immutable snapshot at F2  
Indexing: tiles (`tileIndex`)

Schema (Phase 2 canonical):
```ts
type MorphologyCoastlineMetricsArtifact = {
  // 1 for land tiles adjacent to at least one water tile; else 0.
  coastalLand: Uint8Array;

  // 1 for water tiles adjacent to at least one land tile; else 0.
  coastalWater: Uint8Array;

  // Minimum tile-graph distance to any coastline tile (units: tiles).
  // Convention: 0 for coastalLand/coastalWater tiles; increasing inward/outward.
  distanceToCoast: Uint16Array;
};
```

Semantics:
- Coast adjacency and distances use the **tile neighbor graph** with wrapX=true, wrapY=false.
- `distanceToCoast` must treat polar edges as hard borders (no wrap) with no off-map adjacency.

### `artifact:morphology.landmasses` (required; truth)

Owner: Morphology  
Publish/freeze: immutable snapshot at F2  
Indexing: tiles (`tileIndex`) + landmass list

Schema (Phase 2 canonical):
```ts
type LandmassId = number; // 0..landmasses.length-1

type WrappedBBox = {
  // Inclusive bounds in tile coordinates.
  // Wrap encoding: if the landmass crosses the X seam, encode as `west > east`.
  west: number;  // 0..width-1
  east: number;  // 0..width-1
  south: number; // 0..height-1
  north: number; // 0..height-1
};

type MorphologyLandmass = {
  id: LandmassId;
  tileCount: number;

  // Count of land↔water adjacency edges along the coastline.
  // Neighbor graph is the canonical hex tile adjacency with wrapX=true.
  coastlineLength: number;

  bbox: WrappedBBox;
};

type MorphologyLandmassesArtifact = {
  // Per tile: landmass id, or -1 for water.
  landmassIdByTile: Int32Array;

  // Landmasses list; stable ordering rule below.
  landmasses: ReadonlyArray<MorphologyLandmass>;
};
```

Determinism / ordering:
- Landmass connectivity is computed on the canonical tile neighbor graph with wrapX=true.
- Landmass IDs are assigned by **descending `tileCount`**, with deterministic tie-breakers:
  1) descending `coastlineLength`
  2) ascending wrapped `bbox.south`
  3) ascending wrapped `bbox.west` (interpreting wrapped interval deterministically; see bbox rule above)
  4) ascending `minTileIndex` within the component (computed during flood fill/union-find)
- `landmasses[]` must be ordered by `id` (0..n-1).

Semantics:
- `landmassIdByTile` values must be consistent with `landmasses[]` (every non-negative id must exist).
- `bbox` wrap encoding is canonical:
  - If the landmass does not cross the seam: `west <= east`.
  - If it crosses the seam: `west > east` and the wrapped interval is `[west, width-1] ∪ [0, east]`.

Canonical computation rules (determinism-critical):
- `coastlineLength` counting:
  - Count coastline edges as the number of **land↔water** adjacencies on the canonical tile neighbor graph (wrapX=true, wrapY=false).
  - Count each adjacency once from the land tile perspective: for each land tile, count the number of its neighbors that are water tiles.
  - Do not treat off-map north/south edges as coastline (no off-map adjacency exists in the tile graph).
- Wrapped bbox selection (when a landmass crosses the seam):
  - Compute the landmass’s X-extent on the wrapX cylinder by choosing the **minimum-width wrapped interval** that contains all member tile X values.
  - Canonical algorithm:
    1) Collect all member tile `x` values, sort ascending, and treat them as points on a circle of circumference `width`.
    2) Find the **largest gap** between consecutive points (including the wrap gap between last and first via `+width`).
    3) The wrapped interval is the complement of that largest gap; set `west` to the first point after the gap and `east` to the last point before the gap (mod `width`), yielding either `west <= east` (no seam crossing) or `west > east` (seam crossing encoding).
    4) Tie-breaker for equal largest gaps: choose the candidate with the smallest resulting `west` (numeric), then the smallest resulting `east`.

### `artifact:morphology.volcanoes` (required; truth intent)

Owner: Morphology  
Publish/freeze: immutable snapshot at F2  
Indexing: tiles (`tileIndex`) + volcano list

Schema (Phase 2 canonical):
```ts
type VolcanoKind = "subductionArc" | "rift" | "hotspot";

type Volcano = {
  tileIndex: number; // 0..width*height-1
  kind: VolcanoKind;
  // Normalized intensity for downstream projections (0..1).
  strength01: number;
};

type MorphologyVolcanoesArtifact = {
  // 1 if this tile contains a volcano vent; else 0.
  volcanoMask: Uint8Array;

  // Deterministic list of volcano vents; must be consistent with `volcanoMask`.
  volcanoes: ReadonlyArray<Volcano>;
};
```

Semantics:
- Volcano placement is derived from Foundation driver fields (not overlays), using:
  - `artifact:foundation.tectonics.volcanism` as the canonical melt/volcanism driver
  - boundary regime signals (from Foundation boundary classification / potentials) to determine `kind`
- Phase 2 causality lock: `artifact:morphology.volcanoes` is **intent-only** and MUST NOT mutate `artifact:morphology.topography` in-place.
  - Any physical expression of volcanic landforms in Civ7 (terrain/feature stamping) is Gameplay-owned and occurs downstream in `plot-volcanoes` (see the map projections/stamping spec).
- Volcano vents are land-only in Phase 2:
  - For every `v` in `volcanoes`, `artifact:morphology.topography.landMask[v.tileIndex] MUST be 1` at F2.
  - The Morphology volcanism planning algorithm MUST select vents only from tiles with `landMask=1`. Water tiles are never valid vent candidates.
- `strength01` is derived deterministically from Foundation driver strength (canonical baseline: `strength01 = volcanism / 255`, clamped to `[0,1]` after any deterministic Morphology-local smoothing).

Determinism / ordering:
- `volcanoes` is ordered by ascending `tileIndex`.
- If multiple candidate vents compete for a tile or neighborhood quota, resolve ties by:
  1) higher driver strength (deterministically derived scalar)
  2) higher local elevation (from `artifact:morphology.topography.elevation`)
  3) ascending `tileIndex`

---

## Disallowed / non-contract surfaces (explicitly not cross-domain)

These keys exist in legacy wiring but are **not** Phase 2 cross-domain contracts and must not be consumed by downstream domains:

### `artifact:morphology.routing`

Evidence pointer (legacy artifact schema):
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`

Policy (locked):
- Any Morphology routing primitives exist for **internal geomorphic cycles only**.
- Hydrology owns canonical routing/hydrography truth outputs and must not consume Morphology routing as a cross-domain input in the Phase 2 model.

### `artifact:morphology.coastlinesExpanded`

Evidence pointer (legacy marker):
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`

Policy (locked):
- Engine-facing “coast expansion applied” state is an **effect boundary concern**, not physics truth.
- If downstream needs an ordering guarantee around Civ7 coastline expansion/materialization, it must require a Gameplay-owned `effect:map.*` (not a Morphology artifact).

---

## Legacy-only artifacts to delete in Phase 3

(Reserved for Phase 3 migration checklists. Keep this list short and only include artifacts that are explicitly not part of the Phase 2 target contract model.)

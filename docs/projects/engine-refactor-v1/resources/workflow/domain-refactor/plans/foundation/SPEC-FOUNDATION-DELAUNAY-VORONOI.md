# SPEC: Foundation Mesh (Delaunay/Voronoi)

## 1) Objective

Define the canonical, mesh-first Delaunay/Voronoi backend for Foundation. This specification is domain-first and prohibits legacy adapters or fallback behavior.

## 2) Scope

In scope:
- `foundation.mesh.voronoi` mesh generation behavior.
- Canonical Voronoi backend capabilities and deterministic site generation.
- The mesh artifact contract (neighbors, areas, sites).

Out of scope:
- Engine Voronoi adapters or legacy compatibility fallbacks.
- Tile-first plate generation logic.
- Periodic wrap/tiling behavior (wrapX). If required later, it must be specified in a dedicated follow-up spec.
- Spherical triangulation.

## 3) Canonical Decisions

- **Backend:** Use a Delaunay/Voronoi implementation with the same capability surface as `d3-delaunay` (Delaunay triangulation, Voronoi polygons, neighbor iteration, Lloyd relaxation). This is the canonical backend.
- **Determinism:** All site generation and relaxation steps must be driven by deterministic RNG sourced from `RunRequest.settings` + step config. No `Math.random`.
- **Coordinate space:** The mesh operates in planar map-space coordinates (`0..width`, `0..height`). No periodic wrap semantics are applied at the mesh layer.
- **wrapX:** Not required for Foundation. Do not implement periodic tiling or seam stitching in the mesh backend. If a wrap requirement emerges, it must be re-specified before implementation.

## 4) Inputs

`foundation.mesh.voronoi` consumes:
- `width`, `height` (map dimensions).
- `mesh.cellCount` (explicit; no derived heuristics).
- `mesh.relaxationSteps` (Lloyd iterations).
- Deterministic RNG handle.

## 5) Output Contract (RegionMeshV1)

The canonical mesh artifact is a graph of regions, not a tile grid.

```ts
interface RegionMeshV1 {
  sites: Point2D[];
  neighbors: Int32Array[]; // neighbors[i] is a sorted, unique list
  areas: Float32Array;
  centroids: Point2D[];
  bbox: { xl: number; xr: number; yt: number; yb: number };
}
```

Contract invariants:
- Neighbor symmetry: if `j` is in `neighbors[i]`, then `i` is in `neighbors[j]`.
- All areas are finite and non-negative.
- `sites.length == neighbors.length == areas.length == centroids.length`.
- The mesh is valid without wrap semantics.

Storage detail (CSR vs arrays) is an implementation choice as long as the contract semantics hold.

## 6) Canonical Algorithm

1. Generate `mesh.cellCount` sites using deterministic RNG in map-space.
2. Compute Voronoi diagram from Delaunay triangulation.
3. Run Lloyd relaxation for `mesh.relaxationSteps` iterations (move sites to cell centroids).
4. Emit `RegionMeshV1`:
   - `sites` as relaxed centroids.
   - `neighbors` via Voronoi adjacency (do not infer via halfedge quantization).
   - `areas` from Voronoi polygon area.

## 7) Integration Seams (Canonical Only)

- Mesh generation lives in mapgen-core and is owned by Foundation (not adapters).
- Downstream steps (`foundation.crust.craton`, `foundation.plates.partition`, `foundation.tectonics.physics`) consume mesh artifacts only; they must not read adapter surfaces.
- Tile-indexed projections (`foundation.project.tiles`) are derived from mesh artifacts and must not influence mesh generation.

## 8) Validation Criteria

- Deterministic output for a fixed seed/config.
- Neighbor symmetry and no isolated cells.
- Total area approximates `width * height` (within a small numeric tolerance).
- No adapter calls or compatibility fallbacks in the mesh path.

## 9) References

- `docs/system/libs/mapgen/foundation.md`
- `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md` (algorithm seed; wrap semantics overridden here)
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/SPIKE-FOUNDATION-PRD-AUDIT.md`
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/SPIKE-FOUNDATION-DELAUNAY-FEASIBILITY.md`
- d3-delaunay API: https://www.npmjs.com/package/d3-delaunay

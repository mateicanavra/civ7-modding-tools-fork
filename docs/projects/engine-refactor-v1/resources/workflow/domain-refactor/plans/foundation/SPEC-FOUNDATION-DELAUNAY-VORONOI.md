# SPEC: Foundation Mesh Backend (Delaunay/Voronoi)

## 1) Objective

Define the canonical, mesh-first Delaunay/Voronoi backend for Foundation. This is a model-first, contract-first spec with **no legacy adapters or fallback paths**.

## 2) Scope and Non-goals

In scope:
- `foundation.mesh.voronoi` mesh generation semantics.
- Canonical Voronoi backend capabilities and deterministic site generation.
- The mesh artifact contract and invariants.
- Periodic wrapX semantics for cylindrical worlds (when `env.wrapX` is true).

Out of scope:
- Engine Voronoi adapters or legacy compatibility paths.
- Tile-first plate generation logic.
- WrapY or spherical triangulation.

## 3) Authority Stack

Authoritative:
- `docs/system/libs/mapgen/foundation.md`
- `docs/system/libs/mapgen/architecture.md`
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-030-operation-inputs-policy.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md`
- `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md`

Supporting (algorithmic seed; not authoritative for contracts):
- `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`

## 4) Canonical Model (Mesh-First)

### 4.1 Causality Spine (Foundation-local)

Mesh precedes crust, which precedes plate partition, which precedes boundary physics. Tile-indexed tensors are **projections** derived from the mesh and must not shape the mesh itself.

### 4.2 Mesh Semantics (Canonical)

- The mesh is a planar region graph derived from Delaunay → Voronoi.
- Mesh coordinates are planar map-space coordinates (`0..width`, `0..height`).
- When `wrapX` is true, adjacency and distance semantics are periodic in X (cylindrical world).
- The mesh is deterministic for a fixed seed + config.

## 5) Target Contract Matrix (Mesh Step)

```yaml
steps:
  - id: foundation/mesh.voronoi
    phase: foundation
    requires:
      artifacts: []
      buffers: []
      overlays: []
    provides:
      artifacts: [artifact:foundation.mesh]
      buffers: []
      overlays: []
    consumers:
      - foundation/crust.craton
      - foundation/plates.partition
      - foundation/tectonics.physics
      - foundation/project.tiles
```

## 6) Inputs and Config

### 6.1 Inputs (op input envelope)

- `width`, `height`: integer map dimensions.
- `rng`: deterministic RNG handle (derived from `RunRequest.settings` + step config).
- `wrapX`: whether the map wraps in X (from `env.wrap.wrapX`).
- `wrapY`: must be false; wrapY is not supported by this spec.

### 6.2 Op-Owned Config (strategy envelope)

- `mesh.cellCount` (required): number of mesh sites to generate.
- `mesh.relaxationSteps` (required): Lloyd iterations.

No implicit heuristics (no `cellDensity`, no coupling to plate count). If a caller wants a heuristic, it must be computed before calling the op and passed explicitly.

## 7) Output Contract (RegionMeshV1)

```ts
interface RegionMeshV1 {
  wrapX: boolean;
  /** Periodic width in mesh coordinate units (same basis as `sites`). */
  wrapWidth: number;
  sites: Point2D[];
  neighbors: Int32Array[]; // neighbors[i] is sorted and unique
  areas: Float32Array;
  centroids: Point2D[];
  bbox: { xl: number; xr: number; yt: number; yb: number };
}
```

Contract invariants:
- Neighbor symmetry: if `j` is in `neighbors[i]`, then `i` is in `neighbors[j]`.
- All areas are finite and non-negative.
- `sites.length == neighbors.length == areas.length == centroids.length`.
- If `wrapX` is true, neighbors must be wrap-correct across the seam.
- Determinism: same seed + config yields identical mesh.

Representation is an implementation choice (CSR or arrays) as long as the invariants hold.

## 8) Canonical Algorithm

1. Generate `mesh.cellCount` sites using deterministic RNG in map-space.
2. Compute Delaunay triangulation and Voronoi cells.
   - If `wrapX` is true, compute the Delaunay/Voronoi on a periodic X domain (e.g., site replication at `x±wrapWidth` and then fold adjacency back to base indices).
3. Apply Lloyd relaxation for `mesh.relaxationSteps` iterations (move each site to cell centroid).
4. Emit `RegionMeshV1` with neighbor lists from Voronoi adjacency and polygon areas.

Neighbor lists must come from the backend’s adjacency enumeration (not inferred via halfedge quantization).

## 9) Integration Seams (Canonical Only)

- The Voronoi backend is owned by Foundation (mapgen-core). No adapter-provided Voronoi utilities are allowed.
- `foundation/compute-mesh` consumes only deterministic RNG + dimensions + op-owned config.
- Downstream ops consume mesh artifacts; no downstream op may read adapter surfaces or legacy Voronoi helpers.

## 10) Legacy Disposition Ledger (Mesh-Scoped)

| Surface | Current Behavior | Decision | Rationale |
| --- | --- | --- | --- |
| Adapter Voronoi utilities (`voronoiUtils`) | Required input in `foundation/compute-mesh` | **Kill** | Canonical model forbids adapter dependencies. |
| `wrapX` in mesh contract | Required input and stored on mesh | **Keep** | Cylindrical worlds require wrap-correct adjacency for mesh-first tectonics. |
| `plateCount` → `cellCount` heuristic | Used to derive mesh cell count | **Kill** | Mesh config must be explicit; heuristics belong outside the op. |
| `cellDensity` derived from width/height | Implicit heuristic inside op | **Kill** | Deterministic, explicit config required. |
| Halfedge-quantization neighbor inference | Computes adjacency via halfedges | **Kill** | Backend adjacency enumeration is canonical. |

## 11) Upstream Input Selection

Foundation is the pipeline root. The only authoritative inputs are run settings (dimensions + RNG seed) and op-owned config. No upstream domain inputs are permitted.

## 12) Upstream Handoff Cleanup

Foundation is the pipeline root. There are no upstream compat surfaces to retain; all adapter-based Voronoi inputs are removed within Foundation itself.

## 13) Downstream Consumer Impact Scan

- `foundation/compute-plates-tensors` must be re-based to consume `artifact:foundation.mesh` rather than adapter Voronoi utilities.
- Any downstream consumer of plate tensors remains unchanged in the short term; mesh-first artifacts are additive, not replacements.
- Projection logic must use wrap-aware distances if `wrapX` is true; mesh adjacency must already be wrap-correct to avoid seam artifacts.

## 14) Pipeline Delta List (Contract-Level)

- Add `artifact:foundation.mesh` to the tag registry and stage-owned artifact contracts.
- Remove adapter Voronoi inputs from Foundation ops (`compute-mesh`, `compute-plates-tensors`).
- Publish mesh-first artifacts as canonical inputs to crust/plate/tectonics ops.

## 15) Architecture Alignment Note

- Aligns with `docs/system/libs/mapgen/foundation.md` (mesh-first, graph-based causality).
- Aligns with PRD wrapX assumptions in `PRD-plate-generation.md` (periodic X semantics).

## 16) Decisions + Defaults

**Decision: Canonical backend is Delaunay/Voronoi (d3-delaunay parity).**
- Rationale: stable, deterministic, provides Voronoi adjacency and Lloyd relaxation.
- Trigger to revisit: only if backend cannot meet determinism or performance requirements.

**Decision: Foundation mesh is wrap-correct when `wrapX` is true.**
- Rationale: cylindrical maps require adjacency across the seam for correct tectonics and projections.
- Trigger to revisit: only if `wrapX` is removed from the runtime environment or spherical meshing replaces cylindrical wrap.

**Decision: Explicit mesh config (cellCount + relaxationSteps).**
- Rationale: avoid implicit heuristics inside ops; config must be op-owned and explicit.
- Trigger to revisit: only if an external orchestration layer becomes the canonical place for heuristics.

**Decision: Neighbor lists derived from backend adjacency.**
- Rationale: adjacency is a topological invariant; halfedge quantization is a fragile proxy.
- Trigger to revisit: only if the backend cannot provide adjacency enumerations.

## 17) Risk Register

```yaml
risks:
  - id: R1
    title: "Mesh adjacency differs from legacy Voronoi halfedge inference"
    severity: medium
    blocking: false
    notes: "Expected; consumers should rely on canonical adjacency, not legacy inference."
  - id: R2
    title: "Downstream ops still depend on adapter Voronoi"
    severity: high
    blocking: true
    notes: "Must be removed during the refactor; no compat in Foundation."
  - id: R3
    title: "Performance cost of Lloyd relaxation"
    severity: medium
    blocking: false
    notes: "Bound via config; measure in implementation slices."
  - id: R4
    title: "Periodic Voronoi edge cases at the seam (area/centroid correctness)"
    severity: medium
    blocking: false
    notes: "Must ensure wrap-correct adjacency and areas when `wrapX` is true."
```

## 18) Golden Path (Authoritative Shape)

Use the canonical authoring posture (op contracts in domain; step orchestration only; artifacts published via stage-owned contracts). This spec does not define filenames, but it enforces the shape:

```ts
defineStep({
  id: "foundation",
  phase: "foundation",
  artifacts: { provides: [foundationArtifacts.mesh] },
  ops: { computeMesh: foundation.ops.computeMesh },
});
```

## 19) Validation Criteria

- Deterministic output for fixed seed/config.
- Neighbor symmetry holds for all cells.
- Total area approximates `width * height` within tolerance.
- When `wrapX` is true, at least one seam-adjacent cell has neighbors across the seam.
- Zero adapter dependencies in mesh code path.

## 20) Projection Policy (Explicit)

Tile-indexed tensors (`artifact:foundation.plates`) are **projections** of the mesh-first model. They must not influence mesh generation. Projection logic belongs downstream of the mesh op.
When `wrapX` is true, projections must assume mesh adjacency is wrap-correct and must not re-run tectonic classification at tile level to compensate.

## 21) Appendix: WrapX Periodic Voronoi Strategy (Research-backed)

Periodic Delaunay/Voronoi is a standard construction for periodic domains (flat torus / cylindrical). CGAL documents periodic Delaunay triangulations where points outside the fundamental domain are periodic copies of points inside, and the triangulation operates on representatives with offsets. This supports modeling wrap semantics by operating on periodic copies and folding adjacency back to the base domain.

Practical implementations often realize periodic Voronoi by replicating points using periodic images outside the box before invoking a non-periodic Voronoi backend. The freud Voronoi module (periodic boundary conditions) explicitly uses replication of periodic images to obtain correct Voronoi cells and neighbors.

Canonical algorithm shape for Foundation (wrapX only):
1. Given base sites in [0, W) x [0, H), create periodic images at x-W and x+W.
2. Build a Delaunay/Voronoi diagram on the expanded site set with d3-delaunay.
3. For each base site, union neighbor indices from all of its periodic images, map them back to base indices, and dedupe/sort.
4. For area/centroid, use the polygon of the base site and clip to the base domain. If a polygon wraps, use the periodic images to reconstruct the clipped shape before centroid/area.
5. Emit wrapX=true and wrapWidth=W in the mesh contract so downstream ops can compute wrap-correct distances.

This approach avoids any legacy or fallback paths while ensuring seam adjacency exists for mesh-first tectonics.

## 22) Research Sources

Internal:
- `docs/system/libs/mapgen/foundation.md`
- `docs/system/libs/mapgen/architecture.md`
- `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/contract.ts`
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/index.ts`
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/contract.ts`
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
- `mods/mod-swooper-maps/src/domain/foundation/plates.ts`

External:
- d3-delaunay API: https://www.npmjs.com/package/d3-delaunay
- CGAL Periodic 2D Triangulations (flat torus, periodic copies/offsets): https://doc.cgal.org/latest/Periodic_2_triangulation_2/index.html
- freud Voronoi (periodic boundaries via point replication): https://freud.readthedocs.io/en/v1.1.0/examples/module_intros/Voronoi-Voronoi.html

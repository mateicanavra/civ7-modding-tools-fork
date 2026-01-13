# SPEC: Foundation Mesh Backend (Delaunay/Voronoi)

## 1) Objective

Define the canonical, mesh-first Delaunay/Voronoi backend for Foundation. This is a model-first, contract-first spec with **no legacy adapters or fallback paths**.

## 2) Scope and Non-goals

In scope:
- `foundation.mesh.voronoi` mesh generation semantics.
- Canonical Voronoi backend capabilities and deterministic site generation.
- The mesh artifact contract and invariants.

Out of scope:
- Engine Voronoi adapters or legacy compatibility paths.
- Tile-first plate generation logic.
- Periodic wrap/tiling behavior (wrapX). If needed later, it must be specified in a dedicated follow-up spec.
- Spherical triangulation.

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
- **No periodic wrap behavior** is applied at the mesh layer.
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

### 6.2 Op-Owned Config (strategy envelope)

- `mesh.cellCount` (required): number of mesh sites to generate.
- `mesh.relaxationSteps` (required): Lloyd iterations.

No implicit heuristics (no `cellDensity`, no coupling to plate count). If a caller wants a heuristic, it must be computed before calling the op and passed explicitly.

## 7) Output Contract (RegionMeshV1)

```ts
interface RegionMeshV1 {
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
- Determinism: same seed + config yields identical mesh.

Representation is an implementation choice (CSR or arrays) as long as the invariants hold.

## 8) Canonical Algorithm

1. Generate `mesh.cellCount` sites using deterministic RNG in map-space.
2. Compute Delaunay triangulation and Voronoi cells.
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
| `wrapX` in mesh contract | Required input and stored on mesh | **Kill** | Wrap semantics are out of scope for Foundation mesh. |
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

## 14) Pipeline Delta List (Contract-Level)

- Add `artifact:foundation.mesh` to the tag registry and stage-owned artifact contracts.
- Remove adapter Voronoi inputs from Foundation ops (`compute-mesh`, `compute-plates-tensors`).
- Publish mesh-first artifacts as canonical inputs to crust/plate/tectonics ops.

## 15) Architecture Alignment Note

- Aligns with `docs/system/libs/mapgen/foundation.md` (mesh-first, graph-based causality).
- Conflicts with PRD wrapX assumptions in `PRD-plate-generation.md`; **this spec overrides PRD wrap semantics** for the Foundation mesh backend.

## 16) Decisions + Defaults

**Decision: Canonical backend is Delaunay/Voronoi (d3-delaunay parity).**
- Rationale: stable, deterministic, provides Voronoi adjacency and Lloyd relaxation.
- Trigger to revisit: only if backend cannot meet determinism or performance requirements.

**Decision: No wrapX in Foundation mesh.**
- Rationale: periodic tiling is a separate concern; the mesh is planar.
- Trigger to revisit: only if a later spec explicitly reintroduces periodicity requirements.

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
- Zero adapter dependencies in mesh code path.

## 20) Projection Policy (Explicit)

Tile-indexed tensors (`artifact:foundation.plates`) are **projections** of the mesh-first model. They must not influence mesh generation. Projection logic belongs downstream of the mesh op.

## 21) Research Sources

Internal:
- `docs/system/libs/mapgen/foundation.md`
- `docs/system/libs/mapgen/architecture.md`
- `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/contract.ts`
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/index.ts`
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/contract.ts`

External:
- d3-delaunay API: https://www.npmjs.com/package/d3-delaunay

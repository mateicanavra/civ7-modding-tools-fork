# SPIKE-FOUNDATION-DELAUNAY-FEASIBILITY

## 1) Objective

Evaluate feasibility of a canonical, mesh-first Delaunay/Voronoi backend for Foundation (no legacy or adapter fallback), including wrapX requirements and integration touchpoints.

## 2) Assumptions and Unknowns

Assumptions:
- Canonical only: no engine Voronoi adapter, no fallback path.
- Foundation is mesh-first (Delaunay -> Voronoi) and offline-capable.
- wrapX requirement needs revalidation against current architecture goals (PRD is outdated).

Unknowns:
- Final mesh coordinate space (hex-space vs raw width/height) and how wrapX would be expressed there if required.
- Whether Foundation must be wrapX-correct at this stage vs. handled at later projection steps.
- How far we must go in matching Civ7 internal Voronoi behavior for parity (not required for canonical correctness, but may matter for comparison).

## 3) Current State (Baseline)

- Foundation step still requires adapter Voronoi utilities and engine reads: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.ts`.
- Mesh generation uses Voronoi cell halfedges to infer neighbors: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/index.ts`.
- Tile projection (plates tensors) is still driven by `computePlatesVoronoi`: `mods/mod-swooper-maps/src/domain/foundation/plates.ts`.
- Op contracts explicitly describe Voronoi as adapter-provided: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/contract.ts` and `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/contract.ts`.

## 4) Canonical Requirements (Docs)

- Foundation must be mesh-first (Delaunay -> Voronoi) and treat tile tensors as projections: `docs/system/libs/mapgen/foundation.md`.
- PRD expects offline runnable Foundation and explicit wrap semantics: `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`.

## 5) Canonical Backend Candidate: d3-delaunay

- d3-delaunay computes Delaunay triangulations and exposes Voronoi diagrams, cell polygons, neighbor iteration, and `update()` for Lloyd relaxation: https://www.npmjs.com/package/d3-delaunay.
- This aligns with the archived mesh plan that explicitly chose d3-delaunay for performance: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-foundation-step-2-mesh.md`.

## 6) Integration Seams (Canonical Only)

- The canonical seam is the Voronoi utilities interface: `mods/mod-swooper-maps/src/domain/foundation/types.ts`.
- compute-mesh currently derives neighbors from halfedges; d3-delaunay exposes `voronoi.neighbors(i)` directly, so the op should consume neighbor iterators rather than halfedges.
- compute-plates-tensors only needs Voronoi cells + area and can stay structurally similar with a new backend.

## 7) wrapX Decision (Pending)

If wrapX is not a Foundation requirement in the current architecture, the backend should skip wrap handling entirely. If wrapX is required, we need an explicit decision on how to express periodicity in a canonical way before implementation.

## 8) Touchpoints and Impact Map

- Foundation step: remove `adapter.getVoronoiUtils` requirement and source canonical Voronoi internally.
- Voronoi utils location: place the canonical backend in mapgen-core (matches archived intent and offline requirement).
- Tests: remove stub Voronoi (empty halfedges) and use canonical backend in test harness.

## 9) Verdict

Feasible with caveats. The core algorithmic surface maps cleanly to d3-delaunay. The main open decision is whether wrapX is a Foundation requirement and, if so, how to express periodicity canonically.

## 10) Minimal Experiment

A small POC wrapper that:
- Generates a Voronoi diagram from d3-delaunay.
- Performs 2-3 Lloyd steps using `update()`.
- Produces neighbors via `voronoi.neighbors(i)` and verifies symmetry.
If wrapX is re-affirmed as in-scope, add a separate micro-POC focused solely on periodicity semantics before wiring it into the backend.

This validates the hardest open questions without touching production code.

## 11) Risks and Open Questions

- WrapX requirement drift: if Foundation does need wrapX, we must choose a canonical periodicity strategy before implementation.
- Coordinate space: Foundation expects hex-space semantics; we need to decide if Voronoi runs in hex-space or grid-space.

## 12) References

Internal:
- `docs/system/libs/mapgen/foundation.md`
- `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/index.ts`
- `mods/mod-swooper-maps/src/domain/foundation/plates.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.ts`
- `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-foundation-step-2-mesh.md`

External:
- d3-delaunay API: https://www.npmjs.com/package/d3-delaunay

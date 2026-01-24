# Foundation Realism (M11) — Plate partition realism

Primary spike: `../spike-foundation-realism-gaps.md`

This doc deep-dives the “plate partition realism” area (non-Voronoi, variable-size, deterministic), including the open questions and recommended physics-first direction.

## Scope (this area only)

- Improve the plate partition to avoid uniform Voronoi blobs and produce a realistic size distribution (few large plates + tail of smaller plates/microplates).
- Define and publish the minimal “truth” needed to reason about plates (IDs + topology) without pulling map/projection artifacts into Physics.

Relevant current code touchpoints:
- Current plate graph generation (Voronoi-like):
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`
- Existing topology helper (wrapX-only):
  - `packages/mapgen-core/src/lib/plates/topology.ts` (`buildPlateTopology`)

## Q4) Plate topology: publish as an artifact or keep internal?

Question: “Should plate topology be a first-class artifact (`artifact:foundation.plateTopology`) or remain an internal helper?”

### Alternative A — Internal helper only (derived ad hoc by consumers)
- Behavior
  - Each consumer that needs topology (plate areas, adjacency) recomputes it when needed.
- Modeling
  - `buildPlateTopology` remains a library helper only.
  - No new artifacts; topology is not a contract surface.
- Implementation
  - No artifact/tag changes; consumers import `packages/mapgen-core/src/lib/plates/topology.ts`.
  - Risk: duplicated computations, drift in “which plate count”/ID semantics across consumers.

### Alternative B — First-class truth artifact: `artifact:foundation.plateTopology` (recommended)
- Behavior
  - A single canonical topology snapshot is available to any Physics consumer without rescanning tiles repeatedly.
  - Enables validation metrics (plate size distributions, adjacency degrees) without adding map projections.
- Modeling
  - New op: `foundation/compute-plate-topology` (compute), taking `{ width, height, platesId }` and outputting a topology object.
  - Artifact: `artifact:foundation.plateTopology` (truth) containing:
    - `plateCount`
    - per-plate `area`, `centroid`, `neighbors`
  - Step placement:
    - either produced as part of the existing projection step (after `foundationPlates` is available), or
    - its own step immediately after projection (cleaner separation; avoids mega-ops).
- Implementation
  - Add artifact tag in `packages/mapgen-core/src/core/types.ts` and schema in `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`.
  - Implement using the existing helper: `packages/mapgen-core/src/lib/plates/topology.ts`.
  - Wire as a new step (preferred) in `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts`.

### Alternative C — “Topology-as-diagnostics” only (trace events, no artifact)
- Behavior
  - Topology is used only for logging/metrics; not available as a reusable dependency.
- Modeling
  - Keep helper internal; emit topology summaries via `context.trace.event` in a step.
- Implementation
  - Add trace emission in `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts` (or a dedicated diagnostics step).

### Recommendation

Choose **Alternative B (publish `artifact:foundation.plateTopology`)**.

- It strengthens the truth lane with a reusable, stable diagnostic surface.
- It directly supports the validation questions (plate size/adjacency distributions) without violating the map boundary.
- It is small, deterministic, and topology-invariant-friendly (wrapX-only).

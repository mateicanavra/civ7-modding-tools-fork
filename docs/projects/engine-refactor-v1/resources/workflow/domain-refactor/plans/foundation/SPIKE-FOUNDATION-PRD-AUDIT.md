# SPIKE-FOUNDATION-PRD-AUDIT

## Objective
Compare the (outdated) plate generation PRD and Foundation domain docs against the current Foundation refactor implementation, focusing on domain modeling alignment and the Delaunay/Voronoi algorithm intent.

## Assumptions and Unknowns
- Assumption: “latest attempt” refers to the M8/U21 Foundation vertical refactor slices that introduced mesh-first artifacts while keeping `foundation.plates`/`foundation.dynamics` stable as projections.
- Unknown: Whether Civ7’s `CivVoronoiUtils` internally uses a Delaunay triangulation (engine global, not visible here).
- Unknown: Whether the intended target is fully engine-independent/offline Foundation (per PRD) or engine-assisted but contract-first.

## What We Learned
The historical PRD/modeling docs are explicit that the Foundation model is **mesh-first** (Delaunay → Voronoi), and tile tensors are projections:
- Canonical domain framing: `docs/system/libs/mapgen/foundation.md`
- PRD “north star”: `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`
- Archived plan explicitly choosing `d3-delaunay`: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-foundation-step-2-mesh.md`

The current stack-tip implementation diverges from that intent in multiple ways:

1) **No Delaunay library is used or installed.**
- There is no `d3-delaunay` dependency in the repo.
- Voronoi computation is delegated to the Civ7 adapter (`getVoronoiUtils`), not a local Delaunay/Voronoi library.
  - Adapter: `packages/civ7-adapter/src/civ7-adapter.ts`
  - Mock adapter stub: `packages/civ7-adapter/src/mock-adapter.ts`

2) **Mesh-first artifacts exist, but they are scaffolding and not used to produce `foundation.plates`.**
- The Foundation step publishes mesh-first artifacts (mesh/crust/plateGraph/tectonics), but `foundation.plates` is still produced via the legacy tile-first generator.
  - Step orchestration: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.ts`
  - Legacy plates generator: `mods/mod-swooper-maps/src/domain/foundation/plates.ts` (`computePlatesVoronoi`)
  - Plates op wrapper: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/index.ts`

3) **Mesh-first algorithms are placeholders vs PRD intent.**
- `compute-mesh` uses adapter Voronoi, no wrap-aware Voronoi and no explicit Delaunay; neighbor extraction relies on Voronoi halfedges that the mock implementation does not provide.
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/index.ts`
  - Mock Voronoi returns empty halfedges: `packages/civ7-adapter/src/mock-adapter.ts`
- `compute-crust` is random per mesh cell (no craton seeding or growth).
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts`
- `compute-plate-graph` is nearest-seed assignment (no weighted flood fill, no crust resistance).
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`
- `compute-tectonics` uses simplified dot-product boundary typing; does not implement the PRD’s normal/tangential decomposition or crust-aware subduction rules.
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`

4) **Foundation still depends on engine adapter reads.**
- The step requires `adapter.getVoronoiUtils`, `adapter.getLatitude`, and `adapter.isWater`, which conflicts with the PRD’s “offline runnable, no engine reads” posture.
  - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.ts`

## Potential Shapes
- **PRD-aligned mesh-first path:** Introduce a deterministic, engine-independent Delaunay/Voronoi backend (e.g., `d3-delaunay`) and derive `foundation.plates` by projecting from mesh/crust/plateGraph/tectonics artifacts.
- **Hybrid path:** Keep adapter Voronoi for in-engine runs, but add a parallel, deterministic Voronoi implementation for offline tests and CLI runs; enforce consistent invariants across both.

## Minimal Experiment (Optional)
Swap the mock adapter’s Voronoi stub for a real Voronoi backend (or a thin wrapper around `d3-delaunay`) and validate:
- Non-empty halfedges and neighbor CSR in `foundation.mesh`.
- Deterministic Lloyd relaxation (site convergence) under fixed seeds.

## Risks and Open Questions
- **WrapX correctness:** Current Voronoi calls do not receive wrap semantics; wrap-aware Voronoi may need explicit strategy (replication/stitching/periodic distance).
- **Determinism:** Engine-global Voronoi vs pinned library affects reproducibility.
- **Performance:** Archived docs cite `d3-delaunay` for perf; current adapter path is a black box.
- **Transition intent:** Was it expected that `foundation.plates` would already be mesh-projected, or is the current “scaffolding-only” state intentional?

## Next Steps
If the goal is to realign implementation with the PRD’s algorithmic intent, escalate to a feasibility spike focusing on:
- Voronoi/Delaunay backend selection and wrap strategy.
- A projection plan for `foundation.plates` from mesh-first artifacts.
- Tests that validate mesh topology, crust modeling, and boundary physics semantics.

---
id: LOCAL-TBD-M11-U10
title: "[M11/U10] Replace Voronoi plate partition with realism-first partition (+ topology artifact)"
state: planned
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [foundation, plates, realism, contracts]
parent: LOCAL-TBD-M11-U15
children: []
blocked_by: []
blocked: []
related_to: [M11-U00]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace Voronoi-nearest plate assignment with a deterministic, crust-aware (physics-first) partition that yields realistic plate sizes, and publish `artifact:foundation.plateTopology` as a truth artifact for validation + downstream consumers.
- Why now: M11’s physics-first realism work needs a non-Voronoi partition so tectonics/morphology don’t inherit a uniform “fake mosaic” substrate, and so we can validate plate realism with topology metrics.

## Deliverables
- Shared slice invariants: see `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U15-foundation-realism-execution-spine.md` (`FND-INV-*`).
- [x] Replace `foundation/compute-plate-graph`’s Voronoi-nearest assignment with a realism-first partition:
  - Multi-source weighted region growth (Dijkstra/flood fill) over mesh adjacency.
  - Variable-size distribution by default (few large plates + tail of smaller plates/microplates).
  - Crust-aware resistance so old continental/craton cores are not routinely bisected.
- [x] Publish `artifact:foundation.plateTopology` as a first-class truth artifact computed from rasterized plate IDs (tile plate id field) with cylinder wrap semantics.
- [x] Add plate partition validation metrics (used in tests; optionally emitted via trace/diagnostics):
  - plate area distribution (heavy-tail / non-uniform)
  - adjacency degree distribution (non-degenerate)
  - sliver detection (no tiny/thin plates in the default configuration)
- [x] Update Foundation tests to lock determinism + realism metrics without hard-coding full plate maps.

## Acceptance Criteria
- Partition realism
  - [x] Default Foundation outputs no longer resemble uniform Voronoi blobs (qualitative): a few plate interiors dominate area; boundaries do not read as an even mosaic.
  - [x] Plate area distribution is measurably non-uniform (quantitative, via `artifact:foundation.plateTopology`):
    - `p90Area / p50Area >= 1.4` on a representative test map (e.g. `60x40`) for at least 2 deterministic seeds.
    - `minArea >= 8` tiles (no “one-tile plates” / slivers) for the same test cases.
  - [x] Adjacency degrees are plausible and non-degenerate (quantitative, via `artifact:foundation.plateTopology`):
    - mean degree is within a reasonable band (e.g. `3..7`)
    - variance is non-zero (not all plates have the same neighbor count)
- Topology artifact contract
  - [x] `artifact:foundation.plateTopology` is published by the Foundation stage and includes, at minimum, `plateCount` plus per-plate `{ id, area, centroid, neighbors }`.
  - [x] Topology neighbor relations are symmetric (`A` lists `B` ⇒ `B` lists `A`) and respect the cylinder invariant (`wrapX=true`, `wrapY=false`).
  - [x] `plateCount` is consistent with the raster plate id field used to build it (`0..plateCount-1`, no out-of-range IDs).
- Determinism + single-path cutover
  - [x] The partition + topology are deterministic under the same `{seed, config, dimensions}` (tests assert stability).
  - [x] There is no legacy/Voronoi “fallback” strategy preserved in the shipped pipeline (single coherent model).

## Testing / Verification
- Run the Foundation test suite:
  - `bun run --cwd mods/mod-swooper-maps test`
- Add/extend tests that compute realism metrics from `artifact:foundation.plateTopology` (prefer metrics assertions over snapshotting full `cellToPlate`/tile id arrays):
  - Extend `mods/mod-swooper-maps/test/foundation/mesh-first-ops.test.ts` with topology metrics checks.
  - (Optional) Add a dedicated metrics test file if it improves clarity (still Bun tests under `mods/mod-swooper-maps/test/foundation/`).
- Smoke-check the full workspace if needed:
  - `bun run test`
- Verification (this slice):
  - `bun run --cwd mods/mod-swooper-maps test` ✅

## Dependencies / Notes
- Related plan: `docs/projects/engine-refactor-v1/issues/M11-U00-physics-first-realism-upgrade-plan.md`
- Spike references (context + rationale):
  - `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-realism-gaps.md`
  - `docs/projects/engine-refactor-v1/resources/spike/foundation-realism/plate-partition-realism.md`
  - `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-realism-open-questions-alternatives.md` (Q4)
- North-star algorithm expectations: `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md` (see “7.3 Plate partitioning”)
- Traceability:
  - Branch: `agent-RAMBO-M11-U10-foundation-plate-partition-realism`
  - PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/708
- Notes
  - This issue intentionally does **not** tackle tectonic segments/history, polar plates, or crust ownership changes; it focuses on making the partition (and its topology) realism-grade so downstream physics can build on it.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Modeling Approach (Ops / Strategies / Rules / Steps)
- **Op:** keep `foundation/compute-plate-graph` as the single partition op, but replace the current “nearest seed” logic with weighted region growth.
- **Strategy posture:** do not introduce a second long-lived strategy for the legacy Voronoi assignment; the default strategy becomes the realism-first implementation.
- **Rules (internal):** seed selection, edge-cost function (crust-aware), per-plate growth weighting (major vs minor), deterministic tie-breaking.
- **Step boundary:** publish only truth artifacts (`artifact:foundation.*`). `artifact:foundation.plateTopology` is a derived truth artifact produced in Foundation (recommended as its own step after projection, since topology builds from rasterized plate ids).

### Implementation Sketch (Algorithm)
1. **Seed plates**
   - Determine `plateCount` (after existing normalization scaling).
   - Deterministically choose seed cells; prefer a minimum separation heuristic to reduce immediate slivers.
   - Assign each seed a “growth weight” (major vs minor) and kinematics (velocity + rotation) using deterministic RNG.
2. **Partition via multi-source weighted growth**
   - Run a multi-source Dijkstra/flood fill on the mesh adjacency graph.
   - Edge cost is crust-aware (e.g., higher cost through older continental crust; lower cost through oceanic), so boundaries preferentially form in oceanic areas and avoid bisecting cratons.
   - Plate growth weight biases region capture to produce a realistic size distribution (few large, many smaller), without enforcing exact target percentages.
3. **Raster topology artifact**
   - Compute `artifact:foundation.plateTopology` from the raster plate id field (`artifact:foundation.plates.id`) using `buildPlateTopology` (cylinder semantics baked in).
   - Use topology metrics (area + adjacency degree histograms + sliver count) to validate realism and prevent regressions.

### Cutover Plan (No Dual Paths)
#### Replace Voronoi partition
- Delete/replace the Voronoi-nearest assignment in `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts` (remove the “pick closest seed by distance” inner loop).
- Keep the contract surface stable unless new driver knobs are required; if config expands, keep it strictly typed and `additionalProperties: false`.

#### Add `artifact:foundation.plateTopology`
- Add a new artifact tag and schema for `artifact:foundation.plateTopology`, then publish it from Foundation as a truth artifact derived from raster plate IDs.
- Prefer adding a dedicated step after `projection` (keeps ops pure and avoids growing `projection` into a mega-op).

```yaml
files:
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/contract.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/plateGraph.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/plateTopology.contract.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/plateTopology.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/index.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/validation.ts
  - packages/mapgen-core/src/core/types.ts
  - packages/mapgen-core/src/lib/plates/topology.ts
  - mods/mod-swooper-maps/test/foundation/mesh-first-ops.test.ts
docs:
  - docs/projects/engine-refactor-v1/resources/spike/foundation-realism/plate-partition-realism.md
  - docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md
artifacts:
  - artifact:foundation.plateGraph
  - artifact:foundation.plates
  - artifact:foundation.plateTopology
```

### Guardrails
- Uphold the invariants defined in the public Deliverables section (do not restate them elsewhere; treat them as the source of truth).
- Prefer stable, deterministic tie-breaking for any priority queue / flood fill so results do not vary by iteration order across runtimes.

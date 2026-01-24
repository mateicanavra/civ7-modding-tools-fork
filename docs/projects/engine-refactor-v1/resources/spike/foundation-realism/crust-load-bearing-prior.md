# Foundation Realism (M11) — Crust as load-bearing prior (buoyancy/isostasy)

Primary spike: `../spike-foundation-realism-gaps.md`

This doc deep-dives the crust/isostasy area (continents vs basins, shelves, cratons, passive margins) and how it should become a load-bearing prior for Morphology.

## Scope (this area only)

- Crust truth ownership and data model (mesh-indexed), including “driver-ish” fields that can support isostatic/buoyancy baselines.
- Plate-coherence: crust should be spatially coherent and generally plate-aligned where it matters, but without turning plate IDs into “continent plates” as a hard switch.

Relevant current code touchpoints:
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts`
- Existing but unwired intent:
  - `packages/mapgen-core/src/lib/plates/crust.ts`
  - `packages/mapgen-core/src/lib/heightfield/base.ts`

## Q1) Crust ownership: per plate vs per mesh cell?

Question: “Should crust be ‘owned’ per plate (plate-scale) or per mesh cell (with plate-scale coherence constraints)?”

### Alternative A — Mesh-cell truth, plate-coherence as constraints (cell-first with plate-aware regularization)
- Behavior
  - Crust varies at mesh resolution (supports cratons, passive margins, basins) but remains **spatially coherent** and generally plate-aligned where it matters.
  - Plates do not “force” a single crust type; instead, plates bias crust evolution/ageing.
- Modeling (ops / strategies / rules / steps + artifacts)
  - Op: `foundation/compute-crust` remains the crust author, expanded from `{ type, age }` to include driver-ish fields (e.g. `thicknessProxy`, `densityProxy`, `strengthProxy`), still **mesh-indexed truth**.
  - Rules inside `compute-crust`:
    - `seedCrustProvinces` (coherent seeds in mesh space)
    - `diffuseOrGrowCrustProvinces` (graph diffusion / region growth using mesh adjacency)
    - `enforcePlateCoherenceSoft` (penalty for rapid oscillation across plate boundaries; *soft*, not hard)
  - Artifact remains `artifact:foundation.crust` (mesh) plus optional `artifact:foundation.crustStatsByPlate` (derived diagnostics/truth; plate aggregates only).
  - Projection continues to publish `artifact:foundation.crustTiles` via `foundation/compute-plates-tensors`.
- Implementation (where it lands + changes)
  - Expand schema in `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/contract.ts`.
  - Implement rules under `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/rules/*` (or equivalent local layout).
  - Consume plate information (for coherence) either by:
    - requiring `plateGraph` in the op input (contract change), or
    - keeping `compute-crust` independent and adding a follow-up op `foundation/refine-crust-with-plate-coherence` that takes `{ crust, plateGraph }`.
  - Update `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/crust.ts` and artifact validators as needed.

### Alternative B — Plate-owned crust templates, projected down (plate-first)
- Behavior
  - Each plate has an explicit “crust template” (oceanic/continental/mixed + age profile), producing broad, plate-coherent continents/basins.
  - Fine detail comes from within-plate noise, not cross-plate patchwork.
- Modeling
  - `foundation/compute-plate-graph` expands to include per-plate crust template params (e.g. `continentalShare`, `meanAge`, `thicknessProxyMean`).
  - `foundation/compute-crust` becomes “apply plate crust templates to cells”, with optional within-plate province rules.
  - Artifacts:
    - `artifact:foundation.plateGraph` becomes more semantically load-bearing (plate params).
    - `artifact:foundation.crust` remains mesh-indexed truth derived from plate templates.
- Implementation
  - Expand `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/contract.ts` plate schema.
  - Update `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts` to consume `plateGraph` (contract changes).
  - Update any callers/tests relying on current `compute-crust` independence (e.g. `mods/mod-swooper-maps/test/foundation/mesh-first-ops.test.ts`).

### Alternative C — Two-layer crust: plate background + cell provinces (plate-first background, cell-level provinces)
- Behavior
  - Plates define a smooth, broad “background” (e.g. oceanic vs continental tendency), while cell-level provinces carve shelves, margins, and cratons.
  - Produces believable “continent plates” *and* non-trivial margins without clamps.
- Modeling
  - `compute-plate-graph` publishes plate-level background drivers.
  - `compute-crust` publishes cell-level provinces (including `provinceId`), with a rule that provinces must be consistent with plate background.
  - Optional additional truth artifact: `artifact:foundation.crustProvinces` (mesh-level province graph for consumers).
- Implementation
  - Contract additions in both ops; projection op can remain unchanged if it samples the expanded crust fields via `tileToCellIndex`.

### Recommendation (physics-first maximal within constraints)

Choose **Alternative A (mesh-cell truth with plate-aware regularization)**.

- It preserves physics truth at the highest useful resolution (mesh), avoids overloading `plateGraph` with non-kinematic semantics, and supports later extensions (cratons/margins) without outcome clamps.
- Plate influence can be injected as a **soft driver** (coherence penalty), not a hard “continent plate” switch.
- It composes cleanly with compile-first normalization and keeps “truth artifacts” stable (`artifact:foundation.crust` is authoritative; projections remain derived).


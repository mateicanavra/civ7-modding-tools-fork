---
id: LOCAL-TBD-M11-U13
title: "[M11/U13] Make crust a load-bearing prior (mesh truth + isostasy baseline drivers)"
state: planned
priority: 1
estimate: 8
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [foundation, crust, realism, contracts]
parent: LOCAL-TBD-M11-U15
children: []
blocked_by: [LOCAL-TBD-M11-U12]
blocked: []
related_to: [M11-U00, M11-U04, M11-U06, LOCAL-TBD-M11-U10, LOCAL-TBD-M11-U11, LOCAL-TBD-M11-U14]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Make `foundation.crust` a mesh-indexed truth artifact that publishes buoyancy/isostasy baseline drivers (continents/basins/shelves), with optional **post-partition plate-coherence refinement** to avoid dependency cycles—so Morphology’s base heightfield starts from crust, not noise or post-hoc clamps.
- Why now: M11’s “physics-first realism” depends on crust being a causal prior; without an isostatic baseline, Morphology is forced to invent continents/sea basins from boundary noise and thresholds.

## Deliverables
- Shared slice invariants: see `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U15-foundation-realism-execution-spine.md` (`FND-INV-*`).
- **Crust-specific invariants (must hold after cutover)**
  - Crust is authored as **mesh-cell truth**; tile crust is derived by projection via `tileToCellIndex`.
  - Plate IDs influence crust (if used) via **soft coherence/regularization only** (no plate-owned “continent templates” as hard switches).
  - Downstream consumes **drivers/inputs** (`baseElevation`, `buoyancy`, proxies), not “force this outcome” clamps.
  - Single coherent path: delete/disable legacy equivalents; no recipe-side shims/dual pipelines.
- **High-level (what crust must explain, and why this unlocks realism)**
  - Continents vs ocean basins as a first-order substrate signal (not invented downstream).
  - Continental shelves + passive margins with plausible widths/gradients (not uniform coast noise).
  - Cratons/stable interiors vs deformable margins as long-lived signals (enables believable uplift/erosion responses later).
- **Mid-level (modeling approach: mesh truth drivers + plate-aware regularization + baseline derivation)**
  - Expand crust truth beyond `{ type, age }` into driver fields (thickness/density/strength proxies) and derived `buoyancy` + `baseElevation`.
  - Implement plate-aware regularization as a **soft penalty** using per-cell plate IDs as a prior (prefer coherence inside plates; allow structured margins near plate boundaries).
  - Derive a deterministic, low-frequency baseline heightfield (`baseElevation`) from crust drivers (isostasy/buoyancy proxy) and publish it for Morphology to add tectonic/belt effects on top.
- **Low-level (contracts + op wiring + tests + cutover; single slice)**
  - [ ] Upgrade `foundation/compute-crust` to output coherent mesh truth drivers and a derived isostatic baseline (`baseElevation`), still authored as crust-first truth (no plate dependency).
  - [ ] (If plate-coherence is needed) add a follow-up op/step (e.g. `foundation/refine-crust-with-plate-coherence`) that consumes `{ mesh, crust, plateGraph }` and publishes the refined `artifact:foundation.crust` **after** `plateGraph` (avoids dependency cycles because the partition still consumes the pre-refined crust).
  - [ ] Project crust drivers to tiles in `foundation/compute-plates-tensors` (sampled via `tileToCellIndex`) by extending `artifact:foundation.crustTiles` with the required driver fields (e.g. `baseElevation`, `buoyancy`).
  - [ ] Wire Morphology to consume the crust baseline as an input driver in `morphology/compute-base-topography` (passed through `morphology-pre/landmassPlates.ts`).
  - [ ] Add deterministic invariants tests for crust baseline and Morphology consumption; remove any legacy baseline path from the standard recipe.

## Acceptance Criteria
- `foundation/compute-crust` outputs mesh-indexed driver fields and derived `buoyancy`/`baseElevation` with correct lengths and deterministic results for a fixed `{ mesh, rngSeed, config }`.
- If a plate-coherence refinement op/step is used, it is deterministic for a fixed `{ mesh, crust, plateGraph, config }` and does not introduce any plate-owned “continent template” hard switches.
- `foundation/compute-plates-tensors` projects `crustTiles.baseElevation` (and any other required crust drivers) via `tileToCellIndex`, derived strictly from mesh truth (no tile-side recomputation/clamps).
- `morphology/compute-base-topography` consumes the crust baseline as an input driver:
  - With `upliftPotential=0` and `riftPotential=0`, the elevation field still contains a continent/ocean separation driven by `crustBaseElevation` (regression guard against “noise-only continents”).
- Quantitative sanity checks pass (deterministic, non-rendering):
  - Median `crustTiles.baseElevation` for continental tiles > median for oceanic tiles.
  - If oceanic age affects baseline: oceanic `crustTiles.baseElevation` monotonically trends downward across age quantiles (oldest quantile is deepest).
- Cutover complete: the standard recipe has a single coherent crust baseline path, and Morphology does not re-introduce a competing baseline computation.

## Testing / Verification
- Run: `bun run test` (or focused: `bun run --cwd mods/mod-swooper-maps test`).
- Extend/add deterministic invariants tests:

```yaml
tests:
  - mods/mod-swooper-maps/test/foundation/mesh-first-ops.test.ts
  - mods/mod-swooper-maps/test/foundation/tile-projection-materials.test.ts
  - mods/mod-swooper-maps/test/morphology/m11-substrate-material-driven.test.ts
  - mods/mod-swooper-maps/test/morphology/m11-geomorphology-stream-power-erosion.test.ts
```

## Dependencies / Notes
- Blocked by:
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U10-foundation-plate-partition-realism.md` (plate-coherence refinement depends on a stable `plateGraph`; run refinement as a post-partition step to avoid dependency cycles).
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U11-foundation-tectonic-segments-and-history.md` (avoids parallel edits to `compute-plates-tensors`/projection and keeps the belt-driver contract shape aligned).
- Related: `docs/projects/engine-refactor-v1/issues/M11-U00-physics-first-realism-upgrade-plan.md`, `docs/projects/engine-refactor-v1/issues/M11-U04-foundation-tile-material-drivers.md`
- Spike refs:
  - `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-realism-gaps.md` (Task D)
  - `docs/projects/engine-refactor-v1/resources/spike/foundation-realism/crust-load-bearing-prior.md`
- Intent helpers to reuse (do not treat as “output clamps”): `packages/mapgen-core/src/lib/plates/crust.ts`, `packages/mapgen-core/src/lib/heightfield/base.ts`
- Non-goals (this slice): segment/belt tectonics, polar plates, erosion history; this slice only makes crust/isostasy a real substrate prior and wires it into Morphology’s baseline.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Working set (files / tests / artifacts)
```yaml
files:
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/contract.ts
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/rules/** # if the crust coherence is split into local rules
  - mods/mod-swooper-maps/src/domain/foundation/ops/refine-crust-with-plate-coherence/** # optional follow-up op (post-partition)
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/contract.ts
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/index.ts
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/crust.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/plateGraph.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/tectonics.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts
  - mods/mod-swooper-maps/src/domain/morphology/ops/compute-base-topography/contract.ts
  - mods/mod-swooper-maps/src/domain/morphology/ops/compute-base-topography/strategies/default.ts
tests:
  - mods/mod-swooper-maps/test/foundation/mesh-first-ops.test.ts
  - mods/mod-swooper-maps/test/foundation/tile-projection-materials.test.ts
  - mods/mod-swooper-maps/test/morphology/m11-substrate-material-driven.test.ts
artifacts:
  - artifact:foundation.crust
  - artifact:foundation.crustTiles
docs:
  - docs/projects/engine-refactor-v1/resources/spike/foundation-realism/crust-load-bearing-prior.md
```

### Notes (non-sync)
- **Why mesh truth:** cratons/margins/shelves require sub-plate structure; plate-owned templates are too coarse and push the system toward “continent plates” as a hard switch.
- **Regularization posture:** treat `plateId` as a prior on coherence, not an ownership boundary:
  - inside-plate: penalize rapid oscillation / speckle in `type` + proxies
  - cross-plate: allow transitions, but bias toward structured margins (controlled by a margin width driver), not random noise
- **Baseline posture:** `baseElevation` is a pre-tectonic substrate (Airy-ish proxy). Morphology then adds tectonic/belt effects and runs sea-level solve; it should not need to invent continent/basin placement from scratch.

### Trace
- Branch: `agent-RAMBO-M11-U13-foundation-crust-load-bearing-prior`
- PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/711

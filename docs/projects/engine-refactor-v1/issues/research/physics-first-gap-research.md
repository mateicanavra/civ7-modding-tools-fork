# Physics-first gap research (Morphology + Foundation) — synthesis

This document is a committed synthesis of the (uncommitted) agent scratchpads that were produced to investigate the “physics-first” gap between:
- Phase 0.5 greenfield intent (`docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/v3/`)
- Phase 2 canon (the trilogy under `.../plans/morphology/spec/`)
- Phase 3 implementation reality (code in `mods/mod-swooper-maps/` + `packages/mapgen-core/`).

It is written as spec-grade input for the post-M10 remediation work.

## TL;DR
- **The architecture refactor (Phase 2/3) can be “correct” and still fail the physics-first intent** if upstream drivers are placeholders (Foundation crust) and if downstream projections (mountains/volcanoes) rely on deterministic noise to stand in for missing driver richness.
- The main concrete remediation path is:
  1) Upgrade Foundation to provide coherent, plate-anchored *driver fields* (crust/material, regime blends, deformation/strain/fracture, subsidence/age proxies, polar boundary conditions).
  2) Project the right subset of those drivers to tile resolution in a shared, canonical way.
  3) Make Morphology substrate and (optionally) orogeny/mountain projections consume those drivers so noise is micro-structure, not macro-shape.

## Authority / references (internal)
- Phase 0.5: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/v3/spike-morphology-greenfield-gpt.md`
- Phase 2 (authoritative for M10):  
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`  
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`  
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
- Pipeline + systems synthesis: `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`

## Foundation (drivers) — what to add/change

### Current state (code pointers)
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts`
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
- `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts`

### Problem statement
- `artifact:foundation.crust` exists but is effectively placeholder-grade (no coherent “history/material” signal).
- Phase 2 and “canonical” domain docs repeatedly imply Morphology substrate/erodibility should be materially driven, but the current driver quality is insufficient for that story.

### Recommended “Top 5” driver upgrades (minimum set)
1) **Polar boundary conditions** in tectonics: treat north/south edges as interactions with off-map “polar plates” and inject edge-band regime signals with a smooth taper.
2) **Coherent crust generation**: spatially coherent `crust.type` + `crust.age` anchored to plates (craton seeds + growth; passive margins; correlation to boundary regimes).
3) **Continuous regime blend fields**: `convergenceQ` / `extensionQ` / `shearQ` (and a unified `deformationRateQ`), instead of mutually-exclusive “boundary type” alone.
4) **Oceanic age / thermal subsidence proxy**: derive `oceanicAgeQ` (ridge-distance proxy) and a monotone `subsidencePotentialQ` to deepen old ocean basins deterministically.
5) **Crust thickness proxy**: `crustThicknessQ` as a coherent proxy derived from material + cumulative deformation history; used for buoyancy baseline and as an erodibility hint.

### Validation hooks (guardrails)
- Determinism test fixture (fixed seed → identical driver rasters).
- Coherence test (neighbor similarity above a minimum; rejects IID “salt & pepper”).
- “Sanity invariants” (e.g., oceanic age increases away from ridge proxies; subsidence is monotone in age).

## Orogeny / Mountains — removing “noise chooses mountains”

### Current state (inventory shape)
- Macro mountain placement today is mostly a Gameplay projection concern (Phase 2 models `plot-mountains` as stamping with `effect:map.mountainsPlotted`).
- The “physics-first” gap is about whether the projection is mostly derived from physics truth (tectonics + material + history) or from noise inputs.

### Recommended plan (spec-grade)
- Introduce an explicit physics-anchored mountain descriptor field:
  - `orogenyPotential01` (tile-indexed) derived primarily from regime blends + cumulative deformation.
  - Optional: `ridgeAxisMask` (tile mask) if we want explicit belt axes.
- Constrain deterministic noise policy:
  - Noise is **micro-structure only**, amplitude-gated by fracture/orogeny potential.
  - Noise must not create mountains where physics says “no”.

### Validation ideas
- Diagnostics: ridge/orogeny maps + simple “range coherence metrics”.
- Guardrail: mountains must be land-mask safe (never stamp mountains onto ocean/coast tiles).

## Volcanism — Phase 2 truth contract completion

### Current state (problem)
- Phase 2 expects `artifact:morphology.volcanoes` to be richer than “tile indices only”.
- If volcanism is later used by Ecology/Placement (fertility/hazards), the truth artifact must encode class + strength deterministically.

### Recommended truth contract (Phase 2 compliant)
- `artifact:morphology.volcanoes`:
  - `volcanoMask: Uint8Array` (tile-indexed)
  - `volcanoes: ReadonlyArray<{ tileIndex: number; kind: "subductionArc" | "rift" | "hotspot"; strength01: number }>`
  - Determinism: land-only vents; list sorted by `tileIndex`.

### Projection/stamping policy
- Phase 2 does not require `artifact:map.volcanoes`.
- If a debug/UI overlay is needed, prefer Gameplay-owned `artifact:map.volcanoesDebug` (explicitly non-Physics-consumable) + trace-only usage.

## Polar / Cryosphere — “polar addendum” vs “ice modeling”

### Key separation
- “Polar addendum” (Phase 0.5 / archived modeling addendum) is primarily about **tectonic boundary conditions at map edges**, not cryosphere.
- Cryosphere (snow/sea-ice/permafrost) is primarily Hydrology truth; Morphology only needs it if we do glacial carving or ice-driven substrate changes.

### MVP proposal (post-M10)
- Foundation/tectonics: add explicit polar boundary controls and coherent edge-band signals.
- Hydrology truth: standardize semantics for existing snow/ice/albedo buffers and consider extensions:
  - `groundIce01`, `permafrost01`, `meltPotential01`
- Morphology (optional): add a bounded glacial modifier/carving pass (fjords/U-valleys) gated by `groundIce01` persistence proxies.

## Civ7 pipeline constraints (engine hard stops)
- Elevation/cliffs are engine-derived:
  - `TerrainBuilder.buildElevation()` produces elevations/cliffs; no public per-tile setter.
  - Any logic that depends on actual cliffs must be Gameplay-owned and run after `effect:map.elevationBuilt`.
- Physics-first boundary is enforced in-repo:
  - Physics contracts must not consume `artifact:map.*` or `effect:map.*` (guarded by `mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts`).
  - `artifact:map.realized.*` is globally banned.
  - Effects must match `effect:map.<camelCase><Plotted|Built>`.

## External sources (web)

### Foundation / crust / subsidence (implementable proxies)
- Parsons & Sclater (1977): thermal subsidence vs oceanic age: https://topex.ucsd.edu/geodynamics/parsons_sclater77.pdf
- USGS Technical Letter 20 (Pakiser): crust thickness/isostasy context: https://pubs.usgs.gov/misc/tl/0020/tl0020.pdf
- USGS “This Dynamic Earth” (plate boundary behavior): https://pubs.usgs.gov/gip/dynamic/understanding.html

### Orogeny / uplift-driven terrain
- Cordonnier et al. (2016): uplift + erosion terrain generation: https://www.cs.purdue.edu/cgvlab/www/resources/papers/Cordonnier-Computer_Graphics_Forum-2016-Large_Scale_Terrain_Generation_from_Tectonic_Uplift_and_Fluvial_.pdf
- Galin et al. (2019): Procedural Tectonic Planets: https://perso.liris.cnrs.fr/eric.galin/Articles/2019-planets.pdf

### Volcanism
- USGS (volcanoes, plate boundaries, hotspots): https://pubs.usgs.gov/gip/volc/tectonics.html
- Viitanen (2012): plate-tectonics-based terrain generation: https://core.ac.uk/download/pdf/38053567.pdf

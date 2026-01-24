# Foundation Realism — Gaps & Remediation Spike (M11)

Purpose: capture an evidence-backed list of **realism gaps** in the current Foundation implementation (mesh → crust → plates → tectonics → projection) and propose a **physics-first remediation direction** that makes Foundation outputs feel geologically believable and *actually drive* Morphology.

References:
- Canonical domain causality: `docs/system/libs/mapgen/foundation.md`
- Domain layering: `docs/system/libs/mapgen/architecture.md`
- North-star (non-authoritative PRD, but high-signal): `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`
- M11 plan & earlier drift ledger: `docs/projects/engine-refactor-v1/issues/M11-U00-physics-first-realism-upgrade-plan.md`
- Domain modeling posture (ops/strategies/rules/steps): `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- Historical greenfield reference (Morphology, not canonical): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/v3/spike-morphology-greenfield-gpt.md`
- Historical polar addendum reference (Morphology, not canonical): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/v2/spike-morphology-modeling-gpt-addendum-polar.md`

Scope guardrails:
- This spike is **Foundation-first**. Morphology is discussed only at the *interface* (what Foundation publishes, what Morphology consumes).
- No “dual paths” / “shims”: a single coherent model is the target; migration should cut over cleanly.
- Deterministic noise is acceptable only as **bounded micro-structure**, never as the primary driver of landforms.
- Knobs should primarily be **inputs to algorithms** (physical drivers), not output fudges that force shapes post-hoc.

Deep dives (this spike set; area ownership):
- Plate partition realism: `foundation-realism/plate-partition-realism.md`
- Segment-based tectonics + tectonic history: `foundation-realism/tectonic-segments-and-history.md`
- Polar caps as plates: `foundation-realism/polar-caps-as-plates.md`
- Crust as load-bearing prior: `foundation-realism/crust-load-bearing-prior.md`
- Validation + observability: `foundation-realism/validation-and-observability.md`

---

## Executive summary

Today’s Foundation is still largely a **random-seeded Voronoi sketch**:
- Crust, plate partitioning, and kinematics are mostly independent.
- Plate shapes trend toward similar-sized blobs.
- Polar “plates” are a latitude override, not an emergent plate interaction.
- Several “physics truth” tensors exist but don’t meaningfully drive Morphology (or aren’t projected).

The outcome is “fake-feeling” maps: predictable plate mosaics, weak continent/craton identity, and boundary-driven landforms that read as tile-y belts rather than substrate evolution.

What this spike is *not*:
- It is not a “minimal change” plan. The posture is to make the algorithm *stronger* and more physics-derived, even if it requires reshaping ops/contracts.
- It is not a proposal to add more post-hoc noise knobs. The posture is to expose and tune physical **drivers** (inputs), then let outcomes emerge.

---

## Modeling posture (how we should talk about Foundation)

This spike follows the architecture in `SPEC-DOMAIN-MODELING-GUIDELINES.md`:

- **Ops** are stable, pure, testable contracts (`run(input, config) -> output`).
- **Strategies** are algorithmic variants of a single op (same I/O).
- **Rules** are tiny heuristics internal to an op (not exported as contracts).
- **Steps** orchestrate and publish artifacts (and are the effect boundary).

Foundation’s job is to publish **truth artifacts** (physics-owned) that downstream domains consume. It should not publish “map-facing” projections unless they are explicitly physics truth (tile-indexed tensors are OK; engine ids are not).

---

## North-star behaviors (what “realistic Foundation” must produce)

At a minimum, Foundation should produce a tectonic substrate whose *first-order* structure reads as geologic:

- **Plate size distribution**: a few large plates + a tail of smaller plates/microplates; not uniform Voronoi blobs.
- **Coherent kinematics**: motion fields that correlate with plate size/topology (including rotation) and generate varied boundary networks.
- **Load-bearing crust**: continents, cratons, and shelves that feel causally prior (buoyancy/isostasy baseline), not a weak mask.
- **Boundary segment physics**: tectonics computed on plate-contact segments (regime + polarity + intensity), not “scan neighbors for max dot”.
- **Emergent polar behavior**: polar caps are real plates (or boundary conditions) that participate in regimes; no latitude override; no one-tile belts.
- **History/age signals that matter**: uplift/fracture/age fields that actually drive downstream morphology (ridges, mountains, shelves, basins).
- **Non-wall orogeny**: mountain belts are spatially wide, segmented, and deformational (curves, arcs, gaps, foothills), not continuous single-tile (or few-tile) straight “walls”.

Design posture:
- Prefer “strong algorithms + good drivers” over “add more noise”.
- Prefer knobs that adjust *drivers* (e.g., plate buoyancy, viscosity proxies, stress coupling, diffusion rates) over knobs that clamp outputs (e.g., “make mountains taller”).

---

## Authority stack (for this spike)

**Canonical for current-state evidence (code):**
- Foundation ops:
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/index.ts`
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts`
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/index.ts`
- Foundation stage wiring:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/*.ts`
- Morphology consumer interface (for “what’s wired” checks):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
  - `mods/mod-swooper-maps/src/domain/morphology/ops/compute-base-topography/**`
  - `mods/mod-swooper-maps/src/domain/morphology/ops/compute-sea-level/**`
  - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-ridges-and-foothills/**`

**Existing but currently unwired “library intent” (high-signal):**
- `packages/mapgen-core/src/lib/plates/topology.ts` (plate adjacency + area graph from raster IDs)
- `packages/mapgen-core/src/lib/plates/crust.ts` (cluster-friendly crust typing at plate scale)
- `packages/mapgen-core/src/lib/heightfield/base.ts` (crust-driven baseline heightfield)

---

## Current system snapshot (what actually happens)

### 1) Mesh

- `foundation/compute-mesh` builds a Delaunay/Voronoi mesh with a derived `cellCount = plateCount * cellsPerPlate`.
  - Evidence: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/index.ts`
  - Practical impact: mesh resolution is effectively “plateCount-scaled”; if plateCount is high, mesh gets dense quickly.

### 2) Crust (material mask)

- `foundation/compute-crust`:
  - Builds a *very high* number of crust partitions: `platesCount = round(cellCount / 2)` (not the same as the plate graph).
  - Assigns mesh cells to nearest seed partition, then marks partitions continental by a random frontier walk until `continentalRatio` is reached.
  - Produces per-cell `crust.type` and `crust.age` where age is a distance-to-partition-boundary gradient with a per-partition bias.
  - Evidence: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts`

This creates some clustering, but the clustering is **not coupled to** actual plate partitioning or plate kinematics.

### 3) Plate graph (kinematic domains)

- `foundation/compute-plate-graph`:
  - Picks `plateCount` random mesh seed cells.
  - Assigns each cell to the nearest seed → Voronoi plate regions.
  - Assigns per-plate velocity/rotation randomly; `kind` is a count-based 60/40 major/minor tag.
  - Evidence: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`

Key behavior: plate region sizes are similar and boundaries look “regular” because it’s nearest-seed Voronoi.

### 4) Tectonics (boundary forces)

- `foundation/compute-tectonics`:
  - For each mesh cell, scans neighbors and finds strongest relative-motion boundary classification (convergent/divergent/transform) using a dot-product heuristic.
  - Rotation does not participate.
  - Crust type only affects volcanism via a constant boost when oceanic.
  - Polar behavior is injected as a latitude-band override (north/south), not derived from plate adjacency.
  - Evidence: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`

### 5) Projection (mesh → tiles)

- `foundation/compute-plates-tensors` projects:
  - `tileToCellIndex`
  - `crustTiles` (type/age sampled via tileToCellIndex)
  - `plates` tensors (boundaryCloseness, upliftPotential, riftPotential, volcanism, etc.)
  - Evidence: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/contract.ts`
  - Implementation: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`

Notable: `boundaryCloseness` is distance-propagated, but boundary **regime** (`boundaryType`) is intentionally narrow (a near-boundary band).

Architecture note:
- `project-plates.ts` is currently an op-internal helper (pure projection into tile-indexed truth tensors), which is consistent with the ops/steps posture.
- It should only become “shared core” if multiple domains genuinely need the same projection algorithm; otherwise keep it local and keep it pure (no step/runtime coupling).

### 6) Land vs ocean policy (where the shoreline actually comes from today)

Today, “land vs ocean” is not a Foundation decision. The current pipeline is effectively:

- Foundation emits plate tensors + crust mask + boundary signals.
- Morphology-pre computes a base heightfield and then solves for a sea level (targeting a water %) and turns that into a landmask.

This means:
- Foundation’s crust typing is not currently a load-bearing prior for hypsometry/isostasy.
- Plate boundary intensity produces tile-y belts when the downstream “heightfield + sea-level solve” does not interpret it as a broad deformation history.

---

## Gap ledger (why it feels fake)

### A) Plates are “too Voronoi” (uniform blob mosaic)

Symptom:
- Similar plate sizes, predictable boundaries, “map looks fake”.

Cause:
- Nearest-seed assignment in `compute-plate-graph` with no travel-cost weighting or area balancing.

Evidence:
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`

### B) Crust/material is not a plate-scale, load-bearing truth driver

Symptom:
- Continents/cratons do not feel like stable, causally prior substrate; passive margins are weak.

Cause:
- Crust is computed independently from plates, and downstream land formation is not strongly anchored to crust.

Evidence:
- Crust independent partitioning: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts`
- Morphology base topography ignores crust: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`

### C) “Major/minor” is a label, not a physical driver

Symptom:
- No sense of a few large plates plus smaller fragments/microplates.

Cause:
- `kind` is assigned by index fraction, not by plate area, lifetime, or stress regime.

Evidence:
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`

### D) Kinematics are random and not topology-aware

Symptom:
- Boundary networks repeat; collision arcs don’t “read” as subduction zones; motion looks arbitrary.

Cause:
- Plate velocity/rotation are random with no coupling to plate size, neighbors, or boundary normals; rotation is not used in tectonics.

Evidence:
- Kinematics assignment: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`
- Tectonics ignores rotation: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`

### E) Polar plates are not plates (latitude override → thin belts)

Symptom:
- Polar boundaries produce pathetic single-tile ranges; does not interact with plate system.

Cause:
- Polar boundary injection in `compute-tectonics` writes boundary regime by latitude band, not by plate adjacency; regime propagation is narrow during projection; morphology thresholds then gate out wide belts.

Evidence:
- Polar override: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
- Regime propagation narrowing: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`
  - Regime is explicitly gated to at most 2 tiles: `const regimeMaxDistance = Math.min(2, maxDistance - 1)`
- Morphology scoring expects boundaryStrength+regime: `mods/mod-swooper-maps/src/domain/morphology/ops/plan-ridges-and-foothills/rules/index.ts`

### F) “Truth signals exist but aren’t wired”

Symptom:
- We have plate motion tensors and mesh-level history fields, but they don’t shape terrain in a meaningful way.

Cause:
- Some fields are not projected (e.g., `fracture`, `cumulativeUplift`), and motion tensors (`movementU/V`, `rotation`) are not consumed downstream.

Evidence:
- Produced but not meaningfully consumed: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
- Unwired core helpers: `packages/mapgen-core/src/lib/plates/*`, `packages/mapgen-core/src/lib/heightfield/base.ts`

### G) Orogeny reads as “straight walls” (narrow belts + projection gating)

Symptom:
- Mountain chains devolve into straight, continuous “walls”.
- Hills/mountains appear as a thin band, not a deformation belt with foothills, segmentation, and curvature.

Likely cause (model-level):
- The system’s “tectonics → mountain belt” bridge is primarily a tile-indexed boundary band, not a segment/belt model with anisotropic propagation + history.
- Downstream morphology rules react to *local* strength thresholds, so any narrow or discontinuous projected band becomes a narrow or discontinuous range.

Evidence pointers:
- Tectonics is authored as tile scalar fields (not segment-first): `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
- Narrow regime propagation + local projection: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`
- Ridge planning consumes tile-local tensors: `mods/mod-swooper-maps/src/domain/morphology/ops/plan-ridges-and-foothills/**`

---

## Remediation direction (Foundation-first, physics-first)

This is the recommended “one coherent model” approach.

### 0) Contract posture: publish plate-contact physics, not just “distance to boundary”

If Foundation wants to drive Morphology in a physics-first way, the stable outputs should include segment/belt semantics (not only scalar fields):

- Boundary **regime** and **intensity** (already exists, but currently narrow and not robust).
- Boundary **polarity** (for subduction-style behavior: which side is overriding / which is subducting).
- **Shear vs compression vs extension** signals as first-class (not collapsed into a single “upliftPotential”).
- **History**: cumulative uplift/fracture/age signals intended to persist across erosive steps.

Tile-indexed truth is OK, but it should be grounded in an upstream segment model so it’s not “an arbitrary band”.

### 1) Make plate geometry non-Voronoi (variable size, topology-aware)

Replace nearest-seed assignment with a partitioning method that supports:
- A few large “major” plates + multiple minor plates (area-distributed, not count-labeled).
- Weighted travel cost / growth constraints:
  - resist splitting stable continental interiors
  - allow fragmentation/rifting where drivers exist
- Deterministic behavior (seeded).

### 2) Make crust plate-scale and load-bearing

Adopt a crust-first pipeline where crust typing is assigned at the **plate** level (topology-aware) and then projected to mesh/tile, instead of being a separate mesh partition unrelated to plates.

High-signal existing primitives:
- `buildPlateTopology(...)` in `packages/mapgen-core/src/lib/plates/topology.ts`
- `assignCrustTypes(...)` in `packages/mapgen-core/src/lib/plates/crust.ts`
- `buildCrustHeightfieldBaseline(...)` (or equivalent) in `packages/mapgen-core/src/lib/heightfield/base.ts`

### 3) Compute tectonics from boundary segments (not per-cell neighbor scans)

Compute regime and intensity on plate-contact segments:
- Determine boundary normals/tangents from geometry/topology.
- Incorporate relative motion including rotation.
- Apply crust pairing rules (ocean-ocean, ocean-continent, continent-continent) to derive subduction arcs, rifts, transforms, volcanism, fracture.

### 3.1) Make deformation belts a first-class output (not just “distance to boundary”)

If we want non-wall mountains and believable shelves/basins, Foundation should publish deformation as *belts* with spatial extent, not as a thin boundary line:
- Build segment-first regime/polarity/intensity.
- Then apply regime-specific, anisotropic propagation kernels to produce belt-scale fields (compression/extension/shear energy, cumulative uplift, fracture).
- Make belt width and falloff a driver input (a physics proxy), not a post-hoc blur.

### 4) Make polar behavior emergent (polar cap plates)

Remove latitude-band override. Introduce north/south polar plates:
- Plate graph guarantees polar caps exist.
- Config drives polar kinematics mode (convergent/divergent/transform) as plate motion fields, not direct force injection.
- Tectonics then derives polar regimes the same way as anywhere else.

### 5) Project and consume “history” signals

At minimum:
- Project mesh-level `fracture` and `cumulativeUplift` to tiles.
- Decide how Morphology uses them (e.g., fracture controls ruggedness/erosion susceptibility; cumulative uplift controls long-lived ranges/foothills).

---

## Proposed target model (ops, rules, artifacts)

This is intentionally “maximal realism posture”: prefer expressive truth outputs over minimal diffs.

### Proposed Foundation op catalog (draft)

These are ops (pure) — steps should orchestrate them, publish their outputs, and never hide heuristics inside step code.

- `compute-mesh` (compute): build regional mesh + tile sampling support.
- `compute-plate-partition` (compute): produce plate id per mesh cell using a non-Voronoi partition strategy (variable plate sizes).
  - Strategies: `weighted-growth` (default), `voronoi` (kept only as a test baseline, not as an author-facing default).
  - Rules: `pickPlateTargetAreas`, `growPlateFrontierStep`, `enforceMinPlateArea`, `enforcePolarCaps`.
- `compute-plate-topology` (compute): derive plate adjacency graph + boundary segments from raster IDs.
  - Candidate to wrap `packages/mapgen-core/src/lib/plates/topology.ts` so it becomes a first-class truth artifact.
- `compute-crust` (compute): assign crust type/thickness/age fields in a plate-coherent way (and publish what downstream needs).
  - Strategies: `plate-coherent` (default), `legacy-partitions` (temporary only for migration/testing; not a dual path in a recipe).
- `compute-plate-kinematics` (compute): assign velocity + rotation tensors in a topology-aware way (size-aware, neighbor-aware).
  - Rules: `pickPlateVelocity`, `pickPlateRotation`, `applyTorqueCoupling` (if modeled).
- `compute-tectonic-segments` (compute): compute segment-level regime/polarity/intensity from kinematics + crust pairing.
  - Outputs should be segment-first, then projected to tile tensors.
- `compute-foundation-tensors` (compute): project the segment physics and crust fields to tile-indexed truth tensors (what Morphology consumes).
  - NOTE: if projection helpers are needed outside this op, they belong in `packages/mapgen-core/src/lib/**` (shared projection posture).

### Proposed truth artifacts (draft)

The exact ids are TBD, but the conceptual inventory should exist:

- Mesh + sampling support: `artifact:foundation.mesh`
- Plate ids + topology: `artifact:foundation.plates` and/or `artifact:foundation.plateTopology`
- Crust: `artifact:foundation.crust` (type, age, thickness proxies)
- Tectonic segments: `artifact:foundation.tectonics` (segments with regime + polarity + intensity)
- Tile tensors consumed by Morphology: `artifact:foundation.foundationTensors` (tile-indexed)

### Foundation → Morphology interface (what Morphology should rely on)

Morphology should be able to treat Foundation as a causal prior:

- **Isostatic baseline drivers**: buoyancy/thickness proxies for continental vs oceanic crust; shelf tendencies.
- **Segment/belt drivers**: compressive/extensional/shear energy fields with smooth propagation (band widths are drivers, not post hoc blur).
- **History drivers**: uplift/fracture accumulation and age (used for ruggedness, erodibility, sediment supply).

If Morphology still needs to “make continents exist”, Foundation is not doing enough.

---

## Configuration posture (authors vs players)

We want two layers of control over the same underlying physics:

- **Player-style knobs**: a small set of high-leverage controls that intentionally co-tune multiple physical inputs together.
  - Example shape: `{ plateCount: "few"|"normal"|"many", plateActivity: "calm"|"normal"|"violent", worldAge: "young"|"mature"|"old" }`
- **Author/advanced config**: direct access to the physical driver inputs and strategy selection envelopes.
  - Example driver categories: partition target area distribution, viscosity proxies, torque coupling, polar cap policy, boundary diffusion/propagation kernels, time/era count.

Compile-first posture:
- Defaults and canonicalization belong in schemas and `normalize`, not runtime.
- Config descriptions should be mirrored into both schema docs and TypeScript/JSDoc (so “what the knob means” is unmissable at use sites).

Input-first posture (important):
- Prefer knobs that set **drivers** (plate buoyancy proxies, crust yield strength proxies, stress coupling, kernel widths, era counts).
- Avoid knobs that directly clamp **outcomes** (“mountainHeightMultiplier”, “forceWaterPercentHere”). If an outcome needs tuning, adjust the upstream driver that naturally produces it.

High-level knobs are still “real”:
- A player knob is allowed to be a *curated bundle* of multiple driver changes (e.g., `plateActivity:"violent"` increases velocity magnitude distribution, increases shear coupling, reduces stable-craton fragmentation resistance, and increases era count).
- The key requirement is that the bundle maps onto meaningful underlying drivers and never becomes a hidden output-fudge lane.

---

## Candidate slices (implementation-plan ready, but not yet committed here)

These are intentionally sequenced to “make Foundation feel real” quickly, while keeping migration reviewable.

1) **Foundational truth wiring (low risk):** project missing Foundation tensors (fracture + cumulative uplift) and add basic downstream consumption hooks.
2) **Crust becomes load-bearing:** migrate crust typing to plate-scale (topology-aware), remove independent crust partitioning.
3) **Plate partition realism:** introduce variable-size, weighted partitioning for plate regions; make “major/minor” area-driven.
4) **Boundary physics upgrade:** segment-based tectonics + crust pairing; incorporate rotation.
5) **Polar cap plates cutover:** remove polar override; add polar plates + kinematics config.

---

## Synthesis (agent findings → plan-ready direction)

This section captures the first-pass answers to the Exploration Tasks (A–E). It is intended to remove ambiguity and make the next document an implementation plan rather than a re-spike.

### A) Plate partition realism (non-Voronoi)

Behavioral goal:
- Heavy-tailed plate sizes (few large + tail of microplates), irregular/non-uniform boundaries, heterogeneous adjacency degree, deterministic outcomes.

Proposed op:
- `foundation/compute-plate-partition` (compute)
  - Strategy: `growth-frontier` (default): deterministic multi-source growth over the mesh neighbor graph with per-plate target area budgets and a driver-based growth cost model (no post-hoc size clamping).
  - Strategy: `basin-weighted` (alt): seed/grow plates using a low-frequency mantle/basin driver field to induce curved boundaries and microplate belts at basin interfaces.
  - Internal rules: target area sampling (lognormal/power-law), seed spacing (Poisson disk over graph), frontier expansion (priority queue with stable tie-breakers), orphan fill/merge.

Candidate driver knobs:
- Player: `plateCount`, `plateDiversity`, `plateFragmentation`.
- Author: `targetAreaMean`, `targetAreaSigma`, `seedSpacing`, `anisotropyStrength`, `driverFieldScale`, `polarCapFraction` (policy, not latitude override).

Evidence pointers:
- Current Voronoi partition + label-only major/minor: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`
- Existing topology helpers to wrap: `packages/mapgen-core/src/lib/plates/topology.ts`

### B) Segment-based tectonics + belts (anti-wall orogeny)

Behavioral goal:
- Compute tectonics on plate-contact segments (regime + polarity + intensity), then project belt-scale deformation drivers so Morphology produces non-wall mountain belts (wide, segmented, curved, foothills).

Proposed ops:
- `foundation/compute-tectonic-segments` (compute): extract plate-contact segments from mesh adjacency; compute regime/intensity from relative motion (including rotation) and crust pairing; assign polarity (overriding/subducting side).
- Optional `foundation/compute-tectonic-history` (compute): era loop to accumulate `cumulativeUplift`, `fracture`, `volcanism` with decay and along-belt variation.

Projection posture:
- Replace distance-gated regime propagation with anisotropic, regime-specific kernels oriented by segment tangent/normal.
- Publish belt drivers as first-class tile tensors: `compressionBelt`, `extensionBelt`, `shearBelt`, plus polarity (signed or masks), history fields, and optional belt axis orientation.

Evidence pointers:
- Neighbor-scan tectonics + polar injection: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
- Regime propagation capped to 2 tiles: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`
- Morphology ridge scoring consumes tile-local boundary strength + regime: `mods/mod-swooper-maps/src/domain/morphology/ops/plan-ridges-and-foothills/rules/index.ts`

### C) Polar caps as plates (no latitude override; 3 regimes)

Behavioral goal:
- Polar rims are tectonically alive and regime-flexible (convergent/divergent/transform), driven by polar plate kinematics, producing broad belts rather than one-tile artifacts.

Policy:
- Default: one polar plate per hemisphere occupying a cap fraction (e.g., 6–15% of Y-span), creating an interior polar boundary ring rather than edge-only hacks.
- Optional: microplates per pole (2–4) for variety without topology changes.

Kinematics modes (no injection):
- Convergent: polar plate motion equator-ward (normal inward).
- Divergent: polar plate motion pole-ward (normal outward).
- Transform: dominant azimuthal rotation (tangential shear).

Cutover requirements:
- Delete polar band injection in `foundation/compute-tectonics`.
- Ensure projection does not special-case polar edge seeding and does not cap regime propagation to 1–2 tiles.

Evidence pointers:
- Polar band injection: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
- Polar edge seeding + regime cap: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`
- Historical intuition only (not canonical): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/v2/spike-morphology-modeling-gpt-addendum-polar.md`

### D) Crust as load-bearing prior (isostasy baseline)

Behavioral goal:
- Continents and basins emerge from crust buoyancy/thickness/age; Morphology refines (tectonics + erosion) rather than inventing land.

Truth model (driver-first):
- Plate/mesh truth fields: `crust.type`, `crust.thickness` (proxy), `crust.age`, `crust.densityProxy`, `crust.strength` (proxy).
- Derived drivers: `crust.buoyancy` and `crust.baseElevation` (pre-tectonic baseline).
- Downstream use: Morphology base topography takes `crust.baseElevation` as baseline; sea-level solve uses `crust.type` and baseline hypsometry to produce shelves/margins without outcome clamps.

Evidence pointers:
- Landmass formation ignores crust baseline today: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
- Existing helper (unwired): `packages/mapgen-core/src/lib/heightfield/base.ts`
- Existing crust/topology helpers (unwired): `packages/mapgen-core/src/lib/plates/crust.ts`, `packages/mapgen-core/src/lib/plates/topology.ts`

### E) Validation + observability (realism dashboard)

Metrics (no rendering required):
- Plates: size distribution (Gini or P90/P50), adjacency degree distribution, polar participation.
- Crust/isostasy: continental share, shelf share, basin depth percentiles, oceanic age→depth correlation, margin width distribution.
- Belts/orogeny: belt width distribution, regime persistence across belt width, curvature/straightness scores, foothill gradients, segmentation counts.

Where it plugs in:
- Foundation projection step trace events: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts`
- Morphology landmass trace event (baseline correlation): `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
- Tests: replace polar override tests with emergent polar plate assertions; add deterministic partition + belt invariants.

---

## Required follow-ups (tracked as explicit work, not silent expectations)

- **Morphology JSDoc + inline documentation sweep**: everything in Morphology should be commented (especially the knobs and the “why” in ops/rules), and knob descriptions should be mirrored into JSDoc as part of the contract posture.
- **Config description mirroring**: for any new Foundation/Morphology knobs added by this milestone, ensure the schema `description` is mirrored into TypeScript types/JSDoc at the use-site (no “meaning lives only in JSON schema”).

## Open questions (to resolve before a final implementation plan)

Area-specific alternatives + recommendations live in `foundation-realism/README.md` (and linked docs).

### Modeling choices
- Should crust be “owned” per plate (plate-scale) or per mesh cell (with plate-scale coherence constraints)?
- How many “eras” do we actually want (0/2/3)? What should accumulate (uplift only vs uplift+fracture+volcanism)?
- Do we want any explicit **plate evolution** (fragmentation/rifting/microplate creation) across eras, or do we model “evolution” purely as accumulated deformation on a fixed partition?

### Contracts & artifacts
- Should plate topology be a first-class artifact (`artifact:foundation.plateTopology`) or remain an internal helper?
- Which tile-level tensors are part of the stable Foundation contract surface (beyond today’s `foundationPlates`)?

### Polar policy
- What does “polar transform boundary” mean in our model: tangential polar motion, or azimuthal shear between polar cap and subpolar plates?
- Do we need one polar plate per hemisphere, or multiple polar microplates for variety?

### Validation
- What are the “realism invariants” we can test without rendering (plate size distribution, boundary length distribution, continental clustering, etc.)?
- What “feel” metrics do we want to log as traces (ASCII summaries already exist for some tensors)?
- What metrics catch “mountain wall regressions” (range curvature distribution, belt width distribution, continuity-with-segmentation, foothill gradients)?

---

## Exploration tasks (agent-ready; three-pass discipline)

These are the immediate deep-dive tasks that unblock a confident implementation plan. Each task should be executed with three explicit passes:

1) **High level**: own the behavioral goal (what “realistic” means here; success criteria).
2) **Mid level**: propose a modeling approach in ops/strategies/rules/steps terms.
3) **Low level**: inspect current code/contracts and propose the concrete cutover diff.

### Task A: Plate partition realism (non-Voronoi, variable-size, deterministic)

Deep dive: `foundation-realism/plate-partition-realism.md`

Deliverable:
- High level: what “realistic plates” means for Civ7 (size distribution, plate adjacency feel, polar participation).
- Mid level: a `compute-plate-partition` op model (strategies + rules) and the config driver inventory (area distribution, growth cost model, polar caps, rifting resistance).
- Low level: concrete code hotspots + cutover diff (what to delete/replace), plus validation metrics and a migration plan that removes legacy Voronoi as the default.

### Task B: Segment-based tectonics (regime + polarity + intensity; rotation-aware)

Deep dive: `foundation-realism/tectonic-segments-and-history.md`

Deliverable:
- High level: what signals Morphology needs to get believable belts (compression/extension/shear, polarity, history).
- Mid level: a `compute-tectonic-segments` (and/or `compute-tectonic-history`) op model (segment representation, era loop posture, projection plan).
- Low level: concrete code hotspots + cutover diff; include rotation handling and regime-specific propagation kernels; list tile tensors needed by Morphology.

### Task C: Polar caps as plates (no latitude override; 3 regimes available)

Deep dive: `foundation-realism/polar-caps-as-plates.md`

Deliverable:
- High level: what “good polar tectonics” looks like (no one-tile belts; three regimes; believable rims/cryosphere hooks without latitude hacks).
- Mid level: polar-cap plate policy (one plate vs microplates) + how kinematics yields the three regimes without direct regime injection.
- Low level: concrete cutover plan removing latitude override, wiring polar plates through partition/topology/kinematics/segments, and how morphology consumes the resulting belt signals.

### Task D: Crust as load-bearing prior (buoyancy/isostasy + age history)

Deep dive: `foundation-realism/crust-load-bearing-prior.md`

Deliverable:
- High level: what crust must explain (continents vs basins, shelves, cratons, passive margins).
- Mid level: a crust truth model (types + thickness/age proxies) and how it drives an isostatic/buoyancy baseline heightfield.
- Low level: concrete cutover plan to plate-coherent crust typing and projection, and how Morphology’s base topography uses it as a true prior.

### Task E: Validation + observability (realism invariants + trace layers)

Deep dive: `foundation-realism/validation-and-observability.md`

Deliverable:
- High level: what we can measure without rendering that correlates with “feels real”.
- Mid level: a realism dashboard model (metrics + traces + thresholds) and where it plugs into the pipeline (tests vs debug traces).
- Low level: concrete implementation sites (existing trace plumbing, test harness), and “don’t regress to noise-first” guardrails.

---

## Next step (for follow-up work)

Turn the open questions above into focused exploration tasks (code + math + validation) and then produce an implementation plan with:
- contract changes (schemas + JSDoc mirrors where applicable)
- op/step decomposition changes
- tests + guardrails that prevent “noise-first” regression
- migration/cutover sequencing (no shims)

---

## Context snippet (for compaction / handoff)

Goal: expand this spike into an implementation-ready plan for “physics-first Foundation realism”.

Spike doc: `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-realism-gaps.md`

Key problems:
- Plates too Voronoi/uniform; major/minor is label-only.
- Crust not load-bearing; land/ocean baseline not anchored to buoyant crust.
- Kinematics random; rotation ignored; boundary signals narrow → tile-y belts.
- Polar is a latitude override; produces one-tile belts.
- “Truth signals” exist but aren’t projected/consumed (fracture, cumulative uplift, motion tensors).
- Mountains read as straight “walls” (thin bands + thresholding), not belts/foothills/segmentation.

Deliverable next:
- Resolve Open Questions via the Exploration Tasks (A–E), then publish a prioritized implementation plan (2–5 slices) with: new/updated op contracts + config knobs, cutover steps (no shims), and realism metrics/tests (including “no mountain walls”).

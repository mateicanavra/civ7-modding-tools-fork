# Spike: Foundation Realism — Open Questions (Alternatives + Recommendation)

Primary spike (do not edit): `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-realism-gaps.md`

Modeling posture (canonical): `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`

This document explores the spike’s **Open Questions** and proposes 2–3 plausible alternatives per question, with a physics-first recommendation that stays inside the locked constraints:

- Truth artifacts vs map projections boundary
  - Physics/Foundation publishes only `artifact:foundation.*` truth artifacts.
  - No Physics reads of `artifact:map.*` or `effect:map.*`.
- Compile-first normalization
  - Canonicalize knobs/config in `step.normalize` and/or `strategy.normalize` (compile-time), not at runtime.
- No shims / no dual paths
  - One cutover path; no “legacy + new” effect/artifact variants for the same guarantee.
- Topology invariant
  - Cylinder topology: `wrapX=true`, `wrapY=false` always (no config flags).
- Driver-knobs posture
  - Prefer **physics drivers** + consumer-side interpretation; avoid outcome clamps like “force X% mountains”.

This content is also “verticalized” into area-owned docs under `foundation-realism/`:
- Plate partition realism: `foundation-realism/plate-partition-realism.md` (Q4)
- Segment-based tectonics + history: `foundation-realism/tectonic-segments-and-history.md` (Q2, Q3, Q5)
- Polar caps as plates: `foundation-realism/polar-caps-as-plates.md` (Q6, Q7)
- Crust as load-bearing prior: `foundation-realism/crust-load-bearing-prior.md` (Q1)
- Validation + observability: `foundation-realism/validation-and-observability.md` (Q8, Q9, Q10)

## Evidence pointers (current code touchpoints)

These are the current “landing zones” implied by the spike; alternatives below reference them:

- Foundation artifacts: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
- Foundation stage pipeline: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts`
- Current ops (mesh/crust/plateGraph/tectonics/tiles projection):
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/*`
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/*`
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/*`
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/*` (contains polar edge injection today)
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/*` (tile projection; regime propagation capped today)
- Tile projection regime propagation cap / polar edge seeding:
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`
- Topology helper already wrapX-only: `packages/mapgen-core/src/lib/plates/topology.ts` (`buildPlateTopology`)
- Morphology currently consumes boundary regime + strength:
  - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-ridges-and-foothills/rules/index.ts`
- Existing tests in the relevant lane (Bun): `mods/mod-swooper-maps/test/foundation/*`

---

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

---

## Q2) Eras / tectonic history: 0 vs 2 vs 3? What accumulates?

Question: “How many ‘eras’ do we actually want (0/2/3)? What should accumulate (uplift only vs uplift+fracture+volcanism)?”

### Alternative A — Single-era (instantaneous) tectonics + light accumulation (today’s posture, slightly cleaned)
- Behavior
  - Tectonic fields represent “current stresses” only; downstream uses them directly.
  - “History” is limited to a single integrated field like `cumulativeUplift` (still effectively “same-era”).
- Modeling
  - Keep `foundation/compute-tectonics` as one-shot.
  - Keep `artifact:foundation.tectonics` as today (mesh-indexed) and (optionally) project `cumulativeUplift` to tiles as part of `foundation/compute-plates-tensors`.
- Implementation
  - Mostly local changes in:
    - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/*`
    - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`

### Alternative B — Two-era model (ancient + recent), accumulate uplift + fracture only
- Behavior
  - Produces “old mountain roots” vs “new active belts” signals:
    - ancient uplift drives long-lived ruggedness and drainage divides
    - recent uplift drives sharp relief and young ridges
  - Fracture accumulates to influence river routing and permeability proxies.
- Modeling
  - New op: `foundation/compute-tectonic-history` (or extend `compute-tectonics`) with an era loop:
    - Era 0: “ancient” deformation pass
    - Era 1: “recent” deformation pass
  - Artifacts:
    - `artifact:foundation.tectonicHistory` (mesh-indexed) containing per-era accumulators and a few derived summaries:
      - `upliftAccum[2]`, `fractureAccum[2]`
      - derived: `upliftTotal`, `fractureTotal`, `upliftRecentFraction`
    - Optionally project to tiles: `artifact:foundation.tectonicHistoryTiles` (or add a small subset to `foundationPlates`).
- Implementation
  - Add op module under `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonic-history/*`.
  - Add a step in the Foundation stage between `plateGraph` and `projection` (or replace `tectonics` step output):
    - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/tectonics.ts` becomes history step and publishes new artifact(s).
  - Update `compute-plates-tensors` input contract to consume the history artifact if tiles need era-aware fields.

### Alternative C — Three-era model (recommended focus): accumulate uplift + fracture + volcanism, plus “age of last activity”

This is the dedicated 3-era design that yields downstream signals for Morphology/Hydrology/Ecology.

- Behavior
  - Produces **time-separated** deformation and thermal signals:
    - Era 0 (Deep-time): sets broad crustal architecture (cratons, ancient orogens), long-lived fracture systems.
    - Era 1 (Mid-time): builds major belts/margins; creates many passive margins and rift basins.
    - Era 2 (Recent): sharpens active belts, volcanic arcs, and young rifts; provides “currently active” signals.
  - Downstream:
    - Morphology uses era-weighted uplift to generate belts + foothills with “old roots / young peaks”.
    - Hydrology uses fracture + rift basins to bias routing, lake basins, and groundwater/permeability proxies.
    - Ecology uses volcanism/ash/thermal proxies for fertility and biome edge texture (without hard clamps).
- Modeling
  - Op: `foundation/compute-tectonic-history` (compute), with strategies for era count and evolution style.
  - Rules inside the op:
    - `computeBoundaryKinematics` (rotation-aware relative motion → strain decomposition)
    - `accumulateDeformationByEra` (era loop; updates accumulators)
    - `deriveHistorySummaries` (e.g. `lastActiveEra`, `upliftWeightedAge`)
  - Artifacts (truth; mesh-indexed):
    - `artifact:foundation.tectonicHistory`:
      - `upliftAccumE0/E1/E2` (or a packed `[cellCount * 3]` tensor)
      - `fractureAccumE0/E1/E2`
      - `volcanismAccumE0/E1/E2`
      - `lastActiveEra` (0/1/2; or 255=never)
      - `upliftTotal`, `fractureTotal`, `volcanismTotal` (derived, not clamped)
    - Keep `artifact:foundation.tectonics` only if it remains a distinct “present-day boundary classification” surface; otherwise replace it with history-derived present fields.
  - Projection (tile-indexed truth):
    - Extend `foundation/compute-plates-tensors` (or add a sibling op) to project selected history summaries to tiles (e.g. `upliftTotal`, `upliftRecentFraction`, `fractureTotal`, `lastActiveEra`).
- Implementation
  - New op module under `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonic-history/*` and new artifact schema in:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
    - `packages/mapgen-core/src/core/types.ts` (new `FOUNDATION_TECTONIC_HISTORY_ARTIFACT_TAG`)
  - Replace or augment:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/tectonics.ts`
    - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/*` (potentially subsumed)
    - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/*` for tile projection.
  - Add tests asserting determinism + history meaning:
    - extend `mods/mod-swooper-maps/test/foundation/mesh-first-ops.test.ts` with history invariants (no clamp-driven “targets”).

### Recommendation

Choose **Alternative C (3-era tectonic history)**.

- It is the maximal “physics-first” choice that still respects the locked boundaries (history is truth; projections are derived; no Gameplay reads).
- It creates durable, non-clamp downstream signals without needing to “guess” mountains at Foundation time.
- It scales: if later a consumer only needs present-day tensors, it can read `*_Total` and/or `lastActiveEra` without adding new ops.

---

## Q3) Plate evolution across eras: fragmentation/rifting vs fixed partition?

Question: “Do we want any explicit plate evolution (fragmentation/rifting/microplate creation) across eras, or do we model ‘evolution’ purely as accumulated deformation on a fixed partition?”

### Alternative A — Fixed partition, history accumulates on a stable plate ID field
- Behavior
  - Plates are stable; deformation changes but plate IDs do not.
  - Rifts are signals, not topology changes; “microplates” are not created.
- Modeling
  - `foundation/compute-plate-graph` defines a single partition.
  - `foundation/compute-tectonic-history` accumulates deformation fields in place.
  - Consumers interpret rifts/extension as “incipient breakup” but not new plates.
- Implementation
  - Minimal surface area: mostly new history op + projection updates; no changes to plate partitioning beyond realism improvements.

### Alternative B — Evolution as plate lineage + limited rifting (microplate creation only at era boundaries)
- Behavior
  - At era boundaries, strong extension zones can “break” a plate into microplates, yielding more realistic segmentation and evolving boundaries.
  - Produces lineage: “this microplate came from plate X in era 1”.
- Modeling
  - Op: `foundation/compute-plate-partition` becomes era-aware and outputs:
    - `plateIdByCellByEra` (or per-era `plateGraph`)
    - `plateLineage` (parent/child mapping, split event metadata)
  - History op consumes the per-era partition and writes accumulators.
  - Artifacts:
    - `artifact:foundation.platePartitionHistory` (mesh-indexed per-era partition + lineage)
    - Derived `artifact:foundation.plateGraph` can remain “latest era only” if desired.
- Implementation
  - New op(s) and artifacts; significant caller updates:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts` ordering changes
    - `compute-plates-tensors` must pick which era’s plate IDs are projected (likely “latest”)
  - Consumers needing “plate identity” must decide whether to use latest-only or era-aware lineage (contract decision).

### Alternative C — Pseudo-evolution: stable plate IDs, but boundary segments migrate (stress-driven boundary drift)
- Behavior
  - Plate IDs stable, but the **active boundary belt** drifts within a buffer zone, producing evolving belts without explicit splits.
  - Captures “migration” feel while avoiding plate lineage complexity.
- Modeling
  - Keep partition fixed.
  - In history op, represent boundaries as **segments** with position/normal fields that can move per era.
  - Artifact: `artifact:foundation.tectonicSegments` (mesh-indexed or segment list) + per-era belt influence fields.
- Implementation
  - Add segment modeling in `compute-tectonic-history` and project segment influence to tiles; avoid changing plate IDs.

### Recommendation

Choose **Alternative C (pseudo-evolution via segment drift)** for the physics-first maximal v1.

- It captures “tectonic evolution” where it matters (belts, margins, rifts) without exploding contracts into lineage/multi-partition complexity.
- It avoids downstream identity churn (no need for consumers to understand plate lineage), fitting “no dual paths”.
- If later we decide to do true microplate creation, the segment model can become the transition surface (segments → splits) without re-architecting history.

---

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

---

## Q5) Tile-level tensors: what should be stable Foundation contract beyond `foundationPlates`?

Question: “Which tile-level tensors are part of the stable Foundation contract surface (beyond today’s `foundationPlates`)?“

### Alternative A — Keep `foundationPlates` minimal; add separate tile truth artifacts for additional drivers
- Behavior
  - `foundationPlates` stays “routing + belt proximity + plate motion” minimal and stable.
  - New drivers (fracture/history/strain) live in separate artifacts so consumers can opt-in.
- Modeling
  - Keep `artifact:foundation.plates` as-is (or minor extensions only).
  - Add:
    - `artifact:foundation.deformationTiles` (strain decomposition, fracture, shear directionality)
    - `artifact:foundation.historyTiles` (era summaries: uplift totals, lastActiveEra, etc.)
  - Projection op(s):
    - either extend `foundation/compute-plates-tensors` to output multiple artifacts, or
    - split into multiple ops to keep op sizing sane.
- Implementation
  - Add new artifacts in `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`.
  - Add new op modules under `mods/mod-swooper-maps/src/domain/foundation/ops/*`.
  - Update consumers to depend on new artifacts explicitly (no hidden reads).

### Alternative B — Expand `foundationPlates` into a “complete tile driver pack” (single tile artifact)
- Behavior
  - One tile artifact contains everything a downstream domain might need (including history summaries).
- Modeling
  - Add fields to `artifact:foundation.plates` such as:
    - `fracture`, `cumulativeUplift`, `upliftRecentFraction`, `lastActiveEra`
    - optional directionality fields (e.g. `compressionDirU/V`, `shearDirU/V`)
  - Consumers read from one surface; fewer artifact dependencies.
- Implementation
  - Schema expansion in `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`.
  - Update projection implementation: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`.
  - Higher coupling risk: any change touches a widely-consumed artifact.

### Alternative C — “Tile tensors are projections only”: keep tile surfaces narrow and treat mesh surfaces as the real contracts
- Behavior
  - Most consumers operate in mesh space and project themselves when needed.
- Modeling
  - Favor `artifact:foundation.tectonics` / `artifact:foundation.tectonicHistory` mesh-indexed truth as the primary contract.
  - Tile projection exists only for domains that are already tile-native.
- Implementation
  - Requires shared projection helpers and careful avoidance of re-implementing projection per domain.

### Recommendation

Choose **Alternative A (minimal `foundationPlates` + separate tile driver artifacts)**.

- It keeps contracts stable and modular (ops remain focused; avoids mega-artifact drift).
- It fits “truth vs projection” cleanly: mesh truth stays authoritative; tile artifacts remain explicit projections.
- It’s the maximal physics-first choice that still avoids “everything everywhere” coupling.

---

## Q6) Polar transform boundary semantics: tangential motion vs azimuthal shear?

Question: “What does ‘polar transform boundary’ mean in our model: tangential polar motion, or azimuthal shear between polar cap and subpolar plates?”

### Alternative A — Tangential polar plate motion (cap rotates, boundary is ring shear)
- Behavior
  - A polar cap plate has dominant angular velocity around the pole, causing a transform-dominant ring boundary.
  - Produces a broad shear belt with pull-apart basins and segmented ridges (downstream-friendly).
- Modeling
  - Plate kinematics policy lives in the partition/plate graph op strategy:
    - `polarCaps: { mode: "tangential", angularSpeed, capFraction }`
  - `foundation/compute-tectonic-history` (or tectonics op) decomposes strain into compression/extension/shear based on boundary normal vs relative motion.
- Implementation
  - Replace latitude injection:
    - Delete edge-band override in `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`.
  - Ensure plate graph includes polar plates with tangential velocities:
    - update `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/*` (or a new partition op).

### Alternative B — Azimuthal shear between cap and subpolar plates (relative-motion-derived; no special velocity)
- Behavior
  - Polar “transform” emerges when subpolar plates have opposing azimuthal components; the cap itself can be slow.
  - More emergent but less reliable for consistently “alive” polar rims.
- Modeling
  - No dedicated polar kinematics; rely on global plate motion field plus boundary geometry.
  - Polar transform is a classification outcome from relative motion, not a policy.
- Implementation
  - Similar injection removal in `compute-tectonics`, but with fewer changes in `compute-plate-graph`.

### Alternative C — Mixed transpression/transtension belt (shear + compression/extension coupling by latitude)
- Behavior
  - The polar ring alternates between transpressional and transtensional segments, producing more varied ridges/basins.
- Modeling
  - Still policy-free at the artifact boundary: expose strain decomposition fields; let downstream choose how to render “mixed belts”.
- Implementation
  - Requires computing and publishing directionality/strain components (see Q5/Q2).

### Recommendation

Choose **Alternative A (tangential polar plate motion)**.

- It yields a reliable, physics-plausible “polar rim is alive” baseline without latitude overrides, while still being a driver (motion), not an output clamp.
- It naturally produces ring shear belts that downstream domains can interpret into varied morphology/hydrology signals.

---

## Q7) Polar plates: one per hemisphere or multiple microplates?

Question: “Do we need one polar plate per hemisphere, or multiple polar microplates for variety?”

### Alternative A — One polar plate per hemisphere (simple, stable)
- Behavior
  - Clean ring boundary; easier to reason about; fewer seams.
- Modeling
  - Partition/plate graph strategy includes exactly two polar plates with configurable `capFraction`.
- Implementation
  - Implemented primarily in plate partition / plateGraph generation.

### Alternative B — 2–4 microplates per pole (variety, segmentation)
- Behavior
  - Polar boundary becomes segmented; avoids long, uniform belts; introduces micro-rifts and stepped arcs.
- Modeling
  - Partition strategy parameter: `polarMicroplatesPerHemisphere: 0 | 2 | 3 | 4`
  - Rules ensure microplates remain within the cap and do not create one-tile slivers (driver constraints, not output clamps).
- Implementation
  - Changes in plate partitioning:
    - seed multiple polar sites in mesh space in `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/*` or a new `compute-plate-partition`.
  - Validation tests for “no polar slivers” and minimum plate area.

### Alternative C — Conditional microplates: only when global plate count is high enough
- Behavior
  - Small maps remain stable (one cap plate), large maps get variety (microplates).
- Modeling
  - Compile-time normalization sets microplate count based on derived plate count and map size.
- Implementation
  - Implement in `step.normalize` (compile-time), consistent with compile-first posture.

### Recommendation

Choose **Alternative C (conditional microplates)**, with a default of “one per hemisphere” on small maps and “2–3 per pole” on larger maps.

- It’s maximal in outcome quality (variety) while still respecting constraints: this is a driver policy chosen at compile-time, not a runtime clamp.
- It avoids over-fragmenting small maps and reduces the risk of microplate slivers.

---

## Q8) Validation invariants: what can we test without rendering?

Question: “What are the ‘realism invariants’ we can test without rendering (plate size distribution, boundary length distribution, continental clustering, etc.)?”

### Alternative A — Statistical distribution invariants (range assertions)
- Behavior
  - Tests don’t care about exact shapes, only distributions.
- Modeling
  - Add a small “metrics ruleset” library (pure functions) that takes truth artifacts and returns summaries:
    - plate area distribution stats (Gini, P90/P50, min area fraction)
    - boundary length per regime distribution (counts/lengths)
    - continental clustering: adjacency-based clustering score in mesh or tiles
  - Tests assert ranges per preset/knob band, not exact numbers.
- Implementation
  - New metrics helpers in a neutral place (e.g. `packages/mapgen-core/src/lib/metrics/*` or domain-local if truly Foundation-specific).
  - Tests in `mods/mod-swooper-maps/test/foundation/*` call the ops directly (as existing tests do).

### Alternative B — Topological and geometric invariants (hard correctness properties)
- Behavior
  - Tests enforce “things that must never happen”:
    - no plate IDs outside range
    - no one-tile polar belt artifacts
    - regime propagation width > 2 tiles for major belts
    - wrap seam connectivity preserved
- Modeling
  - Model invariants as pure “checks” over artifacts (not steps).
- Implementation
  - Extend existing tests:
    - `mods/mod-swooper-maps/test/foundation/m11-projection-boundary-band.test.ts` (replace the 2-tile regime cap assumptions)
    - Add new tests using `buildPlateTopology` for plate adjacency constraints.

### Alternative C — Snapshot-based invariants (golden metrics per seed)
- Behavior
  - Lock in a small suite of seeds and record metric snapshots; diffs catch regressions.
- Modeling
  - Treat snapshots as a validation artifact of the repo (not runtime artifacts).
- Implementation
  - Add a “metrics snapshot” test file; keep snapshots small and numeric (not giant grids).

### Recommendation

Choose **A + B combined**:

- Use **hard invariants** for correctness/topology constraints (wrap, no slivers, determinism).
- Use **distribution invariants** for realism (plate sizes, belt widths), keeping thresholds wide and driver-oriented.

---

## Q9) “Feel” metrics: what do we log as traces?

Question: “What ‘feel’ metrics do we want to log as traces (ASCII summaries already exist for some tensors)?”

### Alternative A — ASCII grids for key drivers (today’s posture, expanded)
- Behavior
  - Developers can visually inspect belts/crust at a glance without rendering.
- Modeling
  - Trace events emitted by steps only (effect boundary posture), e.g.:
    - boundary regime (`foundation.plates.ascii.boundaryType` exists today)
    - uplift/fracture/volcanism bands (compressed into a few characters)
- Implementation
  - Expand `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts` trace set.
  - Keep sampling via `computeSampleStep` + `renderAsciiGrid` as in existing code.

### Alternative B — Numeric summaries/histograms (more stable than ASCII)
- Behavior
  - Logs are comparable across runs and can be pasted into issues without screenshots.
- Modeling
  - Emit trace payloads that contain:
    - histograms (binned counts) for key tensors
    - distribution stats (mean/std/percentiles)
    - a compact “plate topology summary” (if `artifact:foundation.plateTopology` exists)
- Implementation
  - Add a small metrics helper; emit trace events from steps.

### Alternative C — Publish “diagnostic truth artifacts” (consumable by tooling)
- Behavior
  - External tools (playground/docs) can consume diagnostics without parsing trace logs.
- Modeling
  - Introduce `artifact:foundation.diagnostics` truth artifact (pure data), distinct from trace logs.
- Implementation
  - Additional artifact/tag; more contract surface to maintain.

### Recommendation

Choose **Alternative A + B**:

- ASCII is best for quick belt sanity checks.
- Numeric summaries are best for regression diffing and automated “dashboard” style checks.
- Avoid a new diagnostics artifact unless/until a consumer needs it as a dependency (keep truth contracts lean).

---

## Q10) Metrics to catch “mountain wall” regressions

Question: “What metrics catch ‘mountain wall regressions’ (range curvature distribution, belt width distribution, continuity-with-segmentation, foothill gradients)?”

### Alternative A — Analyze Foundation belt drivers directly (pre-morphology predictors)
- Behavior
  - Detects when inputs are likely to produce walls: overly straight, thin, high-intensity belts with low segmentation.
- Modeling
  - Compute metrics from tile drivers:
    - belt width distribution derived from `boundaryCloseness` / strain fields
    - “straightness” proxy: orientation coherence of high belt strength regions
    - segmentation counts: number of connected components above thresholds
- Implementation
  - Metrics helper over `artifact:foundation.plates` (+ any new deformation/history tiles).
  - Tests live in `mods/mod-swooper-maps/test/foundation/*`.

### Alternative B — Analyze Morphology truth outputs (post-morphology, pre-stamping)
- Behavior
  - Measures the actual mountain/hill masks and gradients that read as walls in-game.
- Modeling
  - Compute on morphology truth artifacts (e.g., ridge plans / orogeny truth) rather than on stamped `artifact:map.*`.
  - Metrics:
    - ridge curvature/length distribution
    - foothill gradient around ridge cores (mountain→hill→flat transition)
    - continuity-with-segmentation: long connected “walls” vs broken chains
- Implementation
  - Use existing morphology ops/tests patterns:
    - `mods/mod-swooper-maps/test/morphology/*`
  - Keep Physics boundary intact by not requiring any `effect:map.*`.

### Alternative C — Joint metric: correlation of belts → mountains (pipeline health check)
- Behavior
  - Ensures morphology remains anchored to physics drivers (no “noise-first” drift).
- Modeling
  - Compute correlation/MI-like scores between:
    - belt strength fields (Foundation) and ridge/mountain masks (Morphology)
- Implementation
  - Integration test that runs both stages in a minimal pipeline and computes the score; place near `mods/mod-swooper-maps/test/standard-run.test.ts` or a dedicated morphology+foundation test.

### Recommendation

Choose **Alternative B + C**:

- “Mountain wall regressions” are ultimately an output-feel issue; measure them on **morphology truth outputs**, not engine-stamped surfaces.
- Add the belt→mountain correlation as a guardrail that preserves the driver-first posture across refactors.

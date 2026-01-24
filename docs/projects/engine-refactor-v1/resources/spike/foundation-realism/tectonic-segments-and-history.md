# Foundation Realism (M11) — Segment-based tectonics + tectonic history

Primary spike: `../spike-foundation-realism-gaps.md`

This doc deep-dives the “segment-based tectonics + history” area (regime + polarity + intensity, rotation-aware, multi-era accumulation), including the open questions and recommended physics-first direction.

## Scope (this area only)

- Replace “neighbor scan + capped propagation” tectonics with **segment-based boundary physics** (relative motion decomposed into compression/extension/shear, plus polarity).
- Add a **tectonic history** posture (multi-era accumulation) whose outputs become durable drivers for Morphology/Hydrology/Ecology.
- Define the stable contract surface for downstream consumption (mesh truth vs tile projections).

Relevant current code touchpoints:
- Present-day tectonics (contains polar injection today):
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
- Tile projection (regime propagation capped today):
  - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`

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


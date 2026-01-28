---
id: LOCAL-TBD-M11-U11
title: "[M11/U11] Replace tile-y tectonics with segment-based tectonics + 3-era tectonic history"
state: planned
priority: 1
estimate: 16
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [foundation, tectonics, realism, contracts]
parent: LOCAL-TBD-M11-U15
children: []
blocked_by: [LOCAL-TBD-M11-U10]
blocked: []
related_to: [M11-U00, M11-U04, M11-U06, LOCAL-TBD-M11-U12, LOCAL-TBD-M11-U14]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace per-tile neighbor-scan tectonics with segment-based boundary physics plus a 3-era tectonic history that publishes belt-scale drivers (uplift + fracture + volcanism + `lastActiveEra`) intended to causally drive downstream landforms (belts, not walls).
- **In scope:** segment-first regime/intensity/polarity, pseudo-evolution via segment drift (stable plate ids), 3-era history accumulation, new mesh-truth + tile-projection artifacts, and a clean cutover (no shims / no dual paths).
- **Out of scope:** changing plate partitioning/kinematics beyond required contracts (owned by U10), true plate lineage/microplate creation, and building the full observability dashboard (owned elsewhere).

## Deliverables
- Shared slice invariants: see `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U15-foundation-realism-execution-spine.md` (`FND-INV-*`).
- **Issue-specific invariants (U11-owned)**
  - Segment-first tectonics: regime/intensity/polarity is computed on **plate-contact boundary segments** (geometry + kinematics + crust pairing), never “scan neighbors for max dot”.
  - History-first outputs: downstream drivers come from a **multi-era tectonic history**; any “present-day” fields are derived from the history model (no parallel truth lanes).
  - Stable identity: plates keep stable IDs across eras; “evolution” is expressed as **segment/belt drift within buffers**, not plate lineage in v1.
  - Contract modularity: keep `artifact:foundation.plates` stable/minimal; publish additional driver packs as explicit tile artifacts (no “mega-artifact” stuffing).
  - Single-path cutover: delete legacy neighbor-scan tectonics + polar injection + projection caps (no legacy fallback in recipes).

### Layer 1 — High level (what it must achieve)
- Belts not walls: publish belt-scale deformation drivers (width, falloff, curvature/segmentation) that support foothills and gaps instead of thin, continuous bands.
- History drives downstream: publish uplift/fracture/volcanism history and “age of last activity” (`lastActiveEra`) intended for Morphology/Hydrology/Ecology consumption.
- Rotation-aware boundary physics: incorporate plate rotation into relative motion; classify compression/extension/shear with polarity on convergent margins.
- Emergent poles: remove latitude-band polar override; polar regimes are derived via the same segment model (polar caps handled upstream by plate topology/kinematics).

### Layer 2 — Mid level (ops/strategies/rules/steps + artifact boundaries)
- Add/replace ops with the modeling posture: ops are pure, strategies are variants, rules are internal, and steps publish artifacts (no step-hidden heuristics).
- Segment model (truth):
  - `foundation/compute-tectonic-segments` (compute): consume `mesh` (adjacency), `plateGraph` (cellToPlate + kinematics), and `crust` (pairing/roles); output a segment list (or mesh-edge representation) with regime + intensity decomposition (compression/extension/shear) + polarity + volcanism potential.
    - Note: `artifact:foundation.plateTopology` (tile-derived) is a diagnostics/validation surface, not a substitute for mesh-space boundary geometry.
  - `foundation/compute-tectonic-history` (compute): 3-era loop that (a) optionally drifts segments within buffers (“pseudo-evolution”), (b) projects segment physics into belt-scale mesh fields via regime-specific, anisotropic kernels oriented by segment normal/tangent, and (c) accumulates uplift/fracture/volcanism per era and derives summaries (`*_Total`, `upliftRecentFraction`, `lastActiveEra`).
- Driver knobs (author-facing, input-first): add a small set of configuration inputs for the model’s drivers (e.g. era weights, kernel widths/falloffs, segment drift strength, and intensity→uplift/fracture/volcanism coupling) with realism-by-default defaults; avoid output clamps (no “make mountains taller” multipliers here).
- Artifact boundaries (contract posture):
  - Mesh truth artifacts are authoritative (`artifact:foundation.tectonicSegments`, `artifact:foundation.tectonicHistory`).
  - Tile driver artifacts are projections only (e.g. `artifact:foundation.deformationTiles`, `artifact:foundation.historyTiles`) and must be explicitly depended on by consumers.
  - Keep `artifact:foundation.plates` / `foundationPlates` stable/minimal; do not “stuff” history into it as a mega-artifact.

### Layer 3 — Low level (implementation diff shape + cutover)
- Concrete file/artifact list lives in `## Implementation Details (Local Only)` (keep SYNC section focused on outcomes and invariants).

## Acceptance Criteria
- Segment-based boundary physics exists end-to-end: segment truth artifacts are produced and the tile-level belts are projections of those segments (not distance-to-boundary + capped propagation).
- 3-era history is produced with the required summaries:
  - uplift + fracture + volcanism accumulated per era,
  - derived totals (and `upliftRecentFraction` or equivalent),
  - `lastActiveEra` is populated (0/1/2 or sentinel for “never active”).
- “Thin belt” failure mode is removed:
  - legacy regime propagation cap is deleted from `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`,
  - belts have spatial extent beyond the immediate boundary line (not a hard-coded 1–2 tile band).
- No dual paths remain in recipes: `foundation/compute-tectonics` is removed/unused and polar latitude-band injection is not present anywhere in the tectonics pipeline.
- Contracts match posture:
  - `foundationPlates` remains minimal (no new history stuffing),
  - new drivers are exposed via explicit artifacts (`*Tiles`), with consumers updated to read those drivers intentionally.

## Testing / Verification
- `bun run test` (includes `bun run --cwd packages/mapgen-core test` and `bun run --cwd mods/mod-swooper-maps test`).
- Add deterministic fixture tests (small synthetic mesh/plates) that assert:
  - segment kinematics decomposition is rotation-aware (compression/extension/shear change when rotation changes),
  - polarity assignment is stable and consistent for convergent margins,
  - belt projection produces a multi-tile-width band (regression guard against “cap-to-2” style narrowing),
  - 3-era accumulation and `lastActiveEra` summaries are deterministic for a fixed seed/config.
- Add one “real map” smoke verification (fixed seed) that dumps/visualizes projected belt/history tensors and checks they correlate with expected landform planning signals (wide belts, not walls).

## Dependencies / Notes
- **Blocked by:** `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U10-foundation-plate-partition-realism.md` (needs the non-Voronoi partition + stable plate IDs; `artifact:foundation.plateTopology` is used for validation, but mesh-space segments are derived from `mesh` + `plateGraph`).
- **Related:** `docs/projects/engine-refactor-v1/issues/M11-U04-foundation-tile-material-drivers.md`, `docs/projects/engine-refactor-v1/issues/M11-U06-orogeny-mountains-physics-anchored.md`.
- **Evidence pointer (today’s “thin belt” / wall tendency):** regime propagation is capped/narrow in `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts`; tectonics is also tile-scalar authored in `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`.
- **Primary spike references:** `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-realism-gaps.md`, `docs/projects/engine-refactor-v1/resources/spike/foundation-realism/tectonic-segments-and-history.md`.
- **Cross-domain coupling (explicit coordination required):**
  - Morphology consumers currently read `artifact:foundation.plates` (e.g. `boundaryType`, `boundaryCloseness`, `upliftPotential`, `riftPotential`); if U11 introduces `artifact:foundation.deformationTiles`/`artifact:foundation.historyTiles`, decide whether to (A) keep compatibility fields in `foundationPlates` for M11, or (B) migrate Morphology to the new tile artifacts as part of this issue.
- **Risks to call out in review:**
  - Performance: segment → belt projection kernels can become expensive; keep kernels bounded and test runtime on a standard map size.
  - Tuning surface: prefer a small set of driver knobs (kernel widths, era weights, segment drift strength) over output clamps.
  - Contract creep: keep truth/projection boundaries crisp; avoid turning `foundationPlates` into a mega-bucket.
- Verification (this slice):
  - `bun run --cwd mods/mod-swooper-maps test` ✅
- Traceability:
  - Branch: `agent-RAMBO-M11-U11-foundation-tectonic-segments-and-history`
  - PR: https://app.graphite.com/github/pr/mateicanavra/civ7-modding-tools-fork/709

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
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonic-segments/**
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonic-history/**
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/**
  - mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/** # deleted/replaced (neighbor-scan + polar injection)
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/tectonics.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts
  - mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts
  - packages/mapgen-core/src/core/types.ts
tests:
  - mods/mod-swooper-maps/test/foundation/m11-projection-boundary-band.test.ts
  - mods/mod-swooper-maps/test/foundation/m11-polar-boundary-tectonics.test.ts
  - mods/mod-swooper-maps/test/foundation/m11-polar-boundary-projection.test.ts
  - mods/mod-swooper-maps/test/morphology/m11-mountains-physics-anchored.test.ts
artifacts:
  - artifact:foundation.tectonicSegments
  - artifact:foundation.tectonicHistory
  - artifact:foundation.deformationTiles
  - artifact:foundation.historyTiles
  - artifact:foundation.plates # kept minimal/compatible
```

---
id: M10-U05
title: "[M10/U05] Truth artifact cleanup + map projection artifacts + deletion sweep"
state: planned
priority: 3
estimate: 0
project: engine-refactor-v1
milestone: M10
assignees: []
labels: [morphology, placement, refactor]
parent: null
children: []
blocked_by: [M10-U06]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Align Morphology truth artifacts to Phase 2, add required map projection artifacts, and complete the deletion sweep with full guardrails.

## Deliverables
- Morphology truth artifacts match Phase 2 schemas (no engine IDs).
- `artifact:map.projectionMeta` and `artifact:map.landmassRegionSlotByTile` exist with `effect:map.landmassRegionsPlotted`.
- Placement consumes `artifact:map.landmassRegionSlotByTile` only.
- Pipeline contract guard expanded for full map-stamping posture.
- Final deletion sweep removes legacy `artifact:heightfield` as a cross-domain contract input.

## Acceptance Criteria
- Morphology truth artifacts match Phase 2 schemas (required fields + invariants; no engine terrain IDs).
- `artifact:map.projectionMeta` exists with fixed `wrapX=true`, `wrapY=false` values (not authored knobs).
- `artifact:map.landmassRegionSlotByTile` exists and Placement consumes it (no slot computation in placement apply).
- No legacy `artifact:heightfield` remains as a cross-domain contract input (Hydrology does not read it).
- Full-profile guardrails pass for `morphology` and the pipeline contract guard enforces map-stamping posture.

## Testing / Verification
- `REFRACTOR_DOMAINS="morphology,hydrology,placement" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `REFRACTOR_DOMAINS="morphology" DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `rg -n "artifact:map\\.realized\\." mods/mod-swooper-maps/src packages/mapgen-core/src`
- `bun run --cwd mods/mod-swooper-maps test -- test/pipeline/map-stamping.contract-guard.test.ts`

## Dependencies / Notes
- Blocked by [M10-U06](./M10-U06-tracing-observability-hardening.md).
- Final Phase 5 gate includes a ruthlessness pass; see Implementation Details.
- Out of scope for U05: “physics-first driver richness” upgrades (Foundation crust coherence, material-driven substrate). Track in `docs/projects/engine-refactor-v1/issues/M11-U00-physics-first-realism-upgrade-plan.md`.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Scope
- Align Morphology truth artifacts to Phase 2 contract shapes (no model changes):
  - `artifact:morphology.topography` (remove engine IDs; add required fields like `seaLevel`, `bathymetry` with locked units).
  - `artifact:morphology.coastlineMetrics` (e.g., `distanceToCoast`).
  - `artifact:morphology.landmasses` (e.g., `coastlineLength`, ordering/tie-breakers explicit).
  - `artifact:morphology.volcanoes` (land-only intent list + `strength01` posture).
- Implement required Gameplay-owned map projection surfaces:
  - `artifact:map.projectionMeta` (fixed wrap values; not knobs).
  - `artifact:map.landmassRegionSlotByTile`.
- Add `plot-landmass-regions` under Placement:
  - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/plot-landmass-regions/contract.ts`
  - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/plot-landmass-regions/index.ts`
  - provides `effect:map.landmassRegionsPlotted`.
- Wire Placement to consume `artifact:map.landmassRegionSlotByTile`:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`

### Cleanup sweep (M10 scope)
- Ensure `rg -n "artifact:map\\.realized\\." mods/mod-swooper-maps/src packages/mapgen-core/src` remains empty.
- Ensure no `syncHeightfield` backfeeds engine state into Physics truth.
- Delete legacy `artifact:heightfield` (or isolate to Gameplay-only runtime state):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts` (`id: "artifact:heightfield"`).

### Guardrails (final expansion)
- Expand pipeline-level contract guard:
  - `mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts`
    - ban `artifact:map.realized.*`
    - enforce `effect:map.*` naming posture
    - enforce `buildElevation/getElevation/isCliffCrossing` allowlist + gating
- Keep full-profile guardrail script enabled:
  - `REFRACTOR_DOMAINS="morphology" DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full ./scripts/lint/lint-domain-refactor-guardrails.sh`

### Global matrices (reference for sequencing)
#### Consumer inventory + migration matrix
| Consumer (today) | Today depends on | Slice 1 | Slice 2 | Slice 3 | Slice 4 | Slice 5 |
|---|---|---:|---:|---:|---:|---:|
| `morphology-mid/rugged-coasts` | `artifact:storyOverlays` | Break | No-op | No-op | Break (stamping removed) | No-op |
| `morphology-post/islands` | `artifact:storyOverlays` | Break | No-op | No-op | Break (stamping removed / move earlier if needed) | No-op |
| `morphology-post/volcanoes` | `artifact:storyOverlays` | Break | No-op | No-op | Break (stamping removed) | No-op |
| `hydrology-climate-baseline/climate-baseline` | legacy `artifact:heightfield` reads + `buildElevation()` + engine sync/read + `stampContinents()` + `adapter.getLatitude` | No-op | No-op | No-op | Break | No-op |
| `hydrology-climate-baseline/lakes` | adapter lake modeling + `syncHeightfield` backfeed | No-op | No-op | No-op | Break | No-op |
| `hydrology-hydrography/rivers` | requires `artifact:morphology.routing` | No-op | No-op | No-op | Break | No-op |
| `ecology/features` | `artifact:storyOverlays` (bias overlays) | No-op | Break | No-op | Break | No-op |
| `narrative-pre/*` + `narrative-mid/*` | produces/consumes overlays | No-op | Break (delete) | No-op | No-op | No-op |
| `placement/placement` | stamps LandmassRegionId (no `artifact:map.*`) | No-op | No-op | No-op | No-op | Break |

#### Removal ledger (legacy surfaces removed in-slice)
| Legacy surface to remove | Why | Slice |
|---|---|---:|
| Overlay reads (`readOverlay*`) under Morphology steps | Overlay backfeeding ban | 1 |
| Overlay-derived inputs in Morphology ops | Overlays removed in M10 | 1 |
| `artifact:storyOverlays` in any step contract | Overlays removed in M10 | 2 |
| `narrative-pre` + `narrative-mid` stages in standard recipe | Overlays removed in M10 | 2 |
| Adapter calls in `morphology-pre/landmassPlates.ts` | Boundary lock | 3 |
| Adapter-coupled tracing/logging helpers in Morphology Physics steps | Boundary lock | 3 |
| Adapter calls + sync in `morphology-pre/coastlines.ts` | Boundary lock | 3 |
| `artifact:morphology.coastlinesExpanded` | Boundary lock | 3 |
| Engine terrain ids in Morphology truth (`artifact:morphology.topography.terrain`) | Truth-only artifact lock | 3 |
| `buildElevation()` + `stampContinents()` in Hydrology climate baseline | TerrainBuilder no-drift | 4 |
| Adapter lake/river modeling + `syncHeightfield` backfeed in Hydrology steps | Boundary lock | 4 |
| Hydrology truth steps relying on legacy `artifact:heightfield` reads | Phase 2 input lock | 4 |
| Physics-stage `adapter.getLatitude(...)` usage | Boundary lock | 4 |
| `writeHeightfield` in Morphology mid/post steps | Boundary lock | 4 |
| Adapter fractal calls in Morphology steps | Boundary lock | 4 |
| Cross-domain use of `artifact:morphology.routing` | Phase 2 contract lock | 4 |
| Missing Phase 2 map projection surfaces | Phase 2 stamping contract | 5 |

### Phase 5 gate (ruthlessness + traceability)
- No Phase 2 model changes; Phase 2 trilogy remains authority.
- No dual-path compute or compat shims; delete in-slice.
- No hidden multipliers/constants/defaults in touched ops/steps.
- No placeholders/dead bags in touched scopes.

### Verification commands (full list)
```bash
REFRACTOR_DOMAINS="<slice-domains>" ./scripts/lint/lint-domain-refactor-guardrails.sh
rg -n "artifact:storyOverlays|narrativePreArtifacts\\.overlays|readOverlay|overlays\\.js" mods/mod-swooper-maps/src
rg -n "artifact:map\\.realized\\." mods/mod-swooper-maps/src packages/mapgen-core/src
rg -n "artifact:heightfield|hydrologyClimateBaselineArtifacts\\.heightfield|deps\\.artifacts\\.heightfield\\.read" mods/mod-swooper-maps/src
rg -n "adapter\\.getLatitude\\(" mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-* mods/mod-swooper-maps/src/recipes/standard/stages/ecology
rg -n "syncHeightfield\\(" mods/mod-swooper-maps/src packages/mapgen-core/src
rg -n "adapter\\.(createFractal|getFractalHeight)\\(" mods/mod-swooper-maps/src
rg -n "logLandmassAscii\\(|logReliefAscii\\(|logFoundationAscii\\(|logMountainSummary\\(|logVolcanoSummary\\(" mods/mod-swooper-maps/src/recipes/standard/stages/morphology-*

bun run --cwd packages/mapgen-core check
bun run --cwd packages/mapgen-core test
bun run --cwd packages/mapgen-core build

bun run --cwd mods/mod-swooper-maps check
bun run --cwd mods/mod-swooper-maps test
bun run --cwd mods/mod-swooper-maps build

bun run deploy:mods
bun run check
bun run test
bun run build
```

### Files
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts
    notes: Final Phase 2 topography truth shape (no engine IDs)
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/plot-landmass-regions/contract.ts
    notes: New Placement projection contract
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/plot-landmass-regions/index.ts
    notes: New Placement projection implementation
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts
    notes: Consume `artifact:map.landmassRegionSlotByTile` only
  - path: mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts
    notes: Expanded pipeline guard coverage
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

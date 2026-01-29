---
id: M10-U03
title: "[M10/U03] Introduce map-morphology stamping + re-home coasts/continents/effects"
state: planned
priority: 3
estimate: 0
project: engine-refactor-v1
milestone: M10
assignees: []
labels: [morphology, gameplay, refactor]
parent: null
children: []
blocked_by: [M10-U02]
blocked: [M10-U04]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Add `map-morphology` Gameplay stamping and move coastline/continent engine work out of Morphology Physics steps.

## Deliverables
- Morphology-pre steps are truth-only (no adapter writes).
- `map-morphology` stage exists with `plot-coasts` and `plot-continents` steps providing `effect:map.*` guarantees.
- `effect:map.*` tags defined centrally in the recipe tag catalog.
- Pipeline contract guard prevents Physics steps from requiring `artifact:map.*` / `effect:map.*`.

## Acceptance Criteria
- `morphology-pre/*` steps contain zero adapter calls and emit truth-based trace events.
- `morphology-pre/coastlines` step is deleted and removed from the stage.
- `artifact:morphology.topography.terrain` and `artifact:morphology.coastlinesExpanded` are deleted.
- `map-morphology` provides `effect:map.coastsPlotted` and `effect:map.continentsPlotted`.
- Pipeline guard blocks Physics step contracts from requiring `artifact:map.*` or `effect:map.*`.

## Testing / Verification
- `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `rg -n "artifact:map\\.realized\\." mods/mod-swooper-maps/src packages/mapgen-core/src`
- `bun run --cwd mods/mod-swooper-maps test -- test/pipeline/map-stamping.contract-guard.test.ts`

## Dependencies / Notes
- Blocked by [M10-U02](./M10-U02-delete-overlay-system.md).
- Blocks [M10-U04](./M10-U04-gameplay-stamping-cutover.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Scope
- Convert Morphology-pre steps to truth-only:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
    - Remove `writeHeightfield(...)` and all `context.adapter.*` calls.
    - Remove adapter-coupled tracing helpers (e.g. `logLandmassAscii`).
- Delete the engine-coupled coastline-expansion step:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.contract.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts` (remove `coastlines`)
- Remove engine-coupled truth fields and engine-expansion markers:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`
    - delete `topography.terrain`
    - delete `artifact:morphology.coastlinesExpanded`

### New Gameplay stamping stage (map-morphology)
- Stage root: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/index.ts`
- Steps (phase: "gameplay"):
  - `plot-continents`
    - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotContinents.contract.ts`
    - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotContinents.ts`
    - Provides `effect:map.continentsPlotted`
  - `plot-coasts`
    - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotCoasts.contract.ts`
    - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotCoasts.ts`
    - Provides `effect:map.coastsPlotted`

### Adapter ordering + no-drift assertions
- `plot-coasts`:
  - Call `adapter.expandCoasts(width,height)`.
  - Immediately assert **no land/water drift** against Morphology truth landMask:
    - `landMask[i] === 1` implies `adapter.isWater(x,y) === false`.
    - `landMask[i] === 0` implies `adapter.isWater(x,y) === true`.
  - Any mismatch is a hard error; no shims or dual paths.
  - Any runtime sync is Gameplay-owned only; never mutate Morphology truth.
- `plot-continents`:
  - Call `adapter.validateAndFixTerrain()` → `adapter.recalculateAreas()` → `adapter.stampContinents()`.
  - Assert **no land/water drift** against Morphology truth landMask.
  - `stampContinents()` is not a truth source for `artifact:morphology.landmasses` or `artifact:map.*`.

### Recipe ordering (interim for pipeline-green)
- Interim order:
  - `foundation → morphology-pre → morphology-mid → morphology-post → map-morphology → hydrology-* → ecology → placement`
- Slice 4 must move `map-morphology` to the final post-Physics position.

### Tag definitions
- Centralize in `mods/mod-swooper-maps/src/recipes/standard/tags.ts`:
  - `M10_EFFECT_TAGS.map`:
    - `coastsPlotted: "effect:map.coastsPlotted"`
    - `continentsPlotted: "effect:map.continentsPlotted"`
    - `elevationBuilt: "effect:map.elevationBuilt"`
    - `mountainsPlotted: "effect:map.mountainsPlotted"`
    - `volcanoesPlotted: "effect:map.volcanoesPlotted"`
    - `landmassRegionsPlotted: "effect:map.landmassRegionsPlotted"`

### Guardrails (slice-local)
- Pipeline contract guard:
  - `mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts`
  - Assert Physics contracts do not `require` any `effect:map.*` or `artifact:map.*`.
  - Ban `artifact:map.realized.*` globally.
- Effect naming regex:
  - Enforce `^effect:map\\.[a-z][a-zA-Z0-9]*(Plotted|Built)$`.

### Dedicated tracing work item
- Implement Morphology truth-based traces and `map-morphology` engine-surface dumps.
- Coordinate with [M10-U06](./M10-U06-tracing-observability-hardening.md).

### Files
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts
    notes: Remove adapter calls + adapter-coupled debug; write truth-only buffers
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts
    notes: Deleted (engine expansion moved to Gameplay)
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts
    notes: Remove `coastlines` from step list
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts
    notes: Delete `topography.terrain` and `artifact:morphology.coastlinesExpanded`
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/index.ts
    notes: New Gameplay stamping stage (plot-coasts, plot-continents)
  - path: mods/mod-swooper-maps/src/recipes/standard/tags.ts
    notes: Define `effect:map.*` tags in one place; add owners
  - path: mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts
    notes: New pipeline contract guard seeded here
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

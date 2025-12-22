# Prework — `LOCAL-TBD-M4-ENGINE-BOUNDARY-CLEANUP` (Engine-global dependency surface inventory)

Goal: enumerate every remaining engine-global dependency surface (`GameplayMap`, `GameInfo`, `PlotTags`, `LandmassRegion`) and define the intended replacement so cleanup is mechanical and failures are explicit.

## 1) Inventory (where engine globals are used today)

### A) `GameplayMap` fallbacks (implicit engine reads)

| File | Global usage | Dependency role | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/domain/narrative/utils/dims.ts` | `GameplayMap.getGridWidth()/getGridHeight()` when `ctx` absent | Dimensions source | Should require `ctx.dimensions` in the target path; fallback hides missing context. |
| `packages/mapgen-core/src/domain/narrative/utils/water.ts` | `GameplayMap.isWater(x,y)` when `ctx` absent | Water queries | Should be adapter-only; fallback hides missing adapter/context. |
| `packages/mapgen-core/src/domain/narrative/orogeny/wind.ts` | `GameplayMap.getPlotLatitude(x,y)` fallback | Latitude queries | Should be adapter-only; fallback hides missing adapter/context. |
| `packages/mapgen-core/src/dev/introspection.ts` | reads `globalAny.GameplayMap` | Dev-only introspection | Acceptable if fenced as dev tooling; should not be part of default correctness paths. |

### B) Module-load `GameInfo` lookups (implicit global dependency)

| File | Global usage | Dependency role | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/core/terrain-constants.ts` | `GameInfo.Terrains/Biomes/Features.*` at module load (with hard-coded fallbacks) | Mapping type-name → numeric indices | This is a correctness dependency surface; should move behind the adapter (or explicit initialization) so mapgen-core never reads `GameInfo` directly. |

### C) `PlotTags` / `LandmassRegion` globals (engine enum values)

| File | Global usage | Dependency role | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/core/plot-tags.ts` | `typeof PlotTags !== "undefined"` with fallback constants | plot tag enum values used for start placement compatibility | Should be moved behind adapter-provided constants; fallback should be test-only (and explicit). |
| `packages/mapgen-core/src/core/plot-tags.ts` | `typeof LandmassRegion !== "undefined"` with fallback constants | landmass region enum values used by StartPositioner | Same: move behind adapter. |

## 2) Proposed replacements (global → explicit surface)

### `GameplayMap` fallbacks

Replacement strategy:
- Require `ExtendedMapContext` for narrative utilities in the target path.
- Replace “ctx optional + fallback to GameplayMap” with:
  - `ctx` required, or
  - explicit parameters (`width/height`, `isWater` function) passed from callers.

This makes failures explicit: missing context/adapter should throw rather than silently reading globals.

### `GameInfo` module-load lookups

Replacement strategy (preferred):
- Move type-name → index lookups behind the adapter boundary:
  - Add missing index lookup surfaces to `EngineAdapter` (e.g., `getTerrainTypeIndex(name)`), similar to existing `getBiomeGlobal`/`getFeatureTypeIndex`.
  - Cache resolved indices per-run on the context or adapter instance (not as module-level globals).
- Update `terrain-constants.ts` to either:
  - become adapter-backed query helpers (take `adapter`), or
  - be removed in favor of adapter-owned constants/lookups.

Goal: mapgen-core should not touch `GameInfo.*` directly in the default path.

### `PlotTags` / `LandmassRegion` enum values

Replacement strategy:
- Extend `EngineAdapter` to expose the engine enum values explicitly (or expose a small “engine constants” bag):
  - `adapter.plotTags.{ NONE, LANDMASS, WATER, EAST_LANDMASS, WEST_LANDMASS, ... }`
  - `adapter.landmassRegion.{ NONE, WEST, EAST, ... }`
- `core/plot-tags.ts` becomes pure logic over adapter surfaces:
  - no `typeof PlotTags` / `typeof LandmassRegion` checks
  - no silent fallback except in MockAdapter/test fixtures

## 3) Tests / docs likely to update

Tests that currently mock globals (should be revisited once globals are removed/fenced):
- `packages/mapgen-core/test/setup.ts` (defines `globalThis.GameplayMap`/`globalThis.GameInfo`)
- Orchestrator tests that set globals per-test:
  - `packages/mapgen-core/test/orchestrator/foundation.smoke.test.ts`
  - `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts`
  - `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts`
  - `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts`
  - `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts`
  - `packages/mapgen-core/test/smoke.test.ts`

Docs/policy touchpoints:
- `docs/system/libs/mapgen/architecture.md` (engine boundary policy; ensure it reflects “no engine globals” in default path)
- `docs/projects/engine-refactor-v1/deferrals.md` (if any deferrals reference the legacy global surfaces)


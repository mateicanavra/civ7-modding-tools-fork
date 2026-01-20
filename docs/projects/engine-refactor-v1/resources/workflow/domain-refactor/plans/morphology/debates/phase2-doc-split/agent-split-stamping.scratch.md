# Scratchpad — Agent Split 3 (Map projections & stamping)

Current state (keep this to one message; overwrite as needed):

## Map projection + stamping surfaces I’m defining (Phase 2)

### `artifact:map.*` (Gameplay-owned, projection intent; publish-once/frozen per pass)

- `artifact:map.landmassRegionSlotByTile`
  - Tile-indexed raster (`Int8Array`/`Uint8Array` semantics) mapping each tile to a **slot** in `{ none, west, east }`.
  - The slot is adapter-agnostic; stamping translates slots → engine constants via `adapter.getLandmassId("<NAME>")`.
- `artifact:map.landmassRegionIdByTile` (optional convenience, derived from slots)
  - Tile-indexed raster of **engine region ids** derived from `landmassRegionSlotByTile` + adapter lookups. If included, it is still Gameplay-owned derived-only (never truth).
- `artifact:map.projectionMeta`
  - Basic metadata for projections that downstream steps can read without importing physics (e.g., `width`, `height`, `wrapX=true`, `wrapY=false`, and any “pass freeze” identifier if we already have one elsewhere).

Notes:
- I’m treating `artifact:map.*` as the canonical projection interface, but I’m not trying to “re-home” every existing stamped field in the codebase into `map.*` in this pass; the spec will define what’s required for Phase 2 consumers and what is explicitly out-of-scope until Phase 3 migration.

### `effect:map.*Plotted` (Gameplay-owned; boolean execution guarantees)

- `effect:map.landmassRegionsPlotted` — after `TerrainBuilder.setLandmassRegionId(...)` has been applied for all tiles.
- `effect:map.coastsPlotted` — after `expandCoasts(width,height)` has been invoked and the engine terrain/landmask has been re-synced into runtime buffers.
- `effect:map.continentsPlotted` — after `TerrainBuilder.stampContinents()` (and any required `AreaBuilder.recalculateAreas()` ordering) has completed.
- `effect:map.elevationPlotted` — after `TerrainBuilder.buildElevation()` has completed (and any required recalc ordering).
- `effect:map.biomesPlotted` — after biomes have been applied (either via per-tile `setBiomeType` or via `designateBiomes`).
- `effect:map.featuresPlotted` — after features have been applied (either per-tile `setFeatureType` or via `addFeatures`).
- `effect:map.riversPlotted` — after `TerrainBuilder.modelRivers(...)` + `defineNamedRivers()` (and any required validation/sync) has completed.
- `effect:map.waterDataPlotted` — after `TerrainBuilder.storeWaterData()` has completed.

## Truth fields I need Agent Split 2 to lock (inputs to projection/stamping)

- `artifact:morphology.landmasses`
  - Must include `landmasses[]` with stable `id` and cylindrical bbox `{ west, east, south, north }` semantics (wrapX interval) plus `landmassIdByTile: Int32Array`.
  - Projection rule needs a contract for “center X on wrapped interval” (existing implementation: `computeWrappedIntervalCenter` in `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`).
- `artifact:morphology.topography` (or equivalent frozen heightfield snapshot)
  - Needed to gate “none” region for water tiles (don’t tag sea tiles as west/east).
- Volcano representation (truth)
  - If volcanoes are stamped as features, I need a truth artifact that provides a deterministic set of vents (tile indices) that does not rely on overlays.
- `artifact:foundation.plates` is Phase 2-canonical (Foundation-owned derived view). Projection/stamping steps may consume it as physics context, but must not duplicate it under `artifact:map.*` by default.
  - If any projection/stamping logic needs “Foundation context”, it should come from canonical mesh-first Foundation truth (to be locked in `PHASE-2-CONTRACTS.md`) or from Morphology truth outputs.
  - If tile-space “boundary signals” are needed, model them as derived inside Morphology/Gameplay ops (from mesh-first truths and/or Morphology truths), not as a published Foundation tile-raster artifact.

## Evidence pointers already collected (for Phase 2 doc)

- Engine surface + helpers:
  - `packages/civ7-types/index.d.ts` (TerrainBuilder/AreaBuilder APIs; LandmassRegion constants; `/base-standard/maps/*` modules)
  - `packages/civ7-adapter/src/civ7-adapter.ts` (adapter methods and the Civ7 postprocess functions exposed: `expandCoasts`, `stampContinents`, `buildElevation`, `modelRivers`, `defineNamedRivers`, `storeWaterData`, `validateAndFixTerrain`, `recalculateAreas`, etc.)
- Current repo behavior (ordering/examples to model, not to treat as Phase-2-canonical topology):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts` (LandmassRegionId stamping; ordering w/ resources & starts)
  - `mods/mod-swooper-maps/test/placement/landmass-region-id-projection.test.ts` (expects projection before resources and starts; uses adapter constants WEST/EAST/NONE)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts` (`expandCoasts` then sync heightfield landmask/terrain)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts` (`validateAndFixTerrain` → `recalculateAreas` → `stampContinents`)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts` (`recalculateAreas` → `buildElevation` → `recalculateAreas` → `stampContinents`)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts` (`modelRivers` → `validateAndFixTerrain` → sync → `defineNamedRivers`)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts` (per-tile `setBiomeType`)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts` (apply features → `validateAndFixTerrain` → `recalculateAreas`)

## Open questions for orchestrator (overlap/dependency checks)

- Confirm whether Phase 2 wants `artifact:map.landmassRegionIdByTile` (engine ids) in addition to the adapter-agnostic `artifact:map.landmassRegionSlotByTile`, or whether slot-only is preferred and ids are strictly ephemeral at stamping time.
- Confirm whether “coasts/continents/elevation/rivers/waterData” should be modeled as `effect:map.*Plotted` guarantees (as above) or whether Phase 2 wants to scope effects to only “things downstream explicitly needs for Placement”.

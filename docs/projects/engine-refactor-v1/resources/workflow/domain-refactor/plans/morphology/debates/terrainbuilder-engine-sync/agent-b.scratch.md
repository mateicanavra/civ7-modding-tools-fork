# Agent B scratchpad: TerrainBuilder / engine sync (repo call paths)

Scope: current repo integration points with Civ7 engine APIs (`TerrainBuilder`, `AreaBuilder`, `GameplayMap`, etc.) and how they affect terrain/feature stamping + “physics truth”.

## Interim: quick breadcrumb list (engine phases + readbacks)

TerrainBuilder phases invoked by our pipeline (via `context.adapter.*`):
- `validateAndFixTerrain()` → `TerrainBuilder.validateAndFixTerrain()`:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts:151`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts:212`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts:89`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts:35`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts:62`
- `stampContinents()` → `TerrainBuilder.stampContinents()`:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts:153`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:333`
- `buildElevation()` → `TerrainBuilder.buildElevation()`:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:331`
- `modelRivers()` / `defineNamedRivers()`:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts:210`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts:215`
- `storeWaterData()` → `TerrainBuilder.storeWaterData()`:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts:83`
- `recalculateAreas()` → `AreaBuilder.recalculateAreas()`:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts:152`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:330`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:332`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts:91`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts:37`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts:73`

Engine → buffer readbacks that “canonicalize” our in-memory state to engine surface:
- `syncHeightfield()` overwrites `buffers.heightfield` from engine `getTerrainType/getElevation/isWater` (`packages/mapgen-core/src/core/types.ts:421`):
  - after `generateLakes`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/lakes.ts:80`
  - after `buildElevation`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:335`
  - after `modelRivers`+`validate`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts:214`
  - after features+`validate`: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts:90`
  - after features+`validate`: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts:36`
- Manual terrain/water readback (not `syncHeightfield`): after `expandCoasts` in `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts:12`
- Feature readback before planning: `buildFeatureKeyField()` scans engine `getFeatureType()` for every tile to seed Ecology feature placement inputs (`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/inputs.ts:42`).
- Narrative still probes engine directly (bypasses artifacts/buffers): e.g. `adapter.getElevation/getRainfall/isWater` in `mods/mod-swooper-maps/src/domain/narrative/corridors/land-corridors.ts:57`.

## Breadcrumbs / stage order

Standard recipe stage order (authoring):
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts:22` → `foundation` → `morphology-pre` → `narrative-pre` → `morphology-mid` → `narrative-mid` → `morphology-post` → `hydrology-climate-baseline` → `hydrology-hydrography` → `hydrology-climate-refine` → `ecology` → `placement`

Key idea observed in code: we “stamp” terrain/features into engine early/often, then periodically “sync back” engine state into our mutable buffers (notably `buffers.heightfield`) via explicit readbacks after engine-side transforms.

## Q1) Where do we call `TerrainBuilder` today (and which methods)?

### Direct `TerrainBuilder.*` call sites (TypeScript sources)
Only in the production adapter:
- `packages/civ7-adapter/src/civ7-adapter.ts:187` `TerrainBuilder.setTerrainType(x,y,terrainType)`
- `packages/civ7-adapter/src/civ7-adapter.ts:191` `TerrainBuilder.setRainfall(x,y,rainfall)`
- `packages/civ7-adapter/src/civ7-adapter.ts:195` `TerrainBuilder.setLandmassRegionId(x,y,regionId)`
- `packages/civ7-adapter/src/civ7-adapter.ts:203` `TerrainBuilder.addPlotTag(x,y,plotTag)`
- `packages/civ7-adapter/src/civ7-adapter.ts:207` `TerrainBuilder.setPlotTag(x,y,plotTag)`
- `packages/civ7-adapter/src/civ7-adapter.ts:239` `TerrainBuilder.setFeatureType(x,y,featureData)`
- `packages/civ7-adapter/src/civ7-adapter.ts:244` `TerrainBuilder.canHaveFeature(x,y,featureType)`
- `packages/civ7-adapter/src/civ7-adapter.ts:293` `TerrainBuilder.getRandomNumber(max,label)`
- `packages/civ7-adapter/src/civ7-adapter.ts:303` `TerrainBuilder.validateAndFixTerrain()`
- `packages/civ7-adapter/src/civ7-adapter.ts:325` `TerrainBuilder.stampContinents()`
- `packages/civ7-adapter/src/civ7-adapter.ts:329` `TerrainBuilder.buildElevation()`
- `packages/civ7-adapter/src/civ7-adapter.ts:333` `TerrainBuilder.modelRivers(minLen,maxLen,navigableTerrain)`
- `packages/civ7-adapter/src/civ7-adapter.ts:337` `TerrainBuilder.defineNamedRivers()`
- `packages/civ7-adapter/src/civ7-adapter.ts:341` `TerrainBuilder.storeWaterData()`
- `packages/civ7-adapter/src/civ7-adapter.ts:377` `TerrainBuilder.setBiomeType(x,y,biomeId)`
- `packages/civ7-adapter/src/civ7-adapter.ts:493` optional `TerrainBuilder.addFloodplains(min,max)` (guarded)

### Engine-calling adapters invoked by pipeline (indirect TerrainBuilder usage)
These are the “real” call sites from recipe steps (via `context.adapter.*` → adapter → `TerrainBuilder.*` above):
- `setTerrainType`: indirectly via `writeHeightfield()` → `ctx.adapter.setTerrainType(...)` in `packages/mapgen-core/src/core/types.ts:301`
- `setRainfall`: indirectly via `writeClimateField()` → `ctx.adapter.setRainfall(...)` in `packages/mapgen-core/src/core/types.ts:337`
- `setLandmassRegionId`: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts:237`
- `setFeatureType`: e.g. volcanoes `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts:87`, ecology features `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/apply.ts:31`
- `validateAndFixTerrain`: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts:151`, `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts:212`, `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts:89`, `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts:35`, `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts:62`
- `stampContinents`: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts:153`, `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:333`
- `buildElevation`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:331`
- `modelRivers` / `defineNamedRivers`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts:210`, `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts:215`
- `storeWaterData`: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts:83`
- `expandCoasts` (base-standard module, not TerrainBuilder): `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts:10`
- `generateLakes` (base-standard module, not TerrainBuilder): `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/lakes.ts:79`

### Generated artifacts (not authoritative sources)
The built mod JS bundles include direct `TerrainBuilder.*` call sites (e.g. `mods/mod-swooper-maps/mod/maps/swooper-earthlike.js:710` etc.). Treat these as generated output mirrors of TS sources.

## Q2) Stage/step order: when we stamp and when we run TerrainBuilder phases

### Morphology-pre
1) `landmassPlates` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts:7`)
   - stamps base terrain via `writeHeightfield()` → `setTerrainType()` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts:149`)
   - then runs engine postprocess:
     - `validateAndFixTerrain()` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts:151`)
     - `AreaBuilder.recalculateAreas()` via adapter (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts:152`)
     - `stampContinents()` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts:153`)
2) `coastlines`
   - runs engine coastline expansion (`expandCoasts`) and then reads back `getTerrainType()` + `isWater()` into `buffers.heightfield` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts:10`)

### Morphology-mid/post
- Multiple steps stamp terrain types (mountain/hill/coast/ocean/flat) via `writeHeightfield()` (examples: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts:61`, `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts:149`) and place volcano features (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts:87`).
- No additional `validateAndFixTerrain()`/`recalculateAreas()`/`stampContinents()` are run in these steps (as of current scan).

### Hydrology-climate-baseline
1) `lakes`
   - runs engine lake generator (`generateLakes`), then `syncHeightfield()` (engine → buffers) (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/lakes.ts:79`)
2) `climateBaseline`
   - `recalculateAreas()` → `buildElevation()` → `recalculateAreas()` → `stampContinents()` (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:330`)
   - then `syncHeightfield()` (engine → buffers) (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:335`)

### Hydrology-hydrography
- `rivers`
  - `modelRivers()` → `validateAndFixTerrain()` → `syncHeightfield()` → `defineNamedRivers()` (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts:210`)

### Ecology
- `biomes`: stamps engine biome types via `setBiomeType()` (`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts:62`)
- `features` / `features-apply`:
  - stamps engine feature types via `setFeatureType()`, then `validateAndFixTerrain()` → `syncHeightfield()` → `recalculateAreas()` (`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts:89`, `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts:35`)

### Placement
- `applyPlacementPlan` runs `validateAndFixTerrain()` → `recalculateAreas()` → `storeWaterData()` early in the apply (`mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts:62`)
- then stamps `LandmassRegionId` from morphology landmass snapshot just before start assignment (`mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts:237`)

Elevation built once or multiple times?
- In TS pipeline: `buildElevation()` is called once (in `hydrology-climate-baseline`), based on current scan (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:331`).

## Q3) Do we read back engine map state after builder runs? Who consumes it?

### Explicit engine → buffer sync (high impact)
- `syncHeightfield()` reads `adapter.getTerrainType()`, `adapter.getElevation()`, `adapter.isWater()` and overwrites `buffers.heightfield` (`packages/mapgen-core/src/core/types.ts:421`).
- Callers (production pipeline):
  - after `generateLakes`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/lakes.ts:80`
  - after `buildElevation`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:335`
  - after `modelRivers`+`validate`: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts:214`
  - after feature stamping+`validate`: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts:90`
  - after feature stamping+`validate`: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts:36`

Consumers:
- Hydrology baseline uses the post-`buildElevation` synced `buffers.heightfield` to derive water masks and drive climate computations (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:343`).
- Downstream Ecology (biomes/features) reads heightfield from artifacts/buffers (which were synced from engine at the above points), so it is effectively consuming engine-realized terrain/elevation.

### Manual engine → buffer refresh (terrain only)
- After `expandCoasts`, `coastlines` step copies engine `terrainType` + `isWater` into `buffers.heightfield` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts:12`).

### Feature readback into fields (engine → fields)
- `reifyFeatureField()` copies `adapter.getFeatureType(x,y)` across the whole map into `context.fields.featureType` (`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/apply.ts:57`).
  - Called after feature placement in `features` and `features-apply` steps (`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts:88`, `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts:34`).

## Q4) Places where “Physics truth” is derived from engine state today

High-signal backfeeds:
- Heightfield truth is overwritten by engine after `buildElevation()` via `syncHeightfield()` (`packages/mapgen-core/src/core/types.ts:421`), meaning “physics elevation” becomes engine elevation (no longer the earlier op-produced `baseTopography.elevation`).
- `coastlines` step reads engine coastline edits into `buffers.heightfield` (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts:12`).
- Narrative corridors read elevation/rainfall directly from engine adapter (not from artifacts/buffers): `mods/mod-swooper-maps/src/domain/narrative/corridors/land-corridors.ts:58`.
- Mountains step seeds terrain planning with engine `FractalBuilder` outputs via adapter (`createFractal`/`getFractalHeight`) (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts:19`).
- Ecology feature planning seeds from engine feature state (reads `getFeatureType()` across all tiles): `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/inputs.ts:42`.

Notable “physics work that gets discarded”:
- `morphology-mid/geomorphology` mutates `buffers.heightfield.elevation` in-place (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/geomorphology.ts:21`), but we never mirror elevation to engine (no `setElevation`); later `buildElevation()` + `syncHeightfield()` overwrites that buffer with engine elevation.
- `morphology-mid/routing` computes flow routing from `deps.artifacts.topography.elevation` before `geomorphology` runs (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/routing.ts:58`), so the published routing artifact may not correspond to the final (pre-engine) elevation buffer.

## Q5) What guarantees do we assume about TerrainBuilder mutating map state? Any “sync” code?

Current implicit contract:
- Terrain/feature “writes” happen continuously (terrain via `writeHeightfield` → engine `setTerrainType`; features via `setFeatureType`; rainfall via `setRainfall`).
- When we invoke engine-side mutation phases (e.g. `expandCoasts`, `buildElevation`, `modelRivers`, `validateAndFixTerrain`), we often assume the engine may alter realized terrain/elevation/water and therefore call `syncHeightfield()` (or a manual partial sync) immediately afterward to re-canonicalize our working buffers to the engine’s current surface.

Notably absent:
- No analogous “sync continents/areas” into a physics domain artifact; `stampContinents()` + `recalculateAreas()` are treated as engine-only bookkeeping (except for their indirect impact on later `isWater`/`getTerrainType` queries).

## Q6) Phase 3 implication (Physics → intent → stamp): likely conflicts + validations needed

Conflicts to resolve if Physics truth must remain authoritative post-stamp:
- `syncHeightfield()` is a direct engine→physics backfeed. Under the locked Phase 2 posture, this function (and its call sites) must be deleted:
  - Physics truth must never be overwritten by engine-derived fields.
  - If a recipe needs engine-derived surfaces (elevation bands, cliff crossings, “isWater” after engine fixups) for Gameplay/map decisions or observability, publish them as `artifact:map.*` in Gameplay `plot-*` steps gated by the corresponding `effect:map.*Plotted` (no realized snapshot artifact layer; no receipts).
- Narrative corridors currently sample `adapter.getElevation/getRainfall` directly (`mods/mod-swooper-maps/src/domain/narrative/corridors/land-corridors.ts:58`), bypassing artifacts/buffers and risking mismatch vs staged physics/heightfield.
- Feature placement currently reads back engine feature types into `fields.featureType` (`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/apply.ts:57`). If Phase 3 introduces `effect:map.*Plotted` intents, decide explicitly whether feature fields represent “intent” or “realized”.
- Many downstream “physics-like” computations currently assume post-`buildElevation` engine elevation is canonical because they read `heightfield.elevation` after `syncHeightfield()`:
  - Hydrology baseline/refine: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:396`, `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/steps/climateRefine.ts:214`
  - Ecology pedology/features planning: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/pedology/index.ts:22`, `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/index.ts:67`

What can likely stay (but should be made explicit):
- Engine-driven evaluation phases (`recalculateAreas`, `storeWaterData`, `recalculateFertility`) look gameplay-owned; keeping them engine-only is compatible as long as we don’t treat their derived data as physics truth.

Validations to add/check during Phase 3:
- Guardrail: ensure no step that claims to consume physics/heightfield reads directly from `adapter.getElevation/getTerrainType/isWater` (search + contract lint).
- Decide + codify ownership boundaries for `heightfield.elevation` around the `buildElevation()` call (hybrid vs fully physics-derived elevation).

---

## Verdict (closure)

### What Civ7 actually does (ground truth)

- Civ7 provides no API to set elevation or cliffs directly (there is `TerrainBuilder.buildElevation()` and readbacks like `GameplayMap.getElevation(...)` / `GameplayMap.isCliffCrossing(...)`, but no `setElevation` / `setCliff`).
- In base-standard scripts, `buildElevation()` is a deterministic postprocess step and subsequent map decisions (e.g., hill placement) explicitly read engine-derived elevation + cliff crossings.

### What we should do (coherent ownership rule)

- Treat engine-derived elevation bands and cliff crossings as **Gameplay/map state**, not Physics truth.
- Do not allow Physics domains to “decide cliffs” and then later discover the engine put cliffs elsewhere. Instead:
  - If a decision must match the actual Civ7 cliff layout or engine elevation bands, make it a Gameplay `plot-*` decision that runs **after** `effect:map.elevationPlotted` and reads the engine surfaces (or `artifact:map.*` projections taken after that effect).
  - Physics domains can still compute slope/roughness/relief/plateau-ness from Physics elevation for physics processes, but those are not “the Civ7 cliffs”.

### Why this is not “two sources of truth”

- The bug scenario only exists if Physics is making gameplay/projection decisions based on a cliff concept that isn’t the engine’s. The fix is not to “sync cliffs into Physics”; the fix is to keep cliff-dependent gameplay decisions in the map/materialization lane (post-`buildElevation`) where they read the actual engine-derived cliffs.

### Immediate Phase 3 implications (based on the callsites above)

- Move `buildElevation()` out of `hydrology-climate-baseline` into a Gameplay `plot-elevation` step.
- Delete `syncHeightfield()` call sites (lakes/climateBaseline/rivers/features).
- Replace any downstream Physics usage of `heightfield.elevation` that was indirectly engine-synced:
  - use Physics truth elevation artifacts for physics computations, or
  - reclassify the computation as Gameplay/map logic that runs after `effect:map.elevationPlotted`.

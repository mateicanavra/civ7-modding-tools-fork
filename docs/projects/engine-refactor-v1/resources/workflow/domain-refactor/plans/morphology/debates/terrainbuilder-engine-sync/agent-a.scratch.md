# Agent A scratch — Civ7 official scripts: `TerrainBuilder` call semantics

Scope: evidence from extracted Civ7 official resources under `.civ7/outputs/resources/Base/modules/**` (not our own adapter/pipeline code).

## Where the scripts live

- Base map generators: `.civ7/outputs/resources/Base/modules/base-standard/maps/*.js`
- Notable map script with full “vanilla-ish” end-to-end pipeline: `.civ7/outputs/resources/Base/modules/base-standard/maps/terra-incognita.js`
- Age transition hook (post-load): `.civ7/outputs/resources/Base/modules/base-standard/scripts/age-transition-post-load.js`

## 1) Where `TerrainBuilder` is used + call sequences around it

### Canonical map-generation ordering (example: `terra-incognita.js`)

Observed order in `.civ7/outputs/resources/Base/modules/base-standard/maps/terra-incognita.js:181`:

1) “Fixup” after base land/water stamping:
   - `TerrainBuilder.validateAndFixTerrain()` (`terra-incognita.js:181`)
2) Coast expansion + area recomputation:
   - `AreaBuilder.recalculateAreas()` (`terra-incognita.js:191`)
3) Continent stamping:
   - `TerrainBuilder.stampContinents()` (`terra-incognita.js:192`)
4) Terrain-type mutations before elevation build:
   - `addMountains(...)` + `addVolcanoes(...)` call `TerrainBuilder.setTerrainType(...)` internally (e.g. `.civ7/outputs/resources/Base/modules/base-standard/maps/elevation-terrain-generator.js:10`, `.civ7/outputs/resources/Base/modules/base-standard/maps/volcano-generator.js`)
   - `generateLakes(...)` calls `TerrainBuilder.setTerrainType(...)` internally (`elevation-terrain-generator.js:121`)
   - `AreaBuilder.recalculateAreas()` again (`terra-incognita.js:196`)
5) Elevation derivation:
   - `TerrainBuilder.buildElevation()` (`terra-incognita.js:197`)
6) Downstream steps that *read back* engine-derived elevation/cliff info:
   - `addHills(...)` reads `GameplayMap.getElevation(...)` and `GameplayMap.isCliffCrossing(...)` then writes hill terrain via `TerrainBuilder.setTerrainType(...)` (`elevation-terrain-generator.js:42`, `elevation-terrain-generator.js:44`)
   - `designateBiomes(...)` reads `GameplayMap.getElevation(...)` + `GameplayMap.getRainfall(...)` then writes via `TerrainBuilder.setBiomeType(...)` (`feature-biome-generator.js:39`)
7) River derivation + fixups:
   - `TerrainBuilder.modelRivers(...)` (`terra-incognita.js:200`)
   - `TerrainBuilder.validateAndFixTerrain()` (`terra-incognita.js:201`)
   - `TerrainBuilder.defineNamedRivers()` (`terra-incognita.js:202`)
8) Floodplains/features + fixups:
   - `TerrainBuilder.addFloodplains(...)` (`terra-incognita.js:206`)
   - `TerrainBuilder.validateAndFixTerrain()` (`terra-incognita.js:208`)
9) “Store water data” near the end:
   - `AreaBuilder.recalculateAreas()` (`terra-incognita.js:209`)
   - `TerrainBuilder.storeWaterData()` (`terra-incognita.js:210`)

This same high-level pattern shows up in other base-standard generators (e.g. `.civ7/outputs/resources/Base/modules/base-standard/maps/archipelago.js:117`).

### Related builder APIs in the same sequences

The same official scripts interleave `TerrainBuilder` calls with:

- `AreaBuilder.recalculateAreas()` before `TerrainBuilder.stampContinents()` (e.g. `terra-incognita.js:191`, `archipelago.js:119`)
- `FractalBuilder.create(...)` + `FractalBuilder.getHeight(...)` / `getHeightFromPercent(...)` to produce per-plot noise fields that then drive `TerrainBuilder.setTerrainType(...)` (e.g. mountains in `.civ7/outputs/resources/Base/modules/base-standard/maps/elevation-terrain-generator.js:10`)

### Fixup/validation steps that might mutate terrain

Across base-standard map generators, `TerrainBuilder.validateAndFixTerrain()` is called multiple times:
- Before `stampContinents()` (after base terrain stamping/coast tweaks): e.g. `.civ7/outputs/resources/Base/modules/base-standard/maps/archipelago.js:117`
- Immediately after `modelRivers(...)`: e.g. `.civ7/outputs/resources/Base/modules/base-standard/maps/archipelago.js:128`
- After floodplains/features placement: e.g. `.civ7/outputs/resources/Base/modules/base-standard/maps/archipelago.js:135`

Interpretation (evidence is call placement, not internals): vanilla scripts expect the engine to “repair” or normalize invalid combinations after large mutation phases (terrain stamping, river generation, feature placement).

## 2) Does Civ7 build elevation multiple times per map gen?

In extracted official resources, `TerrainBuilder.buildElevation()` appears once per base-standard map generator script, and only in base-standard:

- `.civ7/outputs/resources/Base/modules/base-standard/maps/archipelago.js:124`
- `.civ7/outputs/resources/Base/modules/base-standard/maps/continents.js:152`
- `.civ7/outputs/resources/Base/modules/base-standard/maps/continents-plus.js:218`
- `.civ7/outputs/resources/Base/modules/base-standard/maps/continents-voronoi.js:131`
- `.civ7/outputs/resources/Base/modules/base-standard/maps/fractal.js:158`
- `.civ7/outputs/resources/Base/modules/base-standard/maps/pangaea-plus.js:260`
- `.civ7/outputs/resources/Base/modules/base-standard/maps/pangaea-voronoi.js:115`
- `.civ7/outputs/resources/Base/modules/base-standard/maps/shattered-seas-voronoi.js:124`
- `.civ7/outputs/resources/Base/modules/base-standard/maps/shuffle.js:168`
- `.civ7/outputs/resources/Base/modules/base-standard/maps/terra-incognita.js:197`

No additional `buildElevation()` calls were found elsewhere under `.civ7/outputs/resources` via string search.

## 3) Is elevation building additive/stacking, or a recomputation?

No direct evidence of additive vs recompute is present in the extracted scripts (no parameters, no “reset”/“clear” APIs, no repeated calls).

Indirect evidence suggests “compute once after terrain stamping”:
- Vanilla scripts:
  - mutate terrain types (mountains/volcanoes/lakes) via `TerrainBuilder.setTerrainType(...)`
  - then call `TerrainBuilder.buildElevation()`
  - then run downstream logic that assumes `GameplayMap.getElevation(...)` and `GameplayMap.isCliffCrossing(...)` are meaningful (`elevation-terrain-generator.js:42`, `elevation-terrain-generator.js:44`)

Needs further evidence:
- Engine-side documentation or runtime experiments that show whether calling `buildElevation()` twice would overwrite vs layer.

## 4) `TerrainBuilder` API surface observed in official scripts

Methods referenced under `.civ7/outputs/resources/Base/modules/base-standard/**`:

- Generation/control:
  - `TerrainBuilder.buildElevation()` (see list above)
  - `TerrainBuilder.stampContinents()` (e.g. `terra-incognita.js:192`)
  - `TerrainBuilder.validateAndFixTerrain()` (e.g. `terra-incognita.js:181`, `terra-incognita.js:201`, `terra-incognita.js:208`)
  - `TerrainBuilder.modelRivers(...)` (e.g. `terra-incognita.js:200`)
  - `TerrainBuilder.defineNamedRivers()` (e.g. `terra-incognita.js:202`)
  - `TerrainBuilder.addFloodplains(...)` (e.g. `terra-incognita.js:206`)
  - `TerrainBuilder.storeWaterData()` (e.g. `terra-incognita.js:210`; also used in age transition `age-transition-post-load.js:19`)
- Plot mutations:
  - `TerrainBuilder.setTerrainType(x, y, terrainType)` (heavy use; e.g. `elevation-terrain-generator.js:25`)
  - `TerrainBuilder.setBiomeType(x, y, biomeType)` (`feature-biome-generator.js:35`)
  - `TerrainBuilder.setFeatureType(x, y, featureType)` (e.g. `.civ7/outputs/resources/Base/modules/base-standard/maps/volcano-generator.js`)
  - `TerrainBuilder.setRainfall(x, y, rainfall)` (`elevation-terrain-generator.js:164`)
  - `TerrainBuilder.setLandmassRegionId(x, y, regionId)` (e.g. `elevation-terrain-generator.js:78`)
  - `TerrainBuilder.setPlotTag(x, y, tag)` / `addPlotTag(x, y, tag)` / `removePlotTag(x, y, tag)` (e.g. `.civ7/outputs/resources/Base/modules/base-standard/maps/shattered-seas-voronoi.js:100`)
- Queries/utility:
  - `TerrainBuilder.getRandomNumber(n, label)` (used everywhere; e.g. `terra-incognita.js:79`)
  - `TerrainBuilder.generatePoissonMap(seed, avgDistance, smoothing)` (e.g. `terra-incognita.js:236`; also `age-transition-post-load.js:143`)
  - `TerrainBuilder.canHaveFeature(x, y, featureType)` (`feature-biome-generator.js:392`)

### Engine API inventory breadcrumb (`Scripting.log`)

Separately from extracted scripts, this repo contains a runtime “engine API dump” log showing `TerrainBuilder` keys:

- `.civ7/outputs/resources` evidence: methods actually invoked by base-standard scripts (listed above).
- `Scripting.log` evidence: engine global exposes at least these TerrainBuilder functions (includes one not seen in base-standard scripts):
  - `TerrainBuilder.canHaveFeatureParam` (`Scripting.log:117`)
  - Full list dump: `Scripting.log:106` through `Scripting.log:138`
- Related readback-only clue: `GameplayMap.getElevation` exists (`Scripting.log:35`), but no `GameplayMap.setElevation` appears in the dump (searched), matching the “elevation is engine-derived” pattern.
- Related builder inventory: `FractalBuilder` and `AreaBuilder` are also dumped (`Scripting.log:139` through `Scripting.log:174`), matching their observed use in base-standard map scripts.

## 5) Postprocess steps that can mutate terrain after stamping

Beyond explicit “set*” calls in scripts, the following are strong candidates for engine-side mutation phases (based on name + placement):

- `TerrainBuilder.validateAndFixTerrain()` (called after large, script-driven mutations)
- `TerrainBuilder.buildElevation()` (derives elevation/cliffs; downstream scripts immediately read it back)
- `TerrainBuilder.modelRivers(...)` + `TerrainBuilder.addFloodplains(...)` (derive river graph and floodplain placement)
- `TerrainBuilder.stampContinents()` (likely stamps continent/area metadata based on `AreaBuilder` state)
- `TerrainBuilder.storeWaterData()` (likely caches derived water/coast/river info for other systems)

## 6) Engine-derived data read back (what scripts treat as “truth”)

Vanilla scripts read these `GameplayMap` values *after* `buildElevation()` and/or river steps and use them to decide further mutations:

- Elevation + cliffs:
  - `GameplayMap.getElevation(...)` and `GameplayMap.isCliffCrossing(...)` used for hill placement (`elevation-terrain-generator.js:42` / `elevation-terrain-generator.js:44`)
  - `GameplayMap.getElevation(...)` used as a biome latitude adjustment (`feature-biome-generator.js:39`)
- Rainfall:
  - Set by script via `TerrainBuilder.setRainfall(...)` (`elevation-terrain-generator.js:164`)
  - Then read via `GameplayMap.getRainfall(...)` in biomes (`feature-biome-generator.js:40`)
- Rivers:
  - `GameplayMap.isRiver(...)` / `GameplayMap.isAdjacentToRivers(...)` influences biome assignment (`feature-biome-generator.js:51`)
  - Feature placement logic checks river adjacency and navigable rivers (`feature-biome-generator.js:83`)

## Recommendation (Phase 3 derisking lens)

Evidence from vanilla scripts shows a *two-way* dependency pattern:

- Scripts *write* coarse terrain (land/water, mountains, lakes) via `TerrainBuilder.setTerrainType(...)`, then rely on `TerrainBuilder.buildElevation()` to produce an engine-derived elevation/cliff field that is immediately read back (`GameplayMap.getElevation`, `GameplayMap.isCliffCrossing`) to drive later decisions (hills, biome selection).
- Scripts also call `validateAndFixTerrain()` multiple times as “repair” passes, implying the engine may mutate/normalize plots beyond the script’s direct intent.

Implication for our “Physics truth vs engine materialization” question:
- If Phase 3 continues to use engine `buildElevation()` (for micro-variation/cliff derivation), downstream domains that depend on elevation/cliffs must either (a) treat engine readback as authoritative derived state, or (b) reimplement comparable derivations in our own model and avoid reading back.
- If Phase 3 aims for a one-way “materialize only” engine boundary, we should avoid depending on engine-only derived fields (`getElevation`/cliff graph) for subsequent modeling steps — but vanilla logic currently does depend on them.

# SPIKE: Expanding Hydrology Improvements into Lakes + Navigable Rivers

## Objective

We improved Hydrology truth by replacing steepest-descent routing with Priority-Flood + ε descent (eliminating sinks on quantized / flat terrain). This follow-up spike assesses how to extend those gains into **gameplay-facing lakes** and **navigable rivers**.

## Current state (ground truth pointers)

### Hydrology truth (owned)

- Hydrography truth is published in `hydrology-hydrography` (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`).
- Engine projection is explicitly described as “projection-only” in `plotRivers.contract.ts` (`mods/mod-swooper-maps/src/recipes/standard/stages/map-hydrology/steps/plotRivers.contract.ts`).

### Gameplay projection (engine-owned today)

- Rivers: `plot-rivers` calls `context.adapter.modelRivers(minLength, maxLength, NAVIGABLE_RIVER_TERRAIN)` (`mods/mod-swooper-maps/src/recipes/standard/stages/map-hydrology/steps/plotRivers.ts`).
- Lakes: `lakes` calls `context.adapter.generateLakes(width, height, tilesPerLake)` (`mods/mod-swooper-maps/src/recipes/standard/stages/map-hydrology/steps/lakes.ts`).

In the production adapter:
- `modelRivers` delegates to `TerrainBuilder.modelRivers(...)` (`packages/civ7-adapter/src/civ7-adapter.ts`).
- `generateLakes` delegates to base-standard JS `generateLakes(...)` (`packages/civ7-adapter/src/civ7-adapter.ts`, imported from `/base-standard/maps/elevation-terrain-generator.js`).

### What “vanilla lakes” actually do

Base-standard `generateLakes` is a random scatter algorithm that:
- selects random inland, non-coastal, non-impassable land tiles,
- converts them (and some neighbors) to `g_CoastTerrain`,
- and returns a list of affected tiles.

It does **not** consult elevation, flow, or depressions. See:
- `.civ7/outputs/resources/Base/modules/base-standard/maps/elevation-terrain-generator.js` (`generateLakes`, `addMoreLake`)

### What “navigable rivers” are in vanilla

- Vanilla maps pass `g_NavigableRiverTerrain` (resolved from `TERRAIN_NAVIGABLE_RIVER`) to `TerrainBuilder.modelRivers(...)`.
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/map-globals.js`
  - `.civ7/outputs/resources/Base/modules/base-standard/maps/shuffle.js`
- The terrain type has deep gameplay wiring (movement, modifiers, resources, AI biases):
  - `.civ7/outputs/resources/Base/modules/base-standard/data/terrain.xml` (terrain definition)
  - `.civ7/outputs/resources/Base/modules/base-standard/data/unit-movement.xml` (embarkation)
  - `.civ7/outputs/resources/Base/modules/base-standard/data/modifiers.xml` (requirements)
  - `.civ7/outputs/resources/Base/modules/base-standard/data/resources-v2.xml` (resource-on-terrain rows)

### Current mismatch risk in our pipeline

We currently treat “major rivers” in two different ways:

1) **Hydrology truth:** `hydrography.riverClass === 2` (major) — used during ecology planning.
   - `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/index.ts` derives `navigableRiverMask` from `hydrography.riverClass`.

2) **Gameplay projection:** engine `TERRAIN_NAVIGABLE_RIVER` tiles are produced later by `TerrainBuilder.modelRivers(...)`.
   - `mods/mod-swooper-maps/src/recipes/standard/stages/map-hydrology/steps/plotRivers.ts`

If these disagree (likely), ecology planning can avoid tiles that do not end up being navigable river terrain, and/or fail to avoid tiles that do.

## Constraints (why this is non-trivial)

1) The adapter has **no API to set elevation**; it can set terrain type, rainfall, biome, features, tags, etc., but not height (`packages/civ7-adapter/src/types.ts`).
2) `generateLakes` is **random** and **not hydrology-driven** (see base-standard file above).
3) `modelRivers` is a **black box** engine routine. Without a richer adapter, we cannot “feed it” our computed hydrography directly.

## Options: Lakes

### Option L1 — Keep vanilla lake projection (status quo)

- Continue using `adapter.generateLakes(...)` and treat lakes as gameplay “flavor”.
- Pros: zero work; consistent with base-standard expectations.
- Cons: no relationship to hydrology; can put lakes on ridges; can’t express “endorheic basins” as lakes (because routing now removes sinks by design).

### Option L2 — Owned lakes derived from depressions (recommended)

Introduce an owned “lake intent” layer derived from *pre-conditioning depressions*:

- During routing (Priority-Flood), compute additional metadata:
  - `fillDelta[i] = routingElevation[i] - elevation[i]` (where > 0 indicates filled/depression region),
  - group contiguous `fillDelta>0` regions into `depressionIdByTile`,
  - compute per-depression stats (area, max fill, outlet elevation, etc.).
- Convert selected depressions (or a subset by size / world age / lakeiness knob) into lake tiles (set terrain to `TERRAIN_COAST`).
- Pros:
  - ties lakes to actual basins / hydrology structure,
  - deterministic and tunable,
  - naturally supports “few big lakes vs many small lakes”.
- Cons:
  - requires a new truth surface (artifact + contracts),
  - must be careful to avoid breaking landmass IDs / start/placement invariants.

**Where it would live (suggested):**
- Truth: new Hydrology artifact (e.g., `artifact:hydrology.lakes`) in `hydrology-hydrography` or a new `hydrology-lakes` stage.
- Projection: new map step (e.g., `plot-lakes-owned`) in `map-hydrology` that sets terrain types.

### Option L3 — Owned lakes from “hydraulic nodes” (flow-based reservoirs)

Place lakes where:
- flow accumulation is high,
- local slope is low,
- and region is inland (not adjacent to existing water).

Pros: avoids needing depression segmentation.
Cons: produces “swampy flats” / reservoirs, not geomorphically-plausible basins; can fight with desired coastlines.

## Options: Navigable rivers

### Option R1 — Keep engine modelRivers (status quo projection)

Keep `plot-rivers` as engine projection, but accept that it is largely disconnected from our hydrography truth.

Pros: maintains vanilla gameplay compatibility (names, water data, expectations).
Cons: Hydrology improvements do not directly improve navigable rivers; truth/projection can diverge.

### Option R2 — Align ecology planning with engine rivers (reorder or defer “navigable river mask”)

Today, we compute `navigableRiverMask` for ecology planning from `hydrography.riverClass` before engine rivers exist.

Alternative:
- defer any “avoid navigable rivers” logic until after `plot-rivers` runs (i.e., during map-ecology, when terrain types include `TERRAIN_NAVIGABLE_RIVER`),
- or add a second-stage filter in `features-apply` that drops placements that land on navigable river terrain.

Pros: avoids mismatch without changing the engine river generator.
Cons: does not improve the river layout itself; can reduce determinism of placement outcomes (more placements get dropped late).

### Option R3 — Owned navigable rivers (terrain stamping from hydrography) — risky without engine river APIs

Stamp `TERRAIN_NAVIGABLE_RIVER` onto tiles where `hydrography.riverClass===2`.

Pros: makes navigable river terrain reflect our truth, immediately.
Cons / open questions:
- `TerrainBuilder.modelRivers(...)` may do more than terrain stamping (connectivity, naming, water data). We do not currently have adapter APIs to replicate that.
- `EngineAdapter.isAdjacentToRivers` likely refers to the engine’s river system (unknown whether it keys off terrain or a separate river graph).

If pursued, this should start as an experiment branch behind a config strategy (owned vs engine) and must be validated against:
- movement/embarkation behavior,
- start bias and placement rules that depend on rivers,
- `storeWaterData()` correctness at placement end.

## Measurable outcomes (A/B metrics to add)

### Existing measurable wins (already implemented)

- A/B sink reduction on fixtures:
  - `packages/mapgen-core/test/lib/grid/flow-routing.ab-sinks.test.ts`
- A/B hydrology impact on fixtures (sink/outlet masks + riverClass signal):
  - `mods/mod-swooper-maps/test/hydrology/hydrology-routing.ab.test.ts`

### Proposed metrics for lakes

Add test-only instrumentation that reports:
- `lakeTileCount` (tiles with `TERRAIN_COAST` that are not connected to the ocean),
- `lakeCount` (connected components of lake tiles),
- distribution stats (mean/median lake size),
- overlap with `fillDelta>0` depressions (if Option L2).

### Proposed metrics for navigable rivers

Add instrumentation that compares:
- `hydrographyMajorMask` (`riverClass===2`) vs `engineNavigableRiverMask` (`terrain===TERRAIN_NAVIGABLE_RIVER`) after `plot-rivers`,
- compute overlap scores (e.g., Jaccard index) and mismatch counts.

## Recommendation (next implementation slice)

1) **Lakes:** implement Option L2 as a separate truth+projection pair, because vanilla lakes are random and not hydrology-driven.
2) **Navigable rivers:** keep engine `modelRivers` for now, but eliminate truth/projection mismatch by deferring “navigable river” avoidance decisions until after `plot-rivers` (Option R2), or by applying a late-stage placement filter in `features-apply`.

If we later need owned navigable rivers (Option R3), first expand the adapter surface to clarify what the engine’s river model requires (terrain-only vs river graph), and gate the behavior behind an explicit strategy.

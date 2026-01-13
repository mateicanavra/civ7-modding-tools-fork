# SPIKE: Gameplay — Mapgen-Time Touchpoints (Evidence)

This spike captures **mapgen-time gameplay levers** visible in Civ7’s official `base-standard` map scripts and data tables.

**Scope note:** This is **design-level evidence**, not an SDK integration plan. It intentionally avoids repo-local wiring details (stage paths, adapter APIs, SDK node locations) to keep churn low.

## What “gameplay” can touch during map generation (evidence)

- Starts / civ placement (major players): `.civ7/outputs/resources/Base/modules/base-standard/maps/assign-starting-plots.js` implements `assignStartPositions(...)` and includes leader/civ start-bias scoring (biomes, terrains, rivers, coasts, features, resources, lakes, natural wonders).
- Advanced start regions (“board setup” beyond the initial start tile): `.civ7/outputs/resources/Base/modules/base-standard/maps/assign-advanced-start-region.js` implements `assignAdvancedStartRegions()` and calls `StartPositioner.setAdvancedStartRegion(...)`.
- Discoveries (“goody huts” equivalents): `.civ7/outputs/resources/Base/modules/base-standard/maps/discovery-generator.js` places discoveries via `MapConstructibles.addDiscovery(...)`, and uses `GameInfo.DiscoverySiftingImprovements` plus `Configuration.getGameValue("DiscoverySiftingType")`.
- Natural wonders: `.civ7/outputs/resources/Base/modules/base-standard/maps/natural-wonder-generator.js` places wonders and honors `Configuration.getMapValue("RequestedNaturalWonders")`.
- Resources: `.civ7/outputs/resources/Base/modules/base-standard/maps/resource-generator.js` uses `ResourceBuilder.getGeneratedMapResources(...)` and also consults map-type tables like `GameInfo.MapIslandBehavior` (driven by `Configuration.getMapValue("Name")`).
- Fertility + water data (board scoring inputs): the canonical map scripts (e.g. `.civ7/outputs/resources/Base/modules/base-standard/maps/terra-incognita.js`) run `FertilityBuilder.recalculate()` and `TerrainBuilder.storeWaterData()` after terrain/features are in place.

## Gameplay tuning that’s “data-driven” but directly affects mapgen behavior

- Start biases live in base data: `.civ7/outputs/resources/Base/modules/base-standard/data/leaders.xml` defines `<StartBiasBiomes>`, `<StartBiasTerrains>`, `<StartBiasFeatureClasses>`, `<StartBiasRivers>`, `<StartBiasAdjacentToCoasts>`, `<StartBiasNaturalWonders>`.
- Discovery type mapping lives in base data: `.civ7/outputs/resources/Base/modules/base-standard/data/narrative-sifting.xml` defines `<DiscoverySiftingImprovements>` that the discovery generator reads.

## What I did not find (re: “barbarians / city-states at mapgen time”)

- I did not find mapgen-time placement logic for barbarians or city-states in `base-standard/maps/*.js` (no callsites analogous to `assignStartPositions` / `generateResources` / `addNaturalWonders`).
- Barbarians are clearly defined in data (`.civ7/outputs/resources/Base/modules/base-standard/data/Barbarians.xml`), but that appears to be gameplay/system runtime, not the map generator scripts themselves.

## Design implications (domain shape)

If we treat “gameplay” as a first-class domain in the map generation pipeline, this evidence implies gameplay’s mapgen-time responsibility set is:

- **Board setup:** start positions + advanced start regions.
- **Content placement:** discoveries + natural wonders + resources (and related post-processing like fertility/water data updates).
- **Gameplay-tuning inputs:** data tables that condition these scripts (start biases, discovery sifting mapping, map-type resource behavior).

## A plausible merged shape (conceptual, not implementation)

- A merged **Gameplay** domain could treat “board setup” and “content placement” as a coherent causal layer that sits *above* physics-derived fields (terrain, climate, hydrology) and *consumes* higher-level “story overlays” (corridors/swatches/etc) to bias/shape final gameplay outcomes.
- Stages would likely remain multiple (because narrative/playability decisions are interleaved with other domains), but they’d be **owned by gameplay** as a domain concern rather than split across “narrative” vs “placement” as separate ownership units.

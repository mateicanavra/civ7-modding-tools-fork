# SPIKE: Gameplay — Mapgen-Time Touchpoints (Evidence)

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
- Our SDK already exposes authoring for start-bias tables (evidence: `packages/sdk/src/nodes/StartBias*Node.ts`).

## What I did not find (re: “barbarians / city-states at mapgen time”)

- I did not find mapgen-time placement logic for barbarians or city-states in `base-standard/maps/*.js` (no callsites analogous to `assignStartPositions` / `generateResources` / `addNaturalWonders`).
- Barbarians are clearly defined in data (`.civ7/outputs/resources/Base/modules/base-standard/data/Barbarians.xml`), but that appears to be gameplay/system runtime, not the map generator scripts themselves.

## What a combined “gameplay domain” would realistically pull from (today)

- From placement (existing, fairly “domain-shaped”): the planning ops (`mods/mod-swooper-maps/src/domain/placement/ops/*`) + the final application step that calls engine placement APIs (`mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`).
- From narrative (currently gameplay-oriented but not modeled as ops): the narrative stages already emit “story” artifacts like storyOverlays and corridors/motifs (e.g. `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.contract.ts`, `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.contract.ts`). This is exactly the “overlays for downstream consumers” shape you’ve been pushing.
- From Civ7 official resources: map scripts + the data tables they consult (start bias tables, discovery sifting table, map-type resource behavior tables). That’s where most “outside the box but real” gameplay levers are today.

## A plausible merged shape (conceptual, not implementation)

- Domain: `@mapgen/domain/gameplay` (new), absorbing:
  - “Board setup” (starts + advanced start regions + late-stage map scoring hooks like fertility).
  - “Content placement” (wonders, discoveries, resources, floodplains).
  - “Story overlays” (corridors/swatches/etc) currently living under Narrative stages; these become first-class gameplay outputs consumed by Ecology + Placement.
- Stages would likely remain multiple (because narrative steps are interleaved across morphology/hydrology today), but they’d be “owned” by the gameplay domain rather than split across narrative + placement.

If you want, I can go one level deeper and produce a concrete “inventory” of exactly which existing narrative-* and placement steps/artifacts become gameplay-owned, plus a short list of new gameplay capabilities we can only reach by extending `EngineAdapter` (e.g., direct resource writes via `ResourceBuilder.setResourceType` which exists in the scripts but isn’t currently exposed as a first-class adapter API).

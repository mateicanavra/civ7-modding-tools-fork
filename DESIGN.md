# Epic Diverse Huge Map Generator — DESIGN

Version: 1.0.0
Target: Civilization VII (Huge maps prioritized)

This document describes the current architecture and design of the Epic Diverse Huge map generator. It focuses on the composition of the pipeline, responsibilities of each stage, the modeling choices behind landforms and climate, and the compatibility/performance constraints that guide the implementation.

The intent is to keep this as the authoritative design reference for v1.0.0 and a foundation for future modularization into layered components.


## 1) Design Goals

- Regional coherence with organic variation:
  - Large continental “cores” with fragmented fringes and believable coastlines
  - Rivers and rainfall/climate interact to form green corridors and dry shadows
  - Coastal humidity and interior gradients feel natural and gradual
- Naval relevance and exploration:
  - True oceans between land bands for meaningful sea play
  - Small island clusters placed far enough offshore to avoid chokepoint spam
- Playability and balance:
  - Lean on base elevation/hills/wonders/resources systems for baseline balance
  - Apply targeted, gentle nudges for biome/feature density
  - Avoid extreme cliff or mountain proliferation
- Compatibility-first:
  - Build on base-standard modules for terrain, biomes, features, resources, etc.
  - Keep imports and start-position logic aligned with vanilla expectations
- Performance:
  - O(width × height) passes with small constants
  - Avoid heavy global multipliers and overly granular noise layers


## 2) High-level Pipeline

The generator runs as a sequence of coordinated passes. Each pass is responsible for one clearly defined concern and is designed to be composable and compatible with the next.

1) Start Sector Preparation (pre-terrain):
   - Choose start-sector grid, possibly biasing human closer to equator (via utilities).
   - Define minimal continent windows for start assignment compatibility.

2) Landmass Carving:
   - Create three vertical continental bands with “true oceans” on sides and between bands.
   - Per-row sinusoidal jitter and fractal noise avoid straight band edges.
   - Center bias favors inland “cores,” yielding strong interiors and porous perimeters.

3) Coastlines and Offshore Islands:
   - Expand coasts (base).
   - Ruggedize coasts by occasionally carving bays and forming peninsulas/fjords.
   - Seed small island clusters in deeper waters, preserving sea lanes.

4) Elevation, Hills, Volcanoes, Lakes:
   - Mountains, hills, volcanoes use base-standard generation for balance.
   - Lakes are fewer than earlier experiments and tuned for this landform.

5) Climate and Hydrology:
   - Phase A: Build baseline rainfall (base) and blend with latitude bands (wet equator → temperate mid-lats → cold/dry poles).
   - Rivers modeled and named.
   - Phase B: Earthlike refinements:
     - Coastal/lacustrine humidity gradients decaying inland
     - Prevailing-wind orographic rain shadows by latitude band
     - River corridor greening and enclosed low-basin wetness

6) Biomes and Features:
   - Run base biome assignment.
   - Apply gentle, climate-aware nudges (tundra restraint, tropical coasts, temperate grassland in river valleys).
   - Run base features; increase density in a few targeted, validated cases (rainforest, forest, taiga).

7) Wonders, Floodplains, Snow, Resources, Discoveries:
   - Natural wonders slightly increased vs. map defaults (+1).
   - Floodplains, snow, resource generation, and discoveries use base systems.

8) Start Placement and Advanced Start:
   - Assign start positions with the standard, compatible method.
   - Recalculate fertility and finalize.


## 3) Key Modules and Responsibilities

- Landmass layer:
  - Responsibility: Create continental structure with organic edges and robust oceans.
  - Interfaces: TerrainBuilder.setTerrainType, FractalBuilder (land/hill noise), globals (terrain constants, seam/polar/ocean parameters).
  - Output: Initial land vs. ocean tiles; coast will be refined later.

- Coastline and Island layer:
  - Responsibility: Carve bays/fjords; seed small offshore archipelagos without blocking lanes.
  - Interfaces: GameplayMap (water/coastal adjacency), TerrainBuilder.setTerrainType.

- Elevation/Water layer:
  - Responsibility: Base mountains, hills, volcanoes; tuned lake density.
  - Interfaces: addMountains/addHills/addVolcanoes/generateLakes (base-standard).

- Climate layer (two-phase):
  - Responsibility: Baseline rainfall blending with latitude bands; post-river refinements (humidity gradients, wind shadows, river/basin greening).
  - Interfaces: GameplayMap.getRainfall/getElevation/getPlotLatitude/isCoastalLand/isAdjacentToShallowWater/isAdjacentToRivers; TerrainBuilder.setRainfall.

- Biome layer:
  - Responsibility: Base biome assignment plus climate/playability nudges (tundra restraint; equatorial tropical coasts; temperate river valleys as grassland).
  - Interfaces: designateBiomes (base), TerrainBuilder.setBiomeType.

- Feature layer:
  - Responsibility: Base features, then targeted density increases (rainforest, forest, taiga) validated against rules.
  - Interfaces: addFeatures (base), TerrainBuilder.canHaveFeature/setFeatureType, GameInfo.Features.lookup.

- Placement layer:
  - Responsibility: Natural wonders (+1), floodplains, snow, resources, discoveries, starts.
  - Interfaces: addNaturalWonders, TerrainBuilder.addFloodplains, generateSnow, generateResources, generateDiscoveries, assignStartPositions.


## 4) Detailed Algorithmic Notes

4.1 Landmass Carving (three-band continents)
- Input: Map width/height, globals for seam/polar/ocean rows/columns.
- Process:
  - Three vertical band windows are defined with wider oceans on the sides and between bands.
  - For each row, a sinusoidal offset and hill-fractal noise are combined to “wiggle” west/east boundaries and alter band thickness.
  - Within each band, apply a center-distance bias so land cores form more reliably while edges fracture more often.
- Output: Oceans with three organic continental bands, primed for robust coastlines and naval play.

4.2 Coastline Ruggedizing
- Occasionally convert coastal land to shallow water (bays) and adjacent ocean to coast (peninsulas/fjords), guided by a low-frequency noise mask and lightweight randomness.
- Safety: Operates only near coasts; avoids wholesale shoreline shifts.

4.3 Island Chains
- Seed islands far enough from land (radius checks) using a sparse high-threshold fractal as a mask.
- Create tiny clusters (1–3 tiles) to increase exploration targets while preserving lanes.

4.4 Climate: Phase A (banded baseline)
- Build the base rainfall map, then blend with latitude bands:
  - Very wet at equator; drying toward subtropics; temperate in mid-lats; cool/dry toward poles.
- Add coastal/shallow-water humidity bonuses; small orographic elevation bonuses; light noise to avoid visible banding.

4.5 Rivers and Refinements: Phase B (earthlike)
- Prevailing winds by latitude:
  - 0–30°: easterlies (trade winds, E→W)
  - 30–60°: westerlies (W→E)
  - 60–90°: polar easterlies (E→W)
- Orographic rain shadows:
  - Look upwind a few tiles for mountain/high-elevation barriers; subtract rainfall proportional to barrier strength/distance.
- Humidity gradients:
  - Increase rainfall based on distance-to-water up to a small radius; stronger if low elevation.
- River/basin greening:
  - Add humidity adjacent to rivers (more at lower elevation).
  - Slight wetness bonus in enclosed, low-elevation basins (surrounded by higher neighbors within a small radius).

4.6 Biome Nudging
- After base assignment:
  - Tundra: Only at very high latitudes or extreme elevations and low rainfall.
  - Tropical coasts: Near-equator coastal land with higher rainfall is encouraged toward tropical.
  - Temperate river valleys: When rainfall and latitude permit, prefer grassland for playability (food corridors).

4.7 Features with Validation
- After base features:
  - Rainforest: +chance in very wet tropical zones
  - Forest: +chance in wetter temperate grasslands
  - Taiga: +chance in cold tundra at lower elevations
- Always check TerrainBuilder.canHaveFeature before placing; feature type is resolved via GameInfo.Features.lookup for robustness.

4.8 Wonders, Snow, Floodplains, Resources, Discoveries
- Wonders: Increase by +1 over map defaults.
- Floodplains, snow, resources: Use base systems to preserve balance expectations.
- Discoveries: Added post-starts for exploration incentives.

4.9 Start Placement
- Start-sector grid is chosen up front; final assignment uses the standard, compatible method with simple west/east continent windows to satisfy vanilla assumptions.
- Fertility recalculated before advanced start regions.


## 5) Data Model and Invariants

- Coordinate system:
  - Integer tile indices (x: 0..width-1, y: 0..height-1)
  - Bounds must be respected in all neighborhood scans.
- Latitudes:
  - GameplayMap.getPlotLatitude returns degrees with 0 near equator and 90 near poles; most logic uses absolute latitude.
- Rainfall:
  - Internally normalized to [0, 200]; all passes clamp to this range.
- Elevation:
  - Values are engine-provided; common thresholds used:
    - Lowland: <150–250
    - High elevation for orographic effects: ≥500
    - Extreme elevation (tundra consideration): ~850+
- Water proximity:
  - Distance-to-water scans to a max radius of ~4; negative return means “no water within radius.”
- Validation:
  - TerrainBuilder.canHaveFeature must gate any manual feature placement.
  - Lookups via GameInfo.Features.lookup must handle missing results (return -1 → skip).


## 6) Tunables and Controls (v1.0.0 Defaults)

- Land/ocean composition:
  - Ocean columns widened slightly on sides/mid-ocean for robust naval lanes.
  - Land band widths are jittered by sinusoidal offset + fractal noise.
- Coast ruggedness:
  - Low probability per coast tile to carve a bay or extend a coast into nearby ocean; tuned to avoid chokepoints.
- Island seeding:
  - High fractal threshold; small cluster sizes (1–3); requires non-adjacency to land.
- Baseline climate band targets:
  - Very wet equator → moderate mid-lats → cool/dry poles; blended with base rainfall and light noise.
- Earthlike refinements:
  - Distance-to-water humidity radius ~4; wind barrier lookups ~4 tiles; river corridor and basin bonuses are small but noticeable.
- Wonders/lakes:
  - Wonders: +1 vs. map defaults.
  - Lakes: fewer than early drafts; tuned for balance within three-band landmasses.


## 7) Compatibility

- Base-standard dependency:
  - Elevation, coast expansion, rainfall baseline, biomes, features, resources, wonders, snow, and discovery generation rely on base-standard modules provided by the game/core modules.
- Start assignment:
  - Uses the same structure as vanilla and community scripts (sectors + continent windows).
- Map sizes:
  - Tuned for Huge maps. Other sizes may work but are not the primary target for v1.0.0.
- Resources folder:
  - Present for reference to community sources; not required for runtime in this mod layout.


## 8) Performance Considerations

- Complexity:
  - Each major pass is O(width × height) with small neighborhood scans (radius ≤ 4) in a limited number of passes.
- Memory:
  - No bespoke large buffers; relies on engine data queries and setters.
- Avoided pitfalls:
  - Removed aggressive cliff systems and heavy mountain amplification.
  - Island/coast passes are sparse and avoid wide flood fills.
- Practical advice:
  - Prefer parameter nudges over new global heavy passes.
  - Keep neighborhood radii small and conditional work early-exit where possible.


## 9) Testing and Debugging

- Visual validation:
  - Outputs/1.0.0 contains example images for v1.0.0 behavior across multiple seeds.
- Logging:
  - Readable phase messages are present (“Building enhanced rainfall patterns…”, etc.).
  - Optional JSON start/end logs are available but commented out by default; uncomment them in the script to enable structured monitoring.
- Debug dumps (optional):
  - Script includes commented calls to dump terrain/elevation/rainfall/biomes/features; these can be toggled locally for troubleshooting.
- Acceptance checks:
  - Oceans: verify robust east/west and mid-ocean lanes on Huge.
  - Rivers: confirm green corridors in temperate/warm zones; floodplains exist where sensible.
  - Rain shadows: observe drier leeward regions by latitude band wind rules.
  - Biome edges: ensure tundra restraint and smoother coastal-to-inland transitions.


## 10) Future Work and Modularization Plan

To further evolve this design, we plan to break the generator into explicit layers/components that can be tuned or swapped independently:

- LandmassLayer:
  - Encapsulate band definitions, jitter/noise shaping, and center-bias logic.
  - Provide seeds & presets for 2, 3, 4-band variants and archipelago modes.

- CoastlineLayer:
  - Expose independent knobs for bay carving, fjord frequency, island cluster rarity/size, and minimum sea-lane widths.

- ElevationHydrologyLayer:
  - Allow targeted ridge-line reinforcement and valley smoothing with strict bounds.
  - Introduce optional rain-catch diagnostics to cross-check river placement.

- ClimateLayer:
  - Split into BaselineBands and EarthlikeRefinement modules.
  - Parameterize wind vectors per latitude and allow hemispheric asymmetries/monsoon biases.

- BiomeLayer:
  - Make nudges data-driven and map-size aware.
  - Add local “regional identity” presets (e.g., savanna belts, steppe corridors) with hard caps.

- FeatureLayer:
  - Data-configurable density rules with biome/elevation/rainfall constraints and adjacency limits.

- PlacementLayer:
  - Pluggable wonder/resource policies; compatibility mode vs. experimental mixes.

- TelemetryLayer:
  - Structured event logging, per-pass timing, and tile-sample histograms.


## 11) Change Log (v1.1.0 — WIP)

- Size-aware “thumb on the scale” for larger maps:
  - Introduced a sqrt(area/base) scaler applied to motif lengths, band jitter, and low-probability edits so Huge maps form broader, continuous swaths instead of dotted noise.
- Fuller, more curved continents:
  - Slight reduction in effective water fraction on larger maps (within strict bounds).
  - Gentle curvature added to land bands to evoke long continental arcs while keeping true oceans.
- Climate Story (v0.1 — implemented end-to-end in pipeline)
  - Continental Margins: active vs. passive margin tagging; coast ruggedizing reads margins; passive shelves bias validated reefs.
  - Hotspot Trails: deep-ocean trail tagging; hotspot-aware island chains; paradise vs. volcanic classification; hotspot microclimates in rainfall refinement.
  - Rift Valleys: rift line + shoulders; narrow rift humidity boost; shoulder biome bias toward grassland/tropical where moist.
  - Orogeny Belts: windward/lee cache; small windward wetness boost; slightly stronger lee dryness; coupled swatch (mountainForests).
  - Climate Swatches: one weighted macro swatch per map with soft edges (macroDesertBelt, equatorialRainbelt, rainforestArchipelago, mountainForests, greatPlains).
  - Paleo‑Hydrology (initial): light overlays for deltas/oxbows/fossil channels affecting rainfall only; strict clamps and caps.
- Coasts and islands (lane‑safe refinements):
  - Margin-aware rugged coasts (slightly more bays/fjords on active segments).
  - Hotspot-biased island chains with strict spacing and deep-water placement.
- Features, margin/hotspot aware:
  - Paradise reefs near hotspot paradise centers; modest passive-shelf reef bias.
  - Volcanic vegetation near volcanic centers; gentle rainforest/forest/taiga density tweaks (validated).
- Developer logger:
  - Optional per-layer timings, StoryTags counts, and rainfall histograms (`maps/config/dev.js`).

Invariants retained:
- Rainfall clamped to [0, 200] at every step.
- No aggressive cliffs or heavy mountain amplification reintroduced.
- Feature placement remains gated by TerrainBuilder.canHaveFeature with data lookups.
- Open ocean lanes preserved; island/coast edits remain sparse.

## 11) Change Log (v1.0.0)

- Removed aggressive cliff systems to improve playability and performance.
- Scaled back experimental mountains/lakes; rely on base elevation/hills with curated rainfall/biome interplay.
- Implemented robust three-band landmass approach with per-row jitter and fractal wiggle.
- Added two-phase climate:
  - Baseline latitude band blending
  - Earthlike refinements (coastal/lake humidity, prevailing-wind rain shadows, river/basin greening)
- Biome corrections:
  - Tundra restraint at extreme latitude/elevation under low rainfall
  - Encourage tropical coasts near equator with high rainfall
  - Temperate river valleys trend grassland for corridor/playability
- Feature density tweaks behind engine validation (rainforest, forest, taiga).
- Wonders +1 vs. defaults; floodplains/snow/resources/discoveries via base systems.
- Start placement aligned with vanilla-compatible sector/continent bounds.


## 12) Acceptance Criteria Summary

- Oceans:
  - Distinct west/mid/east open oceans enabling naval strategies; island clusters avoid chokepoint spam.
- Regions:
  - Observable river-green corridors, drier rain-shadows, wet coastal fringes tapering inland.
- Biomes:
  - Equatorial tropical coasts when wet; restrained tundra; believable transitions at mid-lats.
- Balance:
  - Base systems preserved for mountains/hills/resources/wonders; modest, intentional nudges only.
- Performance:
  - Generation time acceptable on Huge; passes remain bounded and avoid heavy flood operations.


## 13) Modularization and Climate Story (v1.0.1+ Notes)

- Orchestrator entrypoint
  - `maps/epic-diverse-huge.js` acts as the orchestrator/entrypoint. It wires the pipeline and calls modular layers.
  - Engine hooks remain registered here for stability.

- Modular layers (current)
  - Landmass: `maps/layers/landmass.js` (`createDiverseLandmasses`)
  - Coastlines: `maps/layers/coastlines.js` (`addRuggedCoasts`)
  - Islands: `maps/layers/islands.js` (`addIslandChains`)
  - Climate — Baseline: `maps/layers/climate-baseline.js` (`buildEnhancedRainfall`)
  - Climate — Earthlike Refinements: `maps/layers/climate-refinement.js` (`refineRainfallEarthlike`)
  - Biomes: `maps/layers/biomes.js` (`designateEnhancedBiomes`)
  - Features: `maps/layers/features.js` (`addDiverseFeatures`)
  - Placement: `maps/layers/placement.js` (wonders, floodplains, snow, resources, starts, discoveries, fertility, advanced starts)

- Climate Story docs
  - Concept and guardrails: `climate-story/README.md`
  - First iteration spec (Hotspot Trails + Rift Valleys): `climate-story/HotspotTrails_and_RiftValleys.md`
  - Additional motifs roadmap (Margins, Orogeny, Paleo‑hydrology, Glacial): `climate-story/Roadmap_Additional_Motifs.md`
  - TL;DR quick-start for implementation: `climate-story/TLDR.md`

- Developer logger (optional; disabled by default)
  - Config and helpers: `maps/config/dev.js`
  - Toggles (set to true for a debug session, then revert):
    - `DEV.ENABLED`: master switch
    - `DEV.LOG_TIMING`: per-layer timing (use `timeStart/timeEnd` or `timeSection`)
    - `DEV.LOG_STORY_TAGS`: prints StoryTags counts (`logStoryTagsSummary`)
    - `DEV.RAINFALL_HISTOGRAM`: prints a coarse rainfall histogram over land (`logRainfallHistogram`)
  - These utilities are no-op when disabled and have negligible perf impact.

- Climate Story runtime integration (v0.1)
  - Tagging runs after coasts and before island seeding:
    - Hotspot trails and rift lines/shoulders (`story/tagging.js`, `story/tags.js`)
  - Hotspot-aware islands (paradise/volcanic) decorate offshore chains with minimal changes to lane openness.
  - Microclimates and features read tags later in the pipeline (refinements, biomes, features).

— End of DESIGN —
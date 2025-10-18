// @ts-nocheck
/**
 * JSDoc type definitions for Epic Diverse Huge Map Generator config.
 *
 * This file provides runtime-available type hints for IDE autocomplete.
 * For full TypeScript definitions, see map_config.d.ts (development only).
 * For validation schema, see map_config.schema.json
 *
 * Usage in map_config.js (JS with editor typings):
 *
 * @example
 * // @ts-check
 * // @type {import('./map_config.types.js').MapConfig}
 * export const MAP_CONFIG = Object.freeze({
 *   toggles: { STORY_ENABLE_HOTSPOTS: true },
 *   story: {},
 *   microclimate: {}
 * });
 */

/**
 * Master configuration object (top-level config consumed by the generator)
 * @typedef {Object} MapConfig
 * @property {Toggles} toggles - Master feature toggles to enable/disable major Climate Story systems
 * @property {Story} story - Parameters for narrative motifs (hotspots, rifts, orogeny, swatches, paleo)
 * @property {Microclimate} microclimate - Small microclimate tweaks (rainfall and feature chances) applied in refinement passes
 * @property {Corridors} [corridors] - Strategic corridors configuration (sea lanes, island-hop, land, river chains, kinds/styles)
 * @property {Landmass} [landmass] - Land vs. ocean balance and band shaping (size-aware curvature/jitter + band geometry presets)
 * @property {Coastlines} [coastlines] - Coast ruggedizing probabilities (bays/fjords), lane-safe guardrails
 * @property {Margins} [margins] - Continental margin tagging proportions (active vs. passive)
 * @property {Islands} [islands] - Offshore island cluster seeding and hotspot-biased placement
 * @property {ClimateBaseline} [climateBaseline] - Baseline rainfall blending with latitude bands and local bonuses
 * @property {ClimateRefine} [climateRefine] - Earthlike refinement (coastal gradient, orographic, rivers/basins)
 * @property {Biomes} [biomes] - Biome nudge thresholds for tundra restraint, tropical coasts, river valleys, rift shoulders
 * @property {FeaturesDensity} [featuresDensity] - Gentle, validated feature-density tweaks (rainforest, forest, taiga, shelf reefs)
 * @property {Placement} [placement] - Late-stage placement config (wonders +1, floodplains length)
 * @property {DevLogging} [dev] - Developer logging toggles (kept off for release)
 * @property {WorldModel} [worldModel] - Optional foundational Earth-model fields (plates, winds, currents, pressure, directionality, policy)
 */

/**
 * Feature toggles for major motifs/systems
 * @typedef {Object} Toggles
 * @property {boolean} STORY_ENABLE_HOTSPOTS - Enable deep-ocean hotspot trails and paradise/volcanic island classification
 * @property {boolean} STORY_ENABLE_RIFTS - Enable continental rift lines with shoulder humidity and biome bias
 * @property {boolean} STORY_ENABLE_OROGENY - Enable windward/lee amplification along mountain belts
 * @property {boolean} STORY_ENABLE_SWATCHES - Enable one weighted macro climate swatch (soft-edge rainfall deltas)
 * @property {boolean} STORY_ENABLE_PALEO - Enable paleo-hydrology overlays (deltas/oxbows/fossil channels; clamped)
 * @property {boolean} STORY_ENABLE_CORRIDORS - Enable strategic corridors (sea lanes, island-hop, land, river chains)
 * @property {boolean} [STORY_ENABLE_WORLDMODEL] - Enable world model fields (plates, winds, currents, pressure, policies)
 */

/**
 * Story (motif) tunables
 * @typedef {Object} Story
 * @property {Hotspot} [hotspot] - Deep-ocean hotspot trails (aligned chains far from coasts)
 * @property {Rift} [rift] - Continental rift lines (linear basins with narrow shoulder bands)
 * @property {Orogeny} [orogeny] - Orogeny belts (derive windward/lee flanks; apply small wet/dry deltas)
 * @property {Swatches} [swatches] - "Black swan" macro climate swatches (paint one guaranteed macro zone)
 * @property {PaleoHydrology} [paleo] - Paleo-hydrology overlays (humidity hints; optional canyon rim contrast)
 */

/**
 * Deep-ocean hotspot trails
 * @typedef {Object} Hotspot
 * @property {number} [maxTrails] - Absolute max trails per map (count; size-scaled internally)
 * @property {number} [steps] - Number of steps per trail (count; higher = longer trails)
 * @property {number} [stepLen] - Step length per trail step (tiles)
 * @property {number} [minDistFromLand] - Minimum distance required from land for trail points (tiles)
 * @property {number} [minTrailSeparation] - Minimum separation between distinct trails (tiles)
 * @property {number} [paradiseBias] - Relative weight for "paradise" center classification (unitless weight)
 * @property {number} [volcanicBias] - Relative weight for "volcanic" center classification (unitless weight)
 * @property {number} [volcanicPeakChance] - Chance a volcanic hotspot center becomes land (ratio 0..1)
 */

/**
 * Continental rift lines
 * @typedef {Object} Rift
 * @property {number} [maxRiftsPerMap] - Absolute cap on rifts per map (count; size-scaled internally)
 * @property {number} [lineSteps] - Steps marched per rift line (count; controls straight-line length)
 * @property {number} [stepLen] - Step length per rift step (tiles)
 * @property {number} [shoulderWidth] - Shoulder band width on each side of the rift (tiles)
 */

/**
 * Orogeny belts (windward/lee amplification)
 * @typedef {Object} Orogeny
 * @property {number} [beltMaxPerContinent] - Hard cap on belts per large continent (count)
 * @property {number} [beltMinLength] - Minimum length to consider a belt (tiles)
 * @property {number} [radius] - Radius for windward/lee flank effects (tiles)
 * @property {number} [windwardBoost] - Wetness boost on windward side (rainfall units; 0..200 scale clamp applies)
 * @property {number} [leeDrynessAmplifier] - Multiplier for lee-side dryness (unitless ratio; >=1)
 */

/**
 * Macro climate swatches
 * @typedef {Object} Swatches
 * @property {number} [maxPerMap] - Maximum swatches applied per map (count; typically 1)
 * @property {boolean} [forceAtLeastOne] - Ensure at least one swatch gets selected and applied
 * @property {Object} [sizeScaling] - Size-aware multipliers for width/length based on sqrt(map area) (unitless scalars)
 * @property {number} [sizeScaling.widthMulSqrt] - Multiplier applied to swatch width on larger maps (scalar)
 * @property {number} [sizeScaling.lengthMulSqrt] - Multiplier applied to swatch length on larger maps (scalar)
 * @property {Object} [types] - Per-kind configuration; known keys optional, additional swatch keys supported
 * @property {SwatchType} [types.macroDesertBelt] - Subtropical dryness band with soft falloff around ~20 degrees latitude
 * @property {SwatchType} [types.equatorialRainbelt] - Equatorial wetness belt with coastal bleed
 * @property {SwatchType} [types.rainforestArchipelago] - Tropics-only coastal/island wetness emphasis
 * @property {SwatchType} [types.mountainForests] - Windward forest bias and slight lee penalty near mountain belts
 * @property {SwatchType} [types.greatPlains] - Mid-lat lowland dryness bias (broad plains feel)
 */

/**
 * One swatch kind's tunables (fields used vary by kind)
 * @typedef {Object} SwatchType
 * @property {number} [weight] - Selection weight in the swatch lottery (unitless weight)
 * @property {number} [latitudeCenterDeg] - Latitude center (degrees) for banded swatches (deg)
 * @property {number} [halfWidthDeg] - Half-width around the center (degrees)
 * @property {number} [wetnessDelta] - Positive rainfall delta (rainfall units) to add within the swatch
 * @property {number} [drynessDelta] - Negative rainfall delta (rainfall units) to subtract within the swatch
 * @property {number} [dryDelta] - Alternative dryness delta used by some kinds (rainfall units)
 * @property {number} [lowlandMaxElevation] - Maximum elevation considered "lowland" (elevation units; engine scale)
 * @property {number} [islandBias] - Bias near coasts/islands (unitless scalar multiplier)
 * @property {number} [reefBias] - Slightly increases reef propensity in warm shallow zones (unitless scalar multiplier)
 * @property {boolean} [coupleToOrogeny] - Couple to orogeny windward/lee tags for more coherent patterns
 * @property {number} [windwardBonus] - Extra wetness on windward tiles (rainfall units)
 * @property {number} [leePenalty] - Small penalty on lee tiles (rainfall units)
 * @property {number} [bleedRadius] - Soft blending radius for swatch edges (tiles)
 */

/**
 * Paleo-hydrology overlays (subtle, clamped)
 * @typedef {Object} PaleoHydrology
 * @property {number} [maxDeltas] - Max river mouth deltas (count)
 * @property {number} [deltaFanRadius] - Landward fan radius around selected river mouths (tiles)
 * @property {number} [deltaMarshChance] - Chance that landward fan tiles become marsh (ratio 0..1; validated)
 * @property {number} [maxOxbows] - Max one-tile oxbows (count) in lowland meanders
 * @property {number} [oxbowElevationMax] - Elevation ceiling for oxbow candidates (elevation units)
 * @property {number} [maxFossilChannels] - Max fossil channels (count; short polylines in dry lowlands toward basins)
 * @property {number} [fossilChannelLengthTiles] - Fossil channel polyline length (tiles; before size scaling)
 * @property {number} [fossilChannelStep] - Step length between fossil channel points (tiles)
 * @property {number} [fossilChannelHumidity] - Humidity delta applied on fossil centerlines (rainfall units; clamped)
 * @property {number} [fossilChannelMinDistanceFromCurrentRivers] - Minimum distance from current rivers (tiles)
 * @property {number} [minDistanceFromStarts] - Minimum distance from starts for intrusive paleo effects (tiles)
 * @property {Object} [sizeScaling] - Size-aware scaling for fossil channel length (unitless scalar based on sqrt(area))
 * @property {number} [sizeScaling.lengthMulSqrt] - Length multiplier based on sqrt(map area) (scalar)
 * @property {Object} [elevationCarving] - Optional canyon rim contrast (very subtle)
 * @property {boolean} [elevationCarving.enableCanyonRim] - Whether to apply slight dryness on canyon floor and dampen rims
 * @property {number} [elevationCarving.rimWidth] - Rim width around fossil centerline (tiles)
 * @property {number} [elevationCarving.canyonDryBonus] - Extra dryness on canyon floor (rainfall units)
 * @property {number} [elevationCarving.bluffWetReduction] - Optional wetness reduction on bluffs (rainfall units)
 */

/**
 * Microclimate adjustments applied by refinement passes
 * @typedef {Object} Microclimate
 * @property {Object} [rainfall] - Rainfall adjustments
 * @property {number} [rainfall.riftBoost] - Narrow rift-line rainfall boost (rainfall units; clamped; applied near StoryTags.riftLine)
 * @property {number} [rainfall.riftRadius] - Radius around rift line for the boost (tiles)
 * @property {number} [rainfall.paradiseDelta] - Small wetness boost near "paradise" hotspots (rainfall units)
 * @property {number} [rainfall.volcanicDelta] - Small wetness boost near "volcanic" hotspots (rainfall units)
 * @property {Object} [features] - Feature adjustments
 * @property {number} [features.paradiseReefChance] - Percent chance for extra reefs near passive shelves (percent 0..100; validated)
 * @property {number} [features.volcanicForestChance] - Percent chance for extra forest near volcanic centers in warm/wet zones (percent 0..100; validated)
 * @property {number} [features.volcanicTaigaChance] - Percent chance for extra taiga near volcanic centers in cold/wet zones (percent 0..100; validated)
 */

/**
 * Landmass shaping
 * @typedef {Object} Landmass
 * @property {number} [baseWaterPercent] - Baseline global water percent used for fractal thresholding (percent 0..100)
 * @property {number} [waterThumbOnScale] - Gentle water adjustment applied with sqrt(area) scaler (percent points; negative reduces water on larger maps)
 * @property {number} [jitterAmpFracBase] - Base fraction of map width used for per-row sinusoidal jitter amplitude (ratio 0..1 of width)
 * @property {number} [jitterAmpFracScale] - Extra jitter fraction applied with size scaling (ratio 0..1 of width)
 * @property {number} [curveAmpFrac] - Curvature amplitude as fraction of width to bow bands into long arcs (ratio 0..1 of width)
 * @property {LandmassGeometry} [geometry] - Up-front band layout and ocean columns scaling (used before landmass carving)
 */

/**
 * Landmass geometry presets and band definitions
 * @typedef {Object} LandmassGeometry
 * @property {"bands"|"plates"|"auto"} [mode] - Layout mode: legacy three-band geometry, plate-driven layout, or automatic selection
 * @property {number} [oceanColumnsScale] - Scale applied to globals.g_OceanWaterColumns when computing base ocean widths (scalar multiplier)
 * @property {string} [preset] - Active preset name to mirror (string key into presets)
 * @property {Object.<string, {bands: ReadonlyArray<LandmassBand>}>} [presets] - Named presets mapping to band arrays (open set of presets)
 * @property {ReadonlyArray<LandmassBand>} [bands] - Three-band layout fallback (should mirror selected preset). Fractions are relative to map width (ratio 0..1).
 * @property {LandmassGeometryPost} [post] - Optional post-processing adjustments applied after deriving landmass windows
 */

/**
 * One continental band window and ocean offsets
 * @typedef {Object} LandmassBand
 * @property {number} westFrac - West bound as a fraction of map width (ratio 0..1)
 * @property {number} eastFrac - East bound as a fraction of map width (ratio 0..1)
 * @property {number} westOceanOffset - West ocean offset (+ scalar x iOceanWaterColumns to tiles)
 * @property {number} eastOceanOffset - East ocean offset (- scalar x iOceanWaterColumns to tiles)
 */

/**
 * Post-processing adjustments for derived landmass windows.
 * Values are applied after either preset bands or plate-derived windows are computed.
 * @typedef {Object} LandmassGeometryPost
 * @property {number} [expandTiles] - Expand each landmass west/east by this many tiles (applied before individual offsets)
 * @property {number} [expandWestTiles] - Additional west-side expansion per landmass (tiles)
 * @property {number} [expandEastTiles] - Additional east-side expansion per landmass (tiles)
 * @property {number} [clampWestMin] - Minimum west boundary allowed (tiles, 0-based)
 * @property {number} [clampEastMax] - Maximum east boundary allowed (tiles, inclusive)
 * @property {number} [overrideSouth] - Override south boundary for all landmasses (tiles)
 * @property {number} [overrideNorth] - Override north boundary for all landmasses (tiles)
 * @property {number} [minWidthTiles] - Ensure each landmass spans at least this many tiles horizontally (tiles)
 */

/**
 * Coastline ruggedizing (lane-safe)
 * @typedef {Object} Coastlines
 * @property {Object} [bay] - Bay configuration
 * @property {number} [bay.noiseGateAdd] - Additional widening of the noise gate for bay carving on larger maps (internal threshold units; scalar)
 * @property {number} [bay.rollDenActive] - Random denominator for bay rolls on ACTIVE margins (lower = more frequent; unitless denominator)
 * @property {number} [bay.rollDenDefault] - Random denominator for bay rolls elsewhere (lower = more frequent; unitless denominator)
 * @property {Object} [fjord] - Fjord configuration
 * @property {number} [fjord.baseDenom] - Base random denominator for fjord-like coast conversions (lower = more frequent; unitless denominator)
 * @property {number} [fjord.activeBonus] - Bias on ACTIVE margins (subtracts from denom; unitless additive bias)
 * @property {number} [fjord.passiveBonus] - Bias near PASSIVE shelves (subtracts from denom; unitless additive bias)
 * @property {number} [minSeaLaneWidth] - Documented minimum safe sea-lane width (tiles)
 */

/**
 * Continental margins tagging
 * @typedef {Object} Margins
 * @property {number} [activeFraction] - Target fraction of coastal land tagged as ACTIVE margin (ratio 0..1; size-aware cap applies)
 * @property {number} [passiveFraction] - Target fraction of coastal land tagged as PASSIVE shelf (ratio 0..1; size-aware cap applies)
 * @property {number} [minSegmentLength] - Minimum contiguous coastal segment length eligible (tiles)
 */

/**
 * Island chain placement
 * @typedef {Object} Islands
 * @property {number} [fractalThresholdPercent] - Fractal height threshold percent for island seeds (percent 0..100; sparse when high)
 * @property {number} [baseIslandDenNearActive] - Random denominator for island seeding near ACTIVE margins (lower = more frequent; unitless denominator)
 * @property {number} [baseIslandDenElse] - Random denominator elsewhere (lower = more frequent; unitless denominator)
 * @property {number} [hotspotSeedDenom] - Random denominator when on a hotspot trail point (lower = more frequent; unitless denominator)
 * @property {number} [clusterMax] - Max tiles in a small island cluster (tiles; total cluster size)
 * @property {number} [minDistFromLandRadius] - Minimum Chebyshev radius from existing land for island placement (tiles)
 */

/**
 * Strategic corridors (sea lanes, island-hop, land, river chains)
 * @typedef {Object} Corridors
 * @property {CorridorSea} [sea] - Open-water protected sea lanes
 * @property {CorridorIslandHop} [islandHop] - Hotspot-based island-hop arcs
 * @property {CorridorLand} [land] - Land open corridors (e.g., along rift shoulders)
 * @property {CorridorRiver} [river] - River-adjacent lowland chains seeded post-rivers
 * @property {CorridorPolicy} [policy] - Per-consumer policy strengths and behaviors
 * @property {CorridorKinds} [kinds] - Corridor kinds and styles (probabilities are gentle multipliers; consumers must validate). Known keys are provided in defaults; additional styles are allowed.
 */

/**
 * Sea lane corridor configuration
 * @typedef {Object} CorridorSea
 * @property {number} [maxLanes] - Max number of sea lanes to tag across the map (count)
 * @property {number} [minLengthFrac] - Minimum fraction of map span a lane must cover to qualify (ratio 0..1)
 * @property {number} [scanStride] - Sampling stride when scanning for lanes (tiles)
 * @property {number} [avoidRadius] - Radius to keep islands away from protected lanes (tiles)
 * @property {boolean} [preferDiagonals] - Whether to consider diagonal lanes in selection/scoring
 * @property {number} [laneSpacing] - Minimum spacing enforced between selected lanes (tiles)
 * @property {number} [minChannelWidth] - Minimum channel width measured orthogonal to the lane (tiles)
 */

/**
 * Island-hop corridor configuration
 * @typedef {Object} CorridorIslandHop
 * @property {boolean} [useHotspots] - Whether to promote hotspot trails into island-hop lanes
 * @property {number} [maxArcs] - Max number of promoted arcs (count)
 */

/**
 * Land corridor configuration
 * @typedef {Object} CorridorLand
 * @property {boolean} [useRiftShoulders] - Whether to derive land corridors from rift shoulders
 * @property {number} [maxCorridors] - Cap on distinct land-open corridors (count)
 * @property {number} [minRunLength] - Minimum contiguous shoulder run length eligible (tiles)
 * @property {number} [spacing] - Minimum spacing enforced between selected land corridor segments (tiles)
 */

/**
 * River corridor configuration
 * @typedef {Object} CorridorRiver
 * @property {number} [maxChains] - Max number of river chain corridors (count)
 * @property {number} [maxSteps] - Max greedy steps while following river-adjacent path (steps; ~tiles)
 * @property {number} [preferLowlandBelow] - Elevation threshold treated as lowland preference (elevation units)
 * @property {number} [coastSeedRadius] - Coast seed radius for initial river-adjacent seed near coast (tiles)
 * @property {number} [minTiles] - Minimum tiles that must be tagged for a chain to qualify (tiles)
 * @property {boolean} [mustEndNearCoast] - Require the chain to end near a coast or river mouth
 */

/**
 * Per-consumer policy strengths and behaviors for corridors
 * @typedef {Object} CorridorPolicy
 * @property {CorridorPolicySea} [sea] - Sea-lane policies (coastline/island interactions)
 * @property {CorridorPolicyLand} [land] - Land-open corridor policies (biome bias strength)
 * @property {CorridorPolicyRiver} [river] - River-chain corridor policies (biome bias strength)
 */

/**
 * Sea-lane policy
 * @typedef {Object} CorridorPolicySea
 * @property {"hard"|"soft"} [protection] - 'hard' = never edit on lanes; 'soft' = reduce chance instead of skip
 * @property {number} [softChanceMultiplier] - When protection is 'soft', multiply coast edit probabilities by this factor (ratio 0..1)
 */

/**
 * Land-open corridor policy
 * @typedef {Object} CorridorPolicyLand
 * @property {number} [biomesBiasStrength] - Scales grassland bias strength on land-open corridors (ratio 0..1)
 */

/**
 * River-chain corridor policy
 * @typedef {Object} CorridorPolicyRiver
 * @property {number} [biomesBiasStrength] - Scales grassland bias strength on river-chain corridors (ratio 0..1)
 */

/**
 * Corridor kinds/styles (open schema with known areas for sea/islandHop/land/river)
 * @typedef {Object} CorridorKinds
 * @property {Object} [sea] - Sea-lane kinds and styles
 * @property {Object.<string, CorridorStyle>} [sea.styles] - Mapping of style-name to style config
 * @property {Object} [islandHop] - Island-hop kinds and styles
 * @property {Object.<string, CorridorStyle>} [islandHop.styles] - Mapping of style-name to style config
 * @property {Object} [land] - Land corridor kinds and styles
 * @property {Object.<string, CorridorStyle>} [land.styles] - Mapping of style-name to style config
 * @property {Object} [river] - River corridor kinds and styles
 * @property {Object.<string, CorridorStyle>} [river.styles] - Mapping of style-name to style config
 */

/**
 * A generic corridor style configuration container
 * @typedef {Object} CorridorStyle
 * @property {Object.<string, number>} [biomes] - Biome mixture biases where values represent weights or fractions for biome tendencies. Values are unitless weights or ratios (0..1 typical). Keys are biome names as consumed by the layer.
 * @property {Object.<string, number>} [features] - Feature biases where numeric values represent probabilities (ratios 0..1) or multipliers (scalars). Example keys (not exhaustive): reefBias (scalar), floodplainBias (scalar), forestBias (scalar).
 * @property {Object.<string, number>} [edge] - Edge-shaping hints where numeric values are probabilities (ratios 0..1) or multipliers (scalars). Example keys (not exhaustive): cliffsChance (ratio), fjordChance (ratio), bayCarveMultiplier (scalar), shelfReefMultiplier (scalar), mountainRimChance (ratio), forestRimChance (ratio), hillRimChance (ratio), cliffChance (ratio), escarpmentChance (ratio).
 */

/**
 * Baseline rainfall and local bonuses
 * @typedef {Object} ClimateBaseline
 * @property {Object} [blend] - Blending configuration
 * @property {number} [blend.baseWeight] - Weight for engine base rainfall component (ratio 0..1; unitless)
 * @property {number} [blend.bandWeight] - Weight for latitude band target component (ratio 0..1; unitless)
 * @property {Object} [bands] - Latitude band targets
 * @property {number} [bands.deg0to10] - Target rainfall at absolute latitude 0-10 degrees (rainfall units; 0..200)
 * @property {number} [bands.deg10to20] - Target rainfall at absolute latitude 10-20 degrees (rainfall units; 0..200)
 * @property {number} [bands.deg20to35] - Target rainfall at absolute latitude 20-35 degrees (rainfall units; 0..200)
 * @property {number} [bands.deg35to55] - Target rainfall at absolute latitude 35-55 degrees (rainfall units; 0..200)
 * @property {number} [bands.deg55to70] - Target rainfall at absolute latitude 55-70 degrees (rainfall units; 0..200)
 * @property {number} [bands.deg70plus] - Target rainfall at absolute latitude 70+ degrees (rainfall units; 0..200)
 * @property {Object} [orographic] - Orographic bonuses
 * @property {number} [orographic.hi1Threshold] - First elevation threshold for mild orographic bonus (elevation units)
 * @property {number} [orographic.hi1Bonus] - Bonus applied when above first elevation threshold (rainfall units)
 * @property {number} [orographic.hi2Threshold] - Second elevation threshold for mild orographic bonus (elevation units)
 * @property {number} [orographic.hi2Bonus] - Bonus applied when above second elevation threshold (rainfall units)
 * @property {Object} [coastal] - Coastal bonuses
 * @property {number} [coastal.coastalLandBonus] - Bonus rainfall on coastal land tiles (rainfall units)
 * @property {number} [coastal.shallowAdjBonus] - Bonus rainfall when adjacent to shallow water (rainfall units)
 * @property {Object} [noise] - Rainfall noise/jitter
 * @property {number} [noise.baseSpanSmall] - Base +/-jitter span used on smaller maps (rainfall units)
 * @property {number} [noise.spanLargeScaleFactor] - Extra jitter span applied on larger maps (unitless scalar applied via sqrt(area))
 */

/**
 * Earthlike refinement parameters
 * @typedef {Object} ClimateRefine
 * @property {Object} [waterGradient] - Water gradient configuration
 * @property {number} [waterGradient.radius] - Max Chebyshev radius to search for nearest water (tiles)
 * @property {number} [waterGradient.perRingBonus] - Bonus per ring closer to water (rainfall units per ring)
 * @property {number} [waterGradient.lowlandBonus] - Additional bonus on low elevations (rainfall units)
 * @property {Object} [orographic] - Orographic configuration
 * @property {number} [orographic.steps] - Upwind scan distance for mountain/high-elevation barriers (steps approx tiles)
 * @property {number} [orographic.reductionBase] - Base rainfall reduction when upwind barrier exists (rainfall units)
 * @property {number} [orographic.reductionPerStep] - Additional reduction scaled by closeness of barrier (rainfall units per step)
 * @property {Object} [riverCorridor] - River corridor configuration
 * @property {number} [riverCorridor.lowlandAdjacencyBonus] - River-adjacent wetness bonus at low elevation (rainfall units)
 * @property {number} [riverCorridor.highlandAdjacencyBonus] - River-adjacent wetness bonus at higher elevation (rainfall units)
 * @property {Object} [lowBasin] - Low basin configuration
 * @property {number} [lowBasin.radius] - Neighborhood radius for detecting enclosed low basins (tiles)
 * @property {number} [lowBasin.delta] - Humidity bonus within enclosed low basins (rainfall units; lowlands only)
 */

/**
 * Biome nudge thresholds
 * @typedef {Object} Biomes
 * @property {Object} [tundra] - Tundra configuration
 * @property {number} [tundra.latMin] - Minimum absolute latitude for tundra restraint to apply (degrees)
 * @property {number} [tundra.elevMin] - Minimum elevation for tundra restraint to apply (elevation units)
 * @property {number} [tundra.rainMax] - Maximum rainfall for tundra to be retained (rainfall units)
 * @property {Object} [tropicalCoast] - Tropical coast configuration
 * @property {number} [tropicalCoast.latMax] - Maximum absolute latitude for equatorial tropical coast encouragement (degrees)
 * @property {number} [tropicalCoast.rainMin] - Minimum rainfall to trigger tropical bias on coasts (rainfall units)
 * @property {Object} [riverValleyGrassland] - River valley grassland configuration
 * @property {number} [riverValleyGrassland.latMax] - Maximum absolute latitude for temperate/warm river-valley grassland bias (degrees)
 * @property {number} [riverValleyGrassland.rainMin] - Minimum rainfall to trigger grassland bias in valleys (rainfall units)
 * @property {Object} [riftShoulder] - Rift shoulder configuration
 * @property {number} [riftShoulder.grasslandLatMax] - Max latitude for grassland bias on rift shoulders (degrees)
 * @property {number} [riftShoulder.grasslandRainMin] - Minimum rainfall for grassland bias on rift shoulders (rainfall units)
 * @property {number} [riftShoulder.tropicalLatMax] - Max latitude for tropical bias on rift shoulders (degrees)
 * @property {number} [riftShoulder.tropicalRainMin] - Minimum rainfall for tropical bias on rift shoulders (rainfall units)
 */

/**
 * Validated feature density tweaks
 * @typedef {Object} FeaturesDensity
 * @property {number} [rainforestExtraChance] - Percent chance for additional rainforest in very wet tropical zones (percent 0..100)
 * @property {number} [forestExtraChance] - Percent chance for additional forest in wetter temperate grasslands (percent 0..100)
 * @property {number} [taigaExtraChance] - Percent chance for additional taiga in cold lowlands (percent 0..100)
 * @property {number} [shelfReefMultiplier] - Multiplier applied to paradiseReefChance to derive passive-shelf reef chance (unitless scalar)
 */

/**
 * Late-stage placement
 * @typedef {Object} Placement
 * @property {boolean} [wondersPlusOne] - Whether to place +1 natural wonder vs. map default (compatibility)
 * @property {Object} [floodplains] - Floodplains segment lengths (tiles; min/max along river segments)
 * @property {number} [floodplains.minLength] - Minimum floodplain length (tiles)
 * @property {number} [floodplains.maxLength] - Maximum floodplain length (tiles)
 */

/**
 * Developer logging toggles (keep false for release)
 * @typedef {Object} DevLogging
 * @property {boolean} [enabled] - Master switch for dev logging
 * @property {boolean} [logTiming] - Log per-section timings
 * @property {boolean} [logStoryTags] - Log StoryTags summary counts
 * @property {boolean} [rainfallHistogram] - Log coarse rainfall histogram over land
 */

/**
 * Optional world model (Earth forces; lightweight, optional)
 * @typedef {Object} WorldModel
 * @property {boolean} [enabled] - Master switch for foundational Earth forces fields
 * @property {Object} [plates] - Plates (Voronoi plates + boundary types; drive rifts/orogeny/margins)
 * @property {number} [plates.count] - Plate count target (count)
 * @property {ReadonlyArray<number>} [plates.axisAngles] - Macro axes used to align plate trends (degrees)
 * @property {number} [plates.convergenceMix] - 0..1 fraction for convergent vs divergent balance (ratio 0..1)
 * @property {number} [plates.relaxationSteps] - Lloyd relaxation iterations when seeding plates (integer)
 * @property {number} [plates.seedJitter] - Tile jitter applied to plate seeds (tiles)
 * @property {number} [plates.interiorSmooth] - Smoothing steps for shield interiors (steps; iterations)
 * @property {number} [plates.plateRotationMultiple] - Multiplier for plate rotation influence when evaluating boundaries
 * @property {number} [plates.seedOffset] - Additional RNG offset applied before plate generation (integer)
 * @property {number} [plates.seedBase] - Optional explicit RNG seed; overrides engine seed when provided
 * @property {Object} [wind] - Global winds (zonal baseline + jet streams; used in refinement upwind checks)
 * @property {number} [wind.jetStreaks] - Number of jet streaks (count)
 * @property {number} [wind.jetStrength] - Jet streak relative strength (unitless scalar)
 * @property {number} [wind.variance] - Wind variance (ratio 0..1)
 * @property {number} [wind.coriolisZonalScale] - Coriolis scaling for zonal components (unitless scalar)
 * @property {Object} [currents] - Ocean currents (basin gyres + boundary currents; small humidity/coast effects)
 * @property {number} [currents.basinGyreCountMax] - Max basin gyre systems (count)
 * @property {number} [currents.westernBoundaryBias] - Western boundary current bias (unitless scalar)
 * @property {number} [currents.currentStrength] - Overall current strength (unitless scalar)
 * @property {Object} [pressure] - Mantle pressure (bumps/ridges; optional small influence on hills/relief)
 * @property {number} [pressure.bumps] - Number of pressure bumps (count)
 * @property {number} [pressure.amplitude] - Pressure amplitude (unitless scalar)
 * @property {number} [pressure.scale] - Pressure scale (unitless scalar)
 * @property {Object} [directionality] - Directionality (global cohesion and alignment controls for Earth forces)
 * @property {number} [directionality.cohesion] - Master cohesion dial; higher = stronger alignment between systems (ratio 0..1)
 * @property {Object} [directionality.primaryAxes] - Macro axes in degrees: bias plate motion, prevailing winds, and gyre/currents
 * @property {number} [directionality.primaryAxes.plateAxisDeg] - Macro plate motion axis (degrees)
 * @property {number} [directionality.primaryAxes.windBiasDeg] - Global wind bias offset (degrees)
 * @property {number} [directionality.primaryAxes.currentBiasDeg] - Global current gyre bias (degrees)
 * @property {Object} [directionality.interplay] - Interplay weights: how much one system aligns with another (ratio 0..1)
 * @property {number} [directionality.interplay.windsFollowPlates] - Jets and streaks align with plate axes (ratio 0..1)
 * @property {number} [directionality.interplay.currentsFollowWinds] - Surface currents track prevailing winds (ratio 0..1)
 * @property {number} [directionality.interplay.riftsFollowPlates] - Divergent rifts align with plate boundaries (ratio 0..1)
 * @property {number} [directionality.interplay.orogenyOpposesRifts] - Convergent uplift tends to oppose divergent directions (ratio 0..1)
 * @property {Object} [directionality.hemispheres] - Hemisphere options and seasonal asymmetry (future-facing)
 * @property {boolean} [directionality.hemispheres.southernFlip] - Flip sign conventions in S hemisphere for winds/currents bias
 * @property {number} [directionality.hemispheres.equatorBandDeg] - Symmetric behavior band around equator (degrees)
 * @property {number} [directionality.hemispheres.monsoonBias] - Seasonal asymmetry placeholder (ratio 0..1; conservative)
 * @property {Object} [directionality.variability] - Variability knobs to avoid rigid patterns while honoring directionality
 * @property {number} [directionality.variability.angleJitterDeg] - Random jitter around macro axes (degrees)
 * @property {number} [directionality.variability.magnitudeVariance] - Variance applied to vector magnitudes (ratio 0..1)
 * @property {number} [directionality.variability.seedOffset] - RNG stream offset dedicated to directionality (integer steps)
 * @property {Object} [policy] - Policy scalars for consumers (keep gentle; effects clamped/validated)
 * @property {number} [policy.windInfluence] - Scales wind use in refinement upwind barrier checks (unitless scalar)
 * @property {number} [policy.currentHumidityBias] - Scales coastal humidity tweak from currents (unitless scalar)
 * @property {number} [policy.boundaryFjordBias] - Scales fjord/bay bias near convergent boundaries (unitless scalar)
 * @property {number} [policy.shelfReefBias] - Scales passive-shelf reef bias (unitless scalar)
 * @property {Object} [policy.oceanSeparation] - Ocean separation policy (plate-aware; consumed by landmass/coast shaping)
 * @property {boolean} [policy.oceanSeparation.enabled] - Enable ocean separation biasing (flag)
 * @property {ReadonlyArray<ReadonlyArray<number>>} [policy.oceanSeparation.bandPairs] - Which continent band pairs to bias apart. Uses 0-based indices used by orchestrator. Example: [[0,1],[1,2]]
 * @property {number} [policy.oceanSeparation.baseSeparationTiles] - Base lateral push applied pre-coast expansion; positive widens oceans (tiles)
 * @property {number} [policy.oceanSeparation.boundaryClosenessMultiplier] - Multiplier scaling separation near high boundary closeness (ratio 0..2)
 * @property {number} [policy.oceanSeparation.maxPerRowDelta] - Maximum absolute separation delta per row to preserve sea lanes (tiles)
 * @property {boolean} [policy.oceanSeparation.respectSeaLanes] - Respect strategic sea lanes and enforce minimum channel width
 * @property {number} [policy.oceanSeparation.minChannelWidth] - Minimum channel width to preserve when separating (tiles)
 * @property {Object} [policy.oceanSeparation.edgeWest] - Optional outer-edge ocean widening/narrowing (west map edge)
 * @property {boolean} [policy.oceanSeparation.edgeWest.enabled] - Enable west-edge override
 * @property {number} [policy.oceanSeparation.edgeWest.baseTiles] - Base lateral tiles at west edge (tiles)
 * @property {number} [policy.oceanSeparation.edgeWest.boundaryClosenessMultiplier] - Boundary-closeness multiplier (ratio; unitless)
 * @property {number} [policy.oceanSeparation.edgeWest.maxPerRowDelta] - Max per-row delta (tiles)
 * @property {Object} [policy.oceanSeparation.edgeEast] - Optional outer-edge ocean widening/narrowing (east map edge)
 * @property {boolean} [policy.oceanSeparation.edgeEast.enabled] - Enable east-edge override
 * @property {number} [policy.oceanSeparation.edgeEast.baseTiles] - Base lateral tiles at east edge (tiles)
 * @property {number} [policy.oceanSeparation.edgeEast.boundaryClosenessMultiplier] - Boundary-closeness multiplier (ratio; unitless)
 * @property {number} [policy.oceanSeparation.edgeEast.maxPerRowDelta] - Max per-row delta (tiles)
 */

// Export empty object to make this a proper ES module
export {};

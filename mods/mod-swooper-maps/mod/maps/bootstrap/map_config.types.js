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
 * Master configuration object controlling all map generation layers.
 *
 * Generation pipeline: Foundation (plates/winds) → Landmass → Climate → Biomes → Features
 *
 * @typedef {Object} MapConfig
 * @property {Toggles} toggles - Enable/disable major systems (hotspots, rifts, orogeny, swatches, corridors)
 * @property {Story} story - Narrative elements creating distinctive terrain features (volcanic trails, rift valleys, mountain rain shadows)
 * @property {Microclimate} microclimate - Fine-tuned rainfall and feature bonuses near story elements (rift lines, hotspot centers)
 * @property {Climate} [climate] - Aggregated climate configuration (baseline/refine/swatches)
 * @property {Corridors} [corridors] - Protected travel routes (sea lanes, island chains, land corridors, river valleys) that remain unobstructed
 * @property {Landmass} [landmass] - Continental layout: water percentage, band geometry, curvature/jitter, plate-driven vs preset modes
 * @property {Coastlines} [coastlines] - Coast ruggedization: bay/fjord probabilities, active vs passive margin effects
 * @property {Margins} [margins] - Tectonic margin types: convergent (mountains, subduction) vs divergent (rifts, spreading)
 * @property {Islands} [islands] - Offshore island generation: fractal thresholds, hotspot biasing, cluster distribution
 * @property {Mountains} [mountains] - Mountain and hill placement weights: WorldModel uplift, boundary biasing, foothill distribution
 * @property {Volcanoes} [volcanoes] - Volcano placement controls: convergent arc bias, hotspot allowance, spacing
 * @property {Biomes} [biomes] - Biome assignment rules: tundra limits, tropical coast preferences, river grasslands, rift shoulders
 * @property {FeaturesDensity} [featuresDensity] - Feature density: rainforest, forest, taiga prevalence, coral reef placement
 * @property {Placement} [placement] - Final placement: natural wonder counts, floodplain river lengths
 * @property {DevLogging} [dev] - Debug logging: timing stats, story tag counts, rainfall distribution histograms
 * @property {FoundationConfig} [foundation] - Unified world foundation configuration (seed, plates, dynamics, surface, policy)
 * @property {StageManifest} [stageManifest] - Pipeline manifest describing stage order, enablement, and inter-stage dependencies
 * @property {StageConfigProviders} [stageConfig] - Metadata indicating which stages a preset or entry supplies configuration for
 */

/**
 * Known stage identifiers for the bootstrap manifest.
 *
 * Stage names mirror the major passes in map_orchestrator.js; use them to
 * express dependencies. Adding a new stage requires updating this union.
 *
* @typedef {"foundation" | "landmassPlates" | "coastlines" | "storySeed" | "storyHotspots" | "storyRifts" | "storyOrogeny" | "storyPaleo" | "storyCorridorsPre" | "islands" | "mountains" | "volcanoes" | "lakes" | "climateBaseline" | "storySwatches" | "rivers" | "storyCorridorsPost" | "climateRefine" | "biomes" | "features" | "placement"} StageName
 */

/**
 * Stage descriptor containing enablement and dependency metadata.
 *
 * @typedef {Object} StageDescriptor
 * @property {boolean} [enabled] - Explicit enable/disable flag (defaults to true when omitted)
 * @property {ReadonlyArray<StageName>} [requires] - Hard prerequisites that must execute (and remain enabled) first
 * @property {ReadonlyArray<StageName>} [provides] - Data surfaces emitted by the stage (documentation only)
 * @property {ReadonlyArray<string>} [legacyToggles] - Legacy toggle keys mirrored from the new manifest state
 * @property {string} [blockedBy] - Resolved reason for automatic disablement (populated by resolver diagnostics)
 */

/**
 * Stage manifest describing execution order and dependency graph for the generator.
 *
 * @typedef {Object} StageManifest
 * @property {ReadonlyArray<StageName>} order - Ordered list of stages to execute (duplicates removed during normalization)
 * @property {Record<StageName, StageDescriptor>} stages - Descriptor metadata keyed by stage identifier
 */

/**
 * Stage configuration providers metadata (used for diagnostics).
 * Keys are stage identifiers and values indicate whether overrides target that stage.
 *
 * @typedef {Object.<StageName, boolean>} StageConfigProviders
 */

/**
 * Plate tensors emitted by the foundation stage.
 *
 * @typedef {Object} FoundationPlateFields
 * @property {Int16Array} id - Plate identifier per tile
 * @property {Uint8Array} boundaryCloseness - Distance-to-boundary metric (0 = on boundary)
 * @property {Uint8Array} boundaryType - Encoded boundary type (convergent/divergent/transform)
 * @property {Uint8Array} tectonicStress - Aggregate stress magnitude per tile
 * @property {Uint8Array} upliftPotential - Mountain uplift weighting per tile
 * @property {Uint8Array} riftPotential - Rift weighting per tile
 * @property {Uint8Array} shieldStability - Continental interior stability per tile
 * @property {Int8Array} movementU - Horizontal plate motion component
 * @property {Int8Array} movementV - Vertical plate motion component
 * @property {Int8Array} rotation - Plate rotation scalar
 */

/**
 * Atmospheric and oceanic tensors emitted by the foundation stage.
 *
 * @typedef {Object} FoundationDynamicsFields
 * @property {Int8Array} windU - Zonal wind component per tile
 * @property {Int8Array} windV - Meridional wind component per tile
 * @property {Int8Array} currentU - Zonal ocean current component per tile
 * @property {Int8Array} currentV - Meridional ocean current component per tile
 * @property {Uint8Array} pressure - Mantle pressure field per tile
 */

/**
 * Diagnostics payload bundled with the foundation context.
 *
 * @typedef {Object} FoundationDiagnosticsFields
 * @property {any|null} boundaryTree - Spatial index for boundary queries
 */

/**
 * Immutable runtime snapshot emitted by the `foundation` stage.
 *
 * @typedef {Object} FoundationContext
 * @property {{ width: number, height: number, size: number }} dimensions - Map dimensions baked into the tensors
 * @property {Readonly<any>|null} plateSeed - Captured Voronoi seed bundle used for deterministic replay
 * @property {FoundationPlateFields} plates - Plate/boundary tensors shared across stages
 * @property {FoundationDynamicsFields} dynamics - Wind, current, and mantle pressure tensors
 * @property {FoundationDiagnosticsFields} diagnostics - Supplemental diagnostics (kd-tree, metadata)
 * @property {{
 *   seed: FoundationSeedConfig,
 *   plates: FoundationPlatesConfig,
 *   dynamics: FoundationDynamicsConfig,
 *   surface: FoundationSurfaceConfig,
 *   policy: FoundationPolicyConfig,
 *   diagnostics: FoundationDiagnosticsConfig,
 * }} config - Normalized configuration snapshot associated with the tensors
 */

/**
 * Feature toggles for major narrative and simulation systems.
 *
 * @typedef {Object} Toggles
 * @property {boolean} STORY_ENABLE_HOTSPOTS - Volcanic island chains (like Hawaii) formed as plates move over mantle plumes
 * @property {boolean} STORY_ENABLE_RIFTS - Continental rift valleys (like East African Rift) with humid shoulders and grassland bias
 * @property {boolean} STORY_ENABLE_OROGENY - Mountain rain shadows: wet windward slopes, dry leeward deserts (orographic effect)
 * @property {boolean} STORY_ENABLE_SWATCHES - Guaranteed macro-climate zones (e.g., Sahara-like desert belt, Congo/Amazon rainbelt)
 * @property {boolean} STORY_ENABLE_PALEO - Ancient river features: fossil channels in deserts, oxbow lakes, delta wetlands
 * @property {boolean} STORY_ENABLE_CORRIDORS - Protected routes for strategic gameplay (sea lanes, island chains, river valleys)
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
 * Deep-ocean hotspot trails (volcanic island chains).
 *
 * Simulates stationary mantle plumes creating linear archipelagos as tectonic plates drift overhead.
 * Think Hawaiian Islands: older islands to the northwest, active volcano in the southeast.
 *
 * @typedef {Object} Hotspot
 * @property {number} [maxTrails] - Maximum trails per map; fewer = more isolated chains (typically 2-5)
 * @property {number} [steps] - Chain length in steps; higher = longer trails like Hawaii (typically 8-15)
 * @property {number} [stepLen] - Spacing between islands in tiles (typically 3-6)
 * @property {number} [minDistFromLand] - Keep trails in deep ocean, away from continents in tiles (typically 15+)
 * @property {number} [minTrailSeparation] - Minimum distance between different chains in tiles (typically 25+)
 * @property {number} [paradiseBias] - Weight for tropical paradise centers (lush, high humidity, reefs)
 * @property {number} [volcanicBias] - Weight for volcanic centers (active, dramatic terrain, geothermal)
 * @property {number} [volcanicPeakChance] - Probability volcanic centers become land vs staying underwater (0..1, typically 0.3-0.7)
 */

/**
 * Continental rift lines (tectonic valleys where plates pull apart).
 *
 * Creates linear depressions like the East African Rift Valley or the Rio Grande Rift.
 * Rift shoulders receive extra humidity and grassland bias, while the valley floor may be drier.
 *
 * @typedef {Object} Rift
 * @property {number} [maxRiftsPerMap] - Maximum rifts on the map; 1-2 typical, 3+ creates heavily fractured continents
 * @property {number} [lineSteps] - Length of rift in steps; higher = longer valleys (typically 15-30)
 * @property {number} [stepLen] - Distance per step in tiles; controls rift straightness (typically 2-4)
 * @property {number} [shoulderWidth] - Width of elevated shoulders on each side receiving humidity bonus (typically 2-5 tiles)
 */

/**
 * Orogeny belts (mountain-building zones with rain shadow effects).
 *
 * Orographic effect: mountains force air upward, causing rainfall on the windward (upwind) side.
 * Air descends on the leeward (downwind) side, creating rain shadows (deserts).
 * Example: Sierra Nevada (wet west, dry east), Himalayas (wet south, dry Gobi Desert north).
 *
 * @typedef {Object} Orogeny
 * @property {number} [beltMaxPerContinent] - Maximum mountain belts per continent (typically 1-3)
 * @property {number} [beltMinLength] - Minimum tiles for a mountain range to qualify (typically 10-20)
 * @property {number} [radius] - Distance from mountains to apply rain shadow effect (typically 3-8 tiles)
 * @property {number} [windwardBoost] - Extra rainfall on upwind side in rainfall units (typically 10-30, max 200)
 * @property {number} [leeDrynessAmplifier] - Drying multiplier for downwind side; 1.5 = 50% drier (typically 1.2-2.0)
 */

/**
 * Macro climate swatches (guaranteed major climate features).
 *
 * Each map gets ONE guaranteed macro-climate zone to create distinctive character.
 * These override normal patterns to ensure interesting gameplay variety.
 *
 * @typedef {Object} Swatches
 * @property {number} [maxPerMap] - Maximum swatches per map; typically 1 to avoid competing features
 * @property {boolean} [forceAtLeastOne] - Guarantee at least one swatch is applied (recommended: true)
 * @property {Object} [sizeScaling] - Scale swatch dimensions with map size
 * @property {number} [sizeScaling.widthMulSqrt] - Width scaling for larger maps (typically 1.0-1.5)
 * @property {number} [sizeScaling.lengthMulSqrt] - Length scaling for larger maps (typically 1.0-1.5)
 * @property {Object} [types] - Available swatch types and their weights
 * @property {SwatchType} [types.macroDesertBelt] - Sahara/Kalahari-like subtropical desert band at ~20-30° latitude
 * @property {SwatchType} [types.equatorialRainbelt] - Congo/Amazon-like equatorial rainforest belt with high humidity
 * @property {SwatchType} [types.rainforestArchipelago] - Southeast Asia-style tropical island rainforests with coral reefs
 * @property {SwatchType} [types.mountainForests] - Alpine/Himalayan-style wet forests on windward mountain slopes
 * @property {SwatchType} [types.greatPlains] - Central Asia/American Great Plains-style continental grasslands/steppes
 */

/**
 * Individual swatch type configuration (fields vary by swatch kind).
 *
 * Each swatch type has different parameters depending on whether it's a latitude band
 * (desert belt, rainbelt), geographic feature (archipelago), or terrain type (plains, mountains).
 *
 * @typedef {Object} SwatchType
 * @property {number} [weight] - Lottery weight for selection; higher = more likely to be chosen (typically 1-10)
 * @property {number} [latitudeCenterDeg] - Center latitude for banded swatches; e.g., 25° for subtropical deserts (degrees)
 * @property {number} [halfWidthDeg] - Band half-width from center; wider = more spread (typically 5-15 degrees)
 * @property {number} [wetnessDelta] - Rainfall increase within swatch zone (typically 20-50 units for rainbelts)
 * @property {number} [drynessDelta] - Rainfall decrease within swatch zone (typically -20 to -40 units for desert belts)
 * @property {number} [dryDelta] - Alternative dryness parameter used by some swatches (units)
 * @property {number} [lowlandMaxElevation] - Elevation ceiling for "lowland" designation; plains swatches ignore highlands (typically 30-50)
 * @property {number} [islandBias] - Strength multiplier near coasts/islands for archipelago swatches (typically 1.0-2.5)
 * @property {number} [reefBias] - Coral reef probability multiplier in warm shallows (typically 1.0-2.0)
 * @property {boolean} [coupleToOrogeny] - Link to mountain rain shadow system for coherent wind patterns
 * @property {number} [windwardBonus] - Extra rainfall on windward mountain slopes (typically 10-25 units)
 * @property {number} [leePenalty] - Rainfall reduction on leeward mountain slopes (typically 5-15 units)
 * @property {number} [bleedRadius] - Edge softening distance for gradual transitions (typically 5-12 tiles)
 */

/**
 * Paleo-hydrology overlays (ancient water features that no longer flow).
 *
 * Adds traces of past hydrological activity: dried riverbeds in deserts, oxbow lakes from ancient
 * meanders, wetland deltas. These features add historical depth and subtle humidity/resource bonuses.
 * Think: Australian dry lakes, Saharan wadis, abandoned Mississippi oxbows.
 *
 * @typedef {Object} PaleoHydrology
 * @property {number} [maxDeltas] - Maximum river deltas to create (wetland fans at river mouths; typically 2-5)
 * @property {number} [deltaFanRadius] - Size of delta wetland spread inland from river mouth (typically 3-6 tiles)
 * @property {number} [deltaMarshChance] - Probability delta tiles become marshland (0..1, typically 0.4-0.7)
 * @property {number} [maxOxbows] - Maximum oxbow lakes (isolated crescent lakes from old meanders; typically 3-8)
 * @property {number} [oxbowElevationMax] - Only create oxbows in lowlands below this elevation (typically 30-50)
 * @property {number} [maxFossilChannels] - Maximum fossil riverbeds (dry channels in deserts; typically 2-6)
 * @property {number} [fossilChannelLengthTiles] - Length of each fossil channel before scaling (typically 15-30 tiles)
 * @property {number} [fossilChannelStep] - Spacing between channel points; lower = more sinuous (typically 2-4)
 * @property {number} [fossilChannelHumidity] - Small humidity bonus along dry channels (typically 5-15 units)
 * @property {number} [fossilChannelMinDistanceFromCurrentRivers] - Keep fossil channels away from active rivers (typically 10+ tiles)
 * @property {number} [minDistanceFromStarts] - Keep paleo features away from player starts for fairness (typically 15+ tiles)
 * @property {Object} [sizeScaling] - Size-aware scaling for fossil channel length (unitless scalar based on sqrt(area))
 * @property {number} [sizeScaling.lengthMulSqrt] - Length multiplier based on sqrt(map area) (scalar)
 * @property {Object} [elevationCarving] - Optional canyon rim contrast (very subtle)
 * @property {boolean} [elevationCarving.enableCanyonRim] - Whether to apply slight dryness on canyon floor and dampen rims
 * @property {number} [elevationCarving.rimWidth] - Rim width around fossil centerline (tiles)
 * @property {number} [elevationCarving.canyonDryBonus] - Extra dryness on canyon floor (rainfall units)
 * @property {number} [elevationCarving.bluffWetReduction] - Optional wetness reduction on bluffs (rainfall units)
 */

/**
 * Microclimate adjustments near story elements (localized bonuses).
 *
 * Applies targeted rainfall and feature bonuses around narrative features like rifts and hotspots.
 * These create distinctive local environments: lush rift valleys, tropical paradise islands,
 * forested volcanic slopes. Subtle but noticeable effects that reward exploration.
 *
 * @typedef {Object} Microclimate
 * @property {Object} [rainfall] - Localized rainfall adjustments
 * @property {number} [rainfall.riftBoost] - Humidity bonus along rift valley shoulders (typically 15-30 units)
 * @property {number} [rainfall.riftRadius] - Distance from rift centerline to apply boost (typically 2-5 tiles)
 * @property {number} [rainfall.paradiseDelta] - Humidity bonus near tropical paradise hotspots (typically 10-20 units)
 * @property {number} [rainfall.volcanicDelta] - Humidity bonus near volcanic hotspots from geothermal moisture (typically 8-15 units)
 * @property {Object} [features] - Localized feature bonuses
 * @property {number} [features.paradiseReefChance] - Extra coral reef probability near paradise islands (percent 0..100, typically 30-60%)
 * @property {number} [features.volcanicForestChance] - Extra forest near volcanic slopes in warm climates (percent 0..100, typically 25-50%)
 * @property {number} [features.volcanicTaigaChance] - Extra coniferous forest near volcanoes in cold climates (percent 0..100, typically 20-40%)
 */

/**
 * Landmass shaping (continental size, shape, and curvature).
 *
 * Controls the land/water ratio and how continents are shaped via fractal noise, jitter, and curvature.
 * Water percentage: 60-65% = Earth-like, 70-75% = archipelago world, 50-55% = Pangaea-like.
 *
 * @typedef {Object} Landmass
 * @property {number} [baseWaterPercent] - Target water coverage; 65 = Earth-like, 75 = island world (percent 0..100, typically 55-75)
 * @property {number} [waterThumbOnScale] - Water adjustment on larger maps; negative = less water (typically -5 to +5)
 * @property {number} [jitterAmpFracBase] - Base coastline waviness as fraction of width; higher = more irregular (typically 0.02-0.08)
 * @property {number} [jitterAmpFracScale] - Extra jitter on larger maps (typically 0.01-0.04)
 * @property {number} [curveAmpFrac] - Continental bowing/curvature; higher = more crescent-shaped landmasses (typically 0.1-0.3)
 * @property {LandmassGeometry} [geometry] - Post-processing adjustments applied after plate-driven layout
 */

/**
 * Landmass geometry post-processing.
 *
 * Provides fine-grained adjustments applied after the plate-driven landmask is computed.
 *
 * @typedef {Object} LandmassGeometry
 * @property {LandmassGeometryPost} [post] - Fine-tuning adjustments applied after initial layout
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
 * Coastline ruggedization (creates natural, irregular coasts).
 *
 * Transforms smooth generated coastlines into realistic features like bays and fjords.
 * Active margins get more dramatic features (fjords, cliffs), passive margins get gentler ones.
 * Respects strategic corridors to avoid blocking sea lanes.
 *
 * @typedef {Object} Coastlines
 * @property {Object} [bay] - Bay configuration (gentle coastal indentations)
 * @property {number} [bay.noiseGateAdd] - Extra noise threshold on larger maps; higher = fewer/larger bays (typically 0-3)
 * @property {number} [bay.rollDenActive] - Bay frequency on active margins; lower = more bays (typically 8-15)
 * @property {number} [bay.rollDenDefault] - Bay frequency elsewhere; lower = more bays (typically 12-20)
 * @property {Object} [fjord] - Fjord configuration (deep, narrow inlets like Norway/New Zealand)
 * @property {number} [fjord.baseDenom] - Base fjord frequency; lower = more fjords (typically 15-25)
 * @property {number} [fjord.activeBonus] - Extra fjords on active margins (converging plates); subtracts from baseDenom (typically 3-8)
 * @property {number} [fjord.passiveBonus] - Fjords near passive shelves; subtracts from baseDenom (typically 0-2)
 * @property {number} [minSeaLaneWidth] - Minimum channel width to preserve for naval passage (typically 3-6 tiles)
 * @property {CoastlinePlateBias} [plateBias] - Plate-aware weighting for bay/fjord odds based on boundary closeness
 */

/**
 * Plate-aware coastline weighting (optional).
 *
 * Provides continuous control over how plate-boundary closeness and boundary type
 * influence bay and fjord chances. Positive values make denominators smaller
 * (more edits); negative values make them larger (fewer edits).
 *
 * @typedef {Object} CoastlinePlateBias
 * @property {number} [threshold] - Normalized plate-boundary closeness threshold (0..1) where influence starts (default 0.45)
 * @property {number} [power] - Exponent shaping how quickly influence ramps after the threshold (default 1.25)
 * @property {number} [convergent] - Multiplier for convergent boundaries (default 1.0)
 * @property {number} [transform] - Multiplier for transform boundaries (default 0.4)
 * @property {number} [divergent] - Multiplier for divergent boundaries (negative to reduce edits, default -0.6)
 * @property {number} [interior] - Residual influence for interior coasts (default 0)
 * @property {number} [bayWeight] - Strength applied to bay denominators (default 0.35)
 * @property {number} [bayNoiseBonus] - Extra noise gate reduction when bias is positive (default 1.0)
 * @property {number} [fjordWeight] - Strength applied to fjord denominators (default 0.8)
 */

/**
 * Continental margins tagging (tectonic boundary classification).
 *
 * ACTIVE margins: Convergent plate boundaries with subduction, volcanism, mountains, fjords, earthquakes.
 *   Examples: Pacific Ring of Fire (Andes, Japan, Cascades), steep/dramatic coasts.
 *
 * PASSIVE margins: Divergent or stable boundaries with wide continental shelves, gentle slopes, coral reefs.
 *   Examples: US Atlantic coast, most of Africa, broad coastal plains.
 *
 * @typedef {Object} Margins
 * @property {number} [activeFraction] - Fraction of coasts as active margins; higher = more mountainous/volcanic coasts (typically 0.2-0.4)
 * @property {number} [passiveFraction] - Fraction of coasts as passive shelves; higher = more gentle/reef coasts (typically 0.3-0.5)
 * @property {number} [minSegmentLength] - Minimum coastal stretch length to classify as a margin type (typically 8-15 tiles)
 */

/**
 * Island chain placement (offshore archipelagos and volcanic islands).
 *
 * Uses fractal noise to seed islands in appropriate locations. Lower fractal threshold = more islands.
 * Active margins (like Japan, Philippines) get more volcanic islands than passive margins.
 * Hotspot trails automatically bias toward island formation (like Hawaii, Galapagos).
 *
 * @typedef {Object} Islands
 * @property {number} [fractalThresholdPercent] - Noise cutoff for island seeds; higher = fewer islands (typically 75-90 for sparse, 60-75 for moderate)
 * @property {number} [baseIslandDenNearActive] - Island frequency near active margins; lower = more islands (typically 6-12)
 * @property {number} [baseIslandDenElse] - Island frequency elsewhere; lower = more islands (typically 15-30)
 * @property {number} [hotspotSeedDenom] - Island frequency on hotspot trails; lower = more islands (typically 3-8)
 * @property {number} [clusterMax] - Maximum tiles per island cluster; creates small archipelagos (typically 3-8 tiles)
 * @property {number} [minDistFromLandRadius] - Minimum spacing from continents; prevents coastal clutter (typically 4-8 tiles)
 */

/**
 * Strategic corridors (protected travel routes for gameplay).
 *
 * Identifies and preserves key routes that should remain passable and unobstructed.
 * Prevents map generation from accidentally creating chokepoints or blocked passages.
 * Useful for ensuring naval mobility, island hopping chains, and cross-continent land routes.
 *
 * @typedef {Object} Corridors
 * @property {CorridorSea} [sea] - Open-water naval lanes (e.g., trans-oceanic shipping routes)
 * @property {CorridorIslandHop} [islandHop] - Island-hopping chains along hotspot trails (e.g., Polynesian triangle)
 * @property {CorridorLand} [land] - Overland corridors through rift valleys or grassland belts
 * @property {CorridorRiver} [river] - River valley routes connecting coasts through lowlands
 * @property {CorridorPolicy} [policy] - How strictly to enforce corridor protection (hard vs soft blocking)
 * @property {CorridorKinds} [kinds] - Biome and feature preferences within corridor zones
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
 * Aggregated climate configuration grouping baseline, refinement, and macro swatch knobs.
 * @typedef {Object} Climate
 * @property {ClimateBaseline} [baseline]
 * @property {ClimateRefine} [refine]
 * @property {Swatches} [swatches]
 */

/**
 * Baseline rainfall and local bonuses.
 *
 * Establishes fundamental rainfall distribution based on latitude (distance from equator).
 * Mimics Earth's climate zones: wet tropics, dry subtropics, temperate mid-latitudes, cold poles.
 *
 * @typedef {Object} ClimateBaseline
 * @property {Object} [blend] - How to mix engine default rainfall with latitude-based targets
 * @property {number} [blend.baseWeight] - Weight for engine's base rainfall (0..1; typically 0.5-0.7)
 * @property {number} [blend.bandWeight] - Weight for latitude band targets (0..1; typically 0.3-0.5)
 * @property {Object} [bands] - Rainfall targets by latitude zone (units 0..200)
 * @property {number} [bands.deg0to10] - Equatorial zone (rainforests, monsoons; typically 110-130)
 * @property {number} [bands.deg10to20] - Tropical zone (wet but variable; typically 90-110)
 * @property {number} [bands.deg20to35] - Subtropical zone (deserts, Mediterranean; typically 60-80)
 * @property {number} [bands.deg35to55] - Temperate zone (moderate rainfall; typically 70-90)
 * @property {number} [bands.deg55to70] - Subpolar zone (cool, moderate moisture; typically 55-70)
 * @property {number} [bands.deg70plus] - Polar zone (cold deserts, ice; typically 40-50)
 * @property {Object} [orographic] - Orographic lift bonuses (mountains force air upward, causing condensation and rain)
 * @property {number} [orographic.hi1Threshold] - Elevation for modest rain increase (hills get some extra moisture)
 * @property {number} [orographic.hi1Bonus] - Rainfall bonus at first threshold in units (typically 5-15)
 * @property {number} [orographic.hi2Threshold] - Elevation for strong rain increase (mountains get significant moisture)
 * @property {number} [orographic.hi2Bonus] - Rainfall bonus at second threshold in units (typically 10-25)
 * @property {Object} [coastal] - Coastal bonuses
 * @property {number} [coastal.coastalLandBonus] - Bonus rainfall on coastal land tiles (rainfall units)
 * @property {number} [coastal.shallowAdjBonus] - Bonus rainfall when adjacent to shallow water (rainfall units)
 * @property {Object} [noise] - Rainfall noise/jitter
 * @property {number} [noise.baseSpanSmall] - Base +/-jitter span used on smaller maps (rainfall units)
 * @property {number} [noise.spanLargeScaleFactor] - Extra jitter span applied on larger maps (unitless scalar applied via sqrt(area))
 */

/**
 * Earthlike refinement parameters (realistic climate adjustments).
 *
 * Adds physically motivated climate effects on top of baseline latitude patterns:
 * - Continental effect: interiors are drier than coasts
 * - Rain shadows: mountains block moisture from reaching leeward areas
 * - River corridors: valleys retain moisture and support greenery
 * - Enclosed basins: low areas trap humidity
 *
 * @typedef {Object} ClimateRefine
 * @property {Object} [waterGradient] - Continental effect (distance from ocean impacts humidity)
 * @property {number} [waterGradient.radius] - How far inland to measure water proximity (typically 8-15 tiles)
 * @property {number} [waterGradient.perRingBonus] - Humidity per tile closer to water; creates coastal→interior gradient (typically 1-3 units/tile)
 * @property {number} [waterGradient.lowlandBonus] - Extra humidity in low-elevation areas near water (typically 5-12 units)
 * @property {Object} [orographic] - Orographic rain shadow simulation (leeward drying effect)
 * @property {number} [orographic.steps] - How far upwind to scan for blocking mountains (typically 4-8 tiles)
 * @property {number} [orographic.reductionBase] - Base rainfall loss in rain shadow (typically 8-20 units)
 * @property {number} [orographic.reductionPerStep] - Extra drying per tile closer to mountain barrier (typically 1-3 units/tile)
 * @property {Object} [riverCorridor] - River valley humidity (water channels transport moisture inland)
 * @property {number} [riverCorridor.lowlandAdjacencyBonus] - Humidity bonus next to rivers in lowlands (typically 8-18 units)
 * @property {number} [riverCorridor.highlandAdjacencyBonus] - Humidity bonus next to rivers in highlands; less than lowlands (typically 3-8 units)
 * @property {Object} [lowBasin] - Enclosed basin humidity retention (valleys trap moisture)
 * @property {number} [lowBasin.radius] - Search radius to detect if a lowland is surrounded by higher ground (typically 3-6 tiles)
 * @property {number} [lowBasin.delta] - Humidity bonus in enclosed lowland basins like oases (typically 10-25 units)
 */

/**
 * Mountain and hill placement tuning (WorldModel-driven orogeny).
 *
 * Controls how the physics-based `layerAddMountainsPhysics` module blends uplift, plate boundaries,
 * and fractal noise when selecting mountain and hill tiles. Defaults are conservative; increasing
 * weights pushes more extreme belts along convergent margins and deeper rift depressions.
 *
 * @typedef {Object} Mountains
 * @property {number} [mountainPercent] - Target % of land tiles promoted to mountains (typically 4-12%)
 * @property {number} [hillPercent] - Target % of land tiles promoted to hills (typically 10-22%)
 * @property {number} [upliftWeight] - Weight (0..1) applied to `WorldModel.upliftPotential`; higher = mountains stick to convergent zones
 * @property {number} [fractalWeight] - Weight (0..1) applied to fractal noise; higher = more legacy randomness in belts
 * @property {number} [riftDepth] - 0..1 depression severity at divergent boundaries (1 = completely flatten divergent zones)
 * @property {number} [variance] - Random +/- percentage variance (in percentage points) applied to mountain/hill targets
 * @property {number} [boundaryWeight] - Additional mountain weight contributed by plate-boundary closeness (unitless multiplier, typically 0..2)
 * @property {number} [boundaryExponent] - Exponent (>=0.25) shaping how quickly the boundary bonus decays with distance from a plate boundary (1.0 = linear)
 * @property {number} [interiorPenaltyWeight] - Amount subtracted from mountains deep inside plates; nudges belts toward margins (0..1)
 * @property {number} [convergenceBonus] - Extra additive weight for convergent tiles (0..1.5 typical) creating high orogeny ridges
 * @property {number} [transformPenalty] - Multiplier penalty applied along transform boundaries (0..1; 0.3 softens shearing ridges)
 * @property {number} [riftPenalty] - Multiplier penalty applied along divergent boundaries before `riftDepth` carve (0..1.5)
 * @property {number} [hillBoundaryWeight] - Hill weight contributed by plate-boundary closeness (0..1; creates foothill skirts)
 * @property {number} [hillRiftBonus] - Hill bonus for divergent belts (0..1; creates uplifted shoulders beside rifts)
 * @property {number} [hillConvergentFoothill] - Extra foothill weight on convergent tiles (0..0.5 typical)
 * @property {number} [hillInteriorFalloff] - Penalty for hills deep inside plates (0..0.5; higher keeps hills near action)
 * @property {number} [hillUpliftWeight] - Residual uplift contribution to hills (0..1; balances foothills + basins)
 */

/**
 * Volcano placement controls (plate-aware arcs + hotspots).
 *
 * Shapes how many volcanoes spawn, how tightly they track convergent margins,
 * and how much room is left for inland hotspot mechanics.
 *
 * @typedef {Object} Volcanoes
 * @property {boolean} [enabled] - Toggle volcano placement (default true)
 * @property {number} [baseDensity] - Volcanoes per land tile (e.g., 1/170 ≈ 0.0059)
 * @property {number} [minSpacing] - Minimum Euclidean distance between volcanoes (tiles)
 * @property {number} [boundaryThreshold] - Plate-boundary closeness threshold (0..1) for treating a tile as margin adjacent
 * @property {number} [boundaryWeight] - Base weight applied to tiles within the plate-boundary band (0..3 typical)
 * @property {number} [convergentMultiplier] - Weight multiplier for convergent boundaries (>=0)
 * @property {number} [transformMultiplier] - Weight multiplier for transform boundaries (>=0)
 * @property {number} [divergentMultiplier] - Weight multiplier for divergent boundaries (>=0; usually <1 to discourage)
 * @property {number} [hotspotWeight] - Weight contributed to interior (non-boundary) hotspots (0..1)
 * @property {number} [shieldPenalty] - Penalty applied using shield stability (0..1; higher reduces interior volcanoes)
 * @property {number} [randomJitter] - Random additive jitter added per-tile (0..1) for variety
 * @property {number} [minVolcanoes] - Minimum volcano count target (integer)
 * @property {number} [maxVolcanoes] - Maximum volcano count target (integer; <=0 disables the cap)
 */

/**
 * Biome nudge thresholds (fine-tuning terrain assignment).
 *
 * Adjusts biome distribution to avoid unrealistic patterns and create interesting gameplay zones.
 * Example: prevent excessive tundra in temperate highlands, encourage tropical coasts near equator,
 * add grasslands along rivers and rift valleys for mobility and settlement opportunities.
 *
 * @typedef {Object} Biomes
 * @property {Object} [tundra] - Tundra constraints (prevent over-expansion of frozen terrain)
 * @property {number} [tundra.latMin] - Only allow tundra beyond this latitude; prevents equatorial tundra (typically 45-60°)
 * @property {number} [tundra.elevMin] - Minimum elevation for tundra; prevents lowland tundra sprawl (typically 40-60)
 * @property {number} [tundra.rainMax] - Maximum rainfall for tundra; wet cold areas become taiga instead (typically 60-80)
 * @property {Object} [tropicalCoast] - Tropical coast encouragement (lush coastlines near equator)
 * @property {number} [tropicalCoast.latMax] - Latitude limit for tropical coast preference (typically 20-30 degrees)
 * @property {number} [tropicalCoast.rainMin] - Minimum humidity for tropical vegetation (typically 90-110 units)
 * @property {Object} [riverValleyGrassland] - River valley grassland bias (fertile flood plains)
 * @property {number} [riverValleyGrassland.latMax] - Latitude limit for temperate river grasslands (typically 45-60 degrees)
 * @property {number} [riverValleyGrassland.rainMin] - Minimum humidity for lush valley grasslands (typically 65-85 units)
 * @property {Object} [riftShoulder] - Rift shoulder biome preferences (elevated rift margins)
 * @property {number} [riftShoulder.grasslandLatMax] - Latitude limit for grassland on rift shoulders (typically 45-55 degrees)
 * @property {number} [riftShoulder.grasslandRainMin] - Minimum humidity for grassland rift shoulders (typically 60-80 units)
 * @property {number} [riftShoulder.tropicalLatMax] - Latitude limit for tropical rift shoulders (typically 25-35 degrees)
 * @property {number} [riftShoulder.tropicalRainMin] - Minimum humidity for tropical rift vegetation (typically 90-110 units)
 */

/**
 * Feature density controls (vegetation and reef prevalence).
 *
 * Fine-tunes how much forest, jungle, and reef coverage appears on the map.
 * Higher values create denser vegetation and more abundant natural features.
 * Affects visual variety and resource distribution.
 *
 * @typedef {Object} FeaturesDensity
 * @property {number} [rainforestExtraChance] - Bonus jungle/rainforest in wet tropics (percent 0..100, typically 15-40%)
 * @property {number} [forestExtraChance] - Bonus temperate forests in moderate rainfall zones (percent 0..100, typically 20-45%)
 * @property {number} [taigaExtraChance] - Bonus coniferous forests in cold regions (percent 0..100, typically 15-35%)
 * @property {number} [shelfReefMultiplier] - Coral reef density on passive continental shelves (multiplier, typically 0.8-1.5)
 */

/**
 * Late-stage placement (final touches and special features).
 *
 * Controls placement of natural wonders and floodplains along rivers.
 * Applied after all other generation is complete.
 *
 * @typedef {Object} Placement
 * @property {boolean} [wondersPlusOne] - Add one extra natural wonder beyond map size default for more variety
 * @property {Object} [floodplains] - River floodplain generation (fertile lowland strips)
 * @property {number} [floodplains.minLength] - Minimum floodplain segment length along rivers (typically 2-4 tiles)
 * @property {number} [floodplains.maxLength] - Maximum floodplain segment length along rivers (typically 4-8 tiles)
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
 * Unified world foundation configuration replacing the legacy `worldModel` + `landmass` split.
 *
 * @typedef {Object} FoundationConfig
 * @property {FoundationSeedConfig} [seed] - Deterministic seed controls shared by plates/dynamics.
 * @property {FoundationPlatesConfig} [plates] - Voronoi plate generation controls.
 * @property {FoundationDynamicsConfig} [dynamics] - Atmospheric/oceanic drivers and mantle pressure.
 * @property {FoundationSurfaceConfig} [surface] - Landmass targets and ocean separation policy.
 * @property {FoundationPolicyConfig} [policy] - Consumer-facing policy multipliers.
 * @property {FoundationDiagnosticsConfig} [diagnostics] - Logging + replay toggles for foundations.
 */

/**
 * Voronoi plate layout controls for the world foundation.
 *
 * @typedef {Object} FoundationPlatesConfig
 * @property {number} [count] - Number of tectonic plates; 8=Pangaea, 15-20=Earth-like, 25+=fragmented (typically 12-18).
 * @property {ReadonlyArray<number>} [axisAngles] - **Deprecated** legacy axis hints retained for compatibility.
 * @property {number} [convergenceMix] - Ratio of convergent vs divergent boundaries (0..1, typically 0.4-0.6).
 * @property {number} [relaxationSteps] - Lloyd relaxation iterations to smooth plate shapes (0=random, 5=balanced, 10+=uniform).
 * @property {number} [seedJitter] - Random offset applied to initial plate seeds in tiles (0-8 typical).
 * @property {number} [interiorSmooth] - Shield interior smoothing steps (iterations).
 * @property {number} [plateRotationMultiple] - Multiplier for plate rotation weighting along boundaries.
 * @property {"engine"|"fixed"} [seedMode] - Use Civ engine seed ("engine") or a fixed seed ("fixed").
 * @property {number} [fixedSeed] - Explicit plate seed used when `seedMode === "fixed"`.
 * @property {number} [seedOffset] - Integer added to the base seed before plate generation for deterministic reruns.
 */

/**
 * Prevailing wind configuration for rainfall/orographic modelling.
 *
 * @typedef {Object} FoundationWindConfig
 * @property {number} [jetStreaks] - Number of jet stream bands influencing storm tracks (typically 2-5).
 * @property {number} [jetStrength] - Jet stream intensity multiplier (typically 0.8-2.0).
 * @property {number} [variance] - Directional variance for winds (0..1, typically 0.2-0.6).
 * @property {number} [coriolisZonalScale] - Coriolis effect strength on zonal (east/west) flow (typically 0.8-1.5).
 */

/**
 * Ocean circulation configuration for humidity and coastal climate effects.
 *
 * @typedef {Object} FoundationCurrentsConfig
 * @property {number} [basinGyreCountMax] - Maximum gyre systems to model (typically 3-6).
 * @property {number} [westernBoundaryBias] - Strength of western boundary currents (unitless multiplier, typically 1.0-2.0).
 * @property {number} [currentStrength] - Overall ocean current strength multiplier (typically 0.8-1.5).
 */

/**
 * Mantle convection hotspot configuration used for uplift potential.
 *
 * @typedef {Object} FoundationMantleConfig
 * @property {number} [bumps] - Number of mantle plume hotspots (typically 3-8).
 * @property {number} [amplitude] - Uplift strength from mantle pressure (typically 0.5-1.5).
 * @property {number} [scale] - Spatial scale of pressure effects (typically 0.8-1.5).
 */

/**
 * Alignment and interplay controls for plates, winds, and currents.
 *
 * @typedef {Object} FoundationDirectionalityConfig
 * @property {number} [cohesion] - Global alignment strength (0..1, typically 0.3-0.7).
 * @property {Object} [primaryAxes] - Preferred axes for each subsystem (degrees, 0°=east).
 * @property {number} [primaryAxes.plateAxisDeg] - Primary plate movement direction.
 * @property {number} [primaryAxes.windBiasDeg] - Wind direction bias offset from zonal flow.
 * @property {number} [primaryAxes.currentBiasDeg] - Ocean gyre rotation bias.
 * @property {Object} [interplay] - Cross-system coupling strengths controlling mutual influence.
 * @property {number} [interplay.windsFollowPlates] - Jet streams align with plate motion (0..1).
 * @property {number} [interplay.currentsFollowWinds] - Ocean currents align with winds (0..1).
 * @property {number} [interplay.riftsFollowPlates] - Rift valleys align with divergent plate boundaries (0..1).
 * @property {number} [interplay.orogenyOpposesRifts] - Mountain ranges oppose rift direction (0..1).
 * @property {Object} [hemispheres] - Hemisphere-specific behaviour.
 * @property {boolean} [hemispheres.southernFlip] - Flip directionality in the southern hemisphere (Coriolis realism).
 * @property {number} [hemispheres.equatorBandDeg] - Symmetric latitude band around the equator (degrees).
 * @property {number} [hemispheres.monsoonBias] - Seasonal wind variation strength (0..1).
 * @property {Object} [variability] - Randomness injection to avoid uniform patterns.
 * @property {number} [variability.angleJitterDeg] - Random deviation from preferred axes (degrees).
 * @property {number} [variability.magnitudeVariance] - Strength variation multiplier (0..1).
 * @property {number} [variability.seedOffset] - Seed offset for reproducible variability.
 */

/**
 * Policy multipliers exposed to downstream stages (story overlays, coastlines, etc.).
 *
 * @typedef {Object} FoundationPolicyConfig
 * @property {number} [windInfluence] - Wind impact on rain shadow calculations (multiplier, typically 0.5-1.5).
 * @property {number} [currentHumidityBias] - Coastal humidity bias from currents (multiplier, typically 0.5-1.5).
 * @property {number} [boundaryFjordBias] - Fjord frequency multiplier near convergent boundaries (typically 0.8-2.0).
 * @property {number} [shelfReefBias] - Coral reef density multiplier on passive shelves (typically 0.8-1.5).
 * @property {FoundationOceanSeparationConfig} [oceanSeparation] - Plate-aware ocean separation policy.
 */

/**
 * Plate-aware ocean separation policy controlling continental drift spacing.
 *
 * @typedef {Object} FoundationOceanSeparationConfig
 * @property {boolean} [enabled] - Enable plate-driven separation between continent bands.
 * @property {ReadonlyArray<ReadonlyArray<number>>} [bandPairs] - Pairs of continent indices to separate (e.g., [[0,1],[1,2]]).
 * @property {number} [baseSeparationTiles] - Baseline widening between continents in tiles (typically 2-8).
 * @property {number} [boundaryClosenessMultiplier] - Extra separation near active boundaries (multiplier 0..2).
 * @property {number} [maxPerRowDelta] - Maximum per-latitude variation in separation (tiles, typically 1-3).
 * @property {boolean} [respectSeaLanes] - Preserve strategic corridors when widening oceans.
 * @property {number} [minChannelWidth] - Minimum channel width to maintain for navigation (tiles, typically 4-8).
 * @property {Object} [edgeWest] - Optional overrides for the western map edge.
 * @property {boolean} [edgeWest.enabled] - Enable west-edge override.
 * @property {number} [edgeWest.baseTiles] - Baseline tiles at the west edge.
 * @property {number} [edgeWest.boundaryClosenessMultiplier] - Boundary multiplier at the west edge.
 * @property {number} [edgeWest.maxPerRowDelta] - Maximum per-row delta at the west edge.
 * @property {Object} [edgeEast] - Optional overrides for the eastern map edge.
 * @property {boolean} [edgeEast.enabled] - Enable east-edge override.
 * @property {number} [edgeEast.baseTiles] - Baseline tiles at the east edge.
 * @property {number} [edgeEast.boundaryClosenessMultiplier] - Boundary multiplier at the east edge.
 * @property {number} [edgeEast.maxPerRowDelta] - Maximum per-row delta at the east edge.
 */

/**
 * Deterministic seed configuration for world foundations.
 *
 * @typedef {Object} FoundationSeedConfig
 * @property {"engine"|"fixed"} [mode] - Use Civ engine seed or a fixed value.
 * @property {number} [fixed] - Explicit seed value when `mode === "fixed"`.
 * @property {number} [offset] - Global offset applied before deriving subsystem seeds.
 * @property {Object} [offsets] - Optional per-subsystem offsets (e.g., { plates, dynamics, surface }).
 * @property {number} [manifestHash] - Hash of the resolved manifest for replay diagnostics.
 */

/**
 * Atmospheric, oceanic, and mantle drivers for the foundation tensors.
 *
 * @typedef {Object} FoundationDynamicsConfig
 * @property {FoundationWindConfig} [wind] - Prevailing wind configuration.
 * @property {FoundationCurrentsConfig} [currents] - Ocean circulation settings.
 * @property {FoundationMantleConfig} [mantle] - Mantle pressure hotspot configuration.
 * @property {FoundationDirectionalityConfig} [directionality] - Cross-system alignment controls.
 */

/**
 * Surface targets derived from the world foundation seed.
 *
 * @typedef {Object} FoundationSurfaceConfig
 * @property {Landmass} [landmass] - Landmass targets and geometry preferences.
 * @property {FoundationOceanSeparationConfig} [oceanSeparation] - Plate-aware ocean separation policy.
 * @property {Object<string, any>} [overrides] - Additional surface overrides keyed by stage name.
 */

/**
 * Diagnostics and logging toggles for the foundation pipeline.
 *
 * @typedef {Object} FoundationDiagnosticsConfig
 * @property {boolean} [logSeed] - Emit plate seed + RNG metadata to diagnostics.
 * @property {boolean} [logPlates] - Log plate ASCII/summary output.
 * @property {boolean} [logDynamics] - Log wind/current summaries.
 * @property {boolean} [logSurface] - Log landmass window + separation summaries.
 */

// Export empty object to make this a proper ES module
export {};

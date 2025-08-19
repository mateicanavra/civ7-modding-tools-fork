/**
 * TypeScript declarations for Epic Diverse Huge Map Generator config.
 *
 * Usage in map_config.js (JS with editor typings):
 *
 *   // @ts-check
 *   /** @type {import('./map_config.d.ts').MapConfig} *\/
 *   export const MAP_CONFIG = Object.freeze({
 *     toggles: { STORY_ENABLE_HOTSPOTS: true, ... },
 *     story: { ... },
 *     microclimate: { ... },
 *     // other optional groups...
 *   });
 */

/** Master configuration object (top-level config consumed by the generator) */
export interface MapConfig {
    /** Master feature toggles to enable/disable major Climate Story systems */
    toggles: Toggles;
    /** Parameters for narrative motifs (hotspots, rifts, orogeny, swatches, paleo) */
    story: Story;
    /** Small microclimate tweaks (rainfall and feature chances) applied in refinement passes */
    microclimate: Microclimate;

    // Optional granular config groups (override built-in defaults)
    /** Strategic corridors configuration (sea lanes, island-hop, land, river chains, kinds/styles) */
    corridors?: Corridors;
    /** Land vs. ocean balance and band shaping (size-aware curvature/jitter + band geometry presets) */
    landmass?: Landmass;
    /** Coast ruggedizing probabilities (bays/fjords), lane-safe guardrails */
    coastlines?: Coastlines;
    /** Continental margin tagging proportions (active vs. passive) */
    margins?: Margins;
    /** Offshore island cluster seeding and hotspot-biased placement */
    islands?: Islands;
    /** Baseline rainfall blending with latitude bands and local bonuses */
    climateBaseline?: ClimateBaseline;
    /** Earthlike refinement (coastal gradient, orographic, rivers/basins) */
    climateRefine?: ClimateRefine;
    /** Biome nudge thresholds for tundra restraint, tropical coasts, river valleys, rift shoulders */
    biomes?: Biomes;
    /** Gentle, validated feature-density tweaks (rainforest, forest, taiga, shelf reefs) */
    featuresDensity?: FeaturesDensity;
    /** Late-stage placement config (wonders +1, floodplains length) */
    placement?: Placement;
    /** Developer logging toggles (kept off for release) */
    dev?: DevLogging;
    /** Optional foundational Earth-model fields (plates, winds, currents, pressure, directionality, policy) */
    worldModel?: WorldModel;
}

/** Feature toggles for major motifs/systems */
export interface Toggles {
    /** Enable deep‑ocean hotspot trails and paradise/volcanic island classification */
    STORY_ENABLE_HOTSPOTS: boolean;
    /** Enable continental rift lines with shoulder humidity and biome bias */
    STORY_ENABLE_RIFTS: boolean;
    /** Enable windward/lee amplification along mountain belts */
    STORY_ENABLE_OROGENY: boolean;
    /** Enable one weighted macro climate swatch (soft‑edge rainfall deltas) */
    STORY_ENABLE_SWATCHES: boolean;
    /** Enable paleo‑hydrology overlays (deltas/oxbows/fossil channels; clamped) */
    STORY_ENABLE_PALEO: boolean;
    /** Enable strategic corridors (sea lanes, island-hop, land, river chains) */
    STORY_ENABLE_CORRIDORS: boolean;
    /** Enable world model fields (plates, winds, currents, pressure, policies) */
    STORY_ENABLE_WORLDMODEL?: boolean;
}

/** Story (motif) tunables */
export interface Story {
    /** Deep‑ocean hotspot trails (aligned chains far from coasts) */
    hotspot?: Hotspot;
    /** Continental rift lines (linear basins with narrow shoulder bands) */
    rift?: Rift;
    /** Orogeny belts (derive windward/lee flanks; apply small wet/dry deltas) */
    orogeny?: Orogeny;
    /** “Black swan” macro climate swatches (paint one guaranteed macro zone) */
    swatches?: Swatches;
    /** Paleo‑hydrology overlays (humidity hints; optional canyon rim contrast) */
    paleo?: PaleoHydrology;
}

/** Deep-ocean hotspot trails */
export interface Hotspot {
    /** Absolute max trails per map (count; size-scaled internally) */
    maxTrails?: number;
    /** Number of steps per trail (count; higher = longer trails) */
    steps?: number;
    /** Step length per trail step (tiles) */
    stepLen?: number;
    /** Minimum distance required from land for trail points (tiles) */
    minDistFromLand?: number;
    /** Minimum separation between distinct trails (tiles) */
    minTrailSeparation?: number;
    /** Relative weight for “paradise” center classification (unitless weight) */
    paradiseBias?: number;
    /** Relative weight for “volcanic” center classification (unitless weight) */
    volcanicBias?: number;
    /** Chance a volcanic hotspot center becomes land (ratio 0..1) */
    volcanicPeakChance?: number; // 0..1 ratio
}

/** Continental rift lines */
export interface Rift {
    /** Absolute cap on rifts per map (count; size-scaled internally) */
    maxRiftsPerMap?: number;
    /** Steps marched per rift line (count; controls straight-line length) */
    lineSteps?: number;
    /** Step length per rift step (tiles) */
    stepLen?: number;
    /** Shoulder band width on each side of the rift (tiles) */
    shoulderWidth?: number;
}

/** Orogeny belts (windward/lee amplification) */
export interface Orogeny {
    /** Hard cap on belts per large continent (count) */
    beltMaxPerContinent?: number;
    /** Minimum length to consider a belt (tiles) */
    beltMinLength?: number;
    /** Radius for windward/lee flank effects (tiles) */
    radius?: number;
    /** Wetness boost on windward side (rainfall units; 0..200 scale clamp applies) */
    windwardBoost?: number;
    /** Multiplier for lee-side dryness (unitless ratio; ≥1) */
    leeDrynessAmplifier?: number;
}

/** Macro climate swatches */
export interface Swatches {
    /** Maximum swatches applied per map (count; typically 1) */
    maxPerMap?: number;
    /** Ensure at least one swatch gets selected and applied */
    forceAtLeastOne?: boolean;
    /** Size-aware multipliers for width/length based on sqrt(map area) (unitless scalars) */
    sizeScaling?: {
        /** Multiplier applied to swatch width on larger maps (scalar) */
        widthMulSqrt?: number;
        /** Multiplier applied to swatch length on larger maps (scalar) */
        lengthMulSqrt?: number;
    };
    /** Per-kind configuration; known keys optional, additional swatch keys supported */
    types?: {
        /** Subtropical dryness band with soft falloff around ~20° latitude */
        macroDesertBelt?: SwatchType;
        /** Equatorial wetness belt with coastal bleed */
        equatorialRainbelt?: SwatchType;
        /** Tropics-only coastal/island wetness emphasis */
        rainforestArchipelago?: SwatchType;
        /** Windward forest bias and slight lee penalty near mountain belts */
        mountainForests?: SwatchType;
        /** Mid-lat lowland dryness bias (broad plains feel) */
        greatPlains?: SwatchType;
        [swatchName: string]: SwatchType | undefined;
    };
}

/** One swatch kind’s tunables (fields used vary by kind) */
export interface SwatchType {
    /** Selection weight in the swatch lottery (unitless weight) */
    weight?: number;
    // Band-centered kinds
    /** Latitude center (degrees) for banded swatches (deg) */
    latitudeCenterDeg?: number;
    /** Half-width around the center (degrees) */
    halfWidthDeg?: number;
    // Effects
    /** Positive rainfall delta (rainfall units) to add within the swatch */
    wetnessDelta?: number;
    /** Negative rainfall delta (rainfall units) to subtract within the swatch */
    drynessDelta?: number;
    /** Alternative dryness delta used by some kinds (rainfall units) */
    dryDelta?: number;
    /** Maximum elevation considered “lowland” (elevation units; engine scale) */
    lowlandMaxElevation?: number;
    // Archipelago hints
    /** Bias near coasts/islands (unitless scalar multiplier) */
    islandBias?: number;
    /** Slightly increases reef propensity in warm shallow zones (unitless scalar multiplier) */
    reefBias?: number;
    // Orogeny-coupled
    /** Couple to orogeny windward/lee tags for more coherent patterns */
    coupleToOrogeny?: boolean;
    /** Extra wetness on windward tiles (rainfall units) */
    windwardBonus?: number;
    /** Small penalty on lee tiles (rainfall units) */
    leePenalty?: number;
    // Visual bleed hint (soft edges)
    /** Soft blending radius for swatch edges (tiles) */
    bleedRadius?: number;
}

/** Paleo-hydrology overlays (subtle, clamped) */
export interface PaleoHydrology {
    /** Max river mouth deltas (count) */
    maxDeltas?: number;
    /** Landward fan radius around selected river mouths (tiles) */
    deltaFanRadius?: number;
    /** Chance that landward fan tiles become marsh (ratio 0..1; validated) */
    deltaMarshChance?: number; // 0..1 ratio
    /** Max one-tile oxbows (count) in lowland meanders */
    maxOxbows?: number;
    /** Elevation ceiling for oxbow candidates (elevation units) */
    oxbowElevationMax?: number;
    /** Max fossil channels (count; short polylines in dry lowlands toward basins) */
    maxFossilChannels?: number;
    /** Fossil channel polyline length (tiles; before size scaling) */
    fossilChannelLengthTiles?: number;
    /** Step length between fossil channel points (tiles) */
    fossilChannelStep?: number;
    /** Humidity delta applied on fossil centerlines (rainfall units; clamped) */
    fossilChannelHumidity?: number;
    /** Minimum distance from current rivers (tiles) */
    fossilChannelMinDistanceFromCurrentRivers?: number;
    /** Minimum distance from starts for intrusive paleo effects (tiles) */
    minDistanceFromStarts?: number;
    /** Size-aware scaling for fossil channel length (unitless scalar based on sqrt(area)) */
    sizeScaling?: {
        /** Length multiplier based on sqrt(map area) (scalar) */
        lengthMulSqrt?: number;
    };
    /** Optional canyon rim contrast (very subtle) */
    elevationCarving?: {
        /** Whether to apply slight dryness on canyon floor and dampen rims */
        enableCanyonRim?: boolean;
        /** Rim width around fossil centerline (tiles) */
        rimWidth?: number;
        /** Extra dryness on canyon floor (rainfall units) */
        canyonDryBonus?: number;
        /** Optional wetness reduction on bluffs (rainfall units) */
        bluffWetReduction?: number;
    };
}

/** Microclimate adjustments applied by refinement passes */
export interface Microclimate {
    rainfall?: {
        /** Narrow rift-line rainfall boost (rainfall units; clamped; applied near StoryTags.riftLine) */
        riftBoost?: number;
        /** Radius around rift line for the boost (tiles) */
        riftRadius?: number;
        /** Small wetness boost near “paradise” hotspots (rainfall units) */
        paradiseDelta?: number;
        /** Small wetness boost near “volcanic” hotspots (rainfall units) */
        volcanicDelta?: number;
    };
    features?: {
        /** Percent chance for extra reefs near passive shelves (percent 0..100; validated) */
        paradiseReefChance?: number; // percent
        /** Percent chance for extra forest near volcanic centers in warm/wet zones (percent 0..100; validated) */
        volcanicForestChance?: number; // percent
        /** Percent chance for extra taiga near volcanic centers in cold/wet zones (percent 0..100; validated) */
        volcanicTaigaChance?: number; // percent
    };
}

/** Landmass shaping */
export interface Landmass {
    /** Baseline global water percent used for fractal thresholding (percent 0..100) */
    baseWaterPercent?: number;
    /** Gentle water adjustment applied with sqrt(area) scaler (percent points; negative reduces water on larger maps) */
    waterThumbOnScale?: number;
    /** Base fraction of map width used for per-row sinusoidal jitter amplitude (ratio 0..1 of width) */
    jitterAmpFracBase?: number;
    /** Extra jitter fraction applied with size scaling (ratio 0..1 of width) */
    jitterAmpFracScale?: number;
    /** Curvature amplitude as fraction of width to bow bands into long arcs (ratio 0..1 of width) */
    curveAmpFrac?: number;

    /** Up-front band layout and ocean columns scaling (used before landmass carving) */
    geometry?: LandmassGeometry;
}

/** Landmass geometry presets and band definitions */
export interface LandmassGeometry {
    /** Scale applied to globals.g_OceanWaterColumns when computing base ocean widths (scalar multiplier) */
    oceanColumnsScale?: number;
    /** Active preset name to mirror (string key into presets) */
    preset?: string;
    /** Named presets mapping to band arrays (open set of presets) */
    presets?: Record<string, { bands: LandmassBand[] }>;
    /**
     * Three-band layout fallback (should mirror selected preset).
     * Fractions are relative to map width (ratio 0..1).
     */
    bands?: LandmassBand[];
}

/** One continental band window and ocean offsets */
export interface LandmassBand {
    /** West bound as a fraction of map width (ratio 0..1) */
    westFrac: number;
    /** East bound as a fraction of map width (ratio 0..1) */
    eastFrac: number;
    /** West ocean offset (+ scalar × iOceanWaterColumns → tiles) */
    westOceanOffset: number;
    /** East ocean offset (- scalar × iOceanWaterColumns → tiles) */
    eastOceanOffset: number;
}

/** Coastline ruggedizing (lane-safe) */
export interface Coastlines {
    bay?: {
        /** Additional widening of the noise gate for bay carving on larger maps (internal threshold units; scalar) */
        noiseGateAdd?: number;
        /** Random denominator for bay rolls on ACTIVE margins (lower = more frequent; unitless denominator) */
        rollDenActive?: number;
        /** Random denominator for bay rolls elsewhere (lower = more frequent; unitless denominator) */
        rollDenDefault?: number;
    };
    fjord?: {
        /** Base random denominator for fjord-like coast conversions (lower = more frequent; unitless denominator) */
        baseDenom?: number;
        /** Bias on ACTIVE margins (subtracts from denom; unitless additive bias) */
        activeBonus?: number;
        /** Bias near PASSIVE shelves (subtracts from denom; unitless additive bias) */
        passiveBonus?: number;
    };
    /** Documented minimum safe sea-lane width (tiles) */
    minSeaLaneWidth?: number;
}

/** Continental margins tagging */
export interface Margins {
    /** Target fraction of coastal land tagged as ACTIVE margin (ratio 0..1; size-aware cap applies) */
    activeFraction?: number;
    /** Target fraction of coastal land tagged as PASSIVE shelf (ratio 0..1; size-aware cap applies) */
    passiveFraction?: number;
    /** Minimum contiguous coastal segment length eligible (tiles) */
    minSegmentLength?: number;
}

/** Island chain placement */
export interface Islands {
    /** Fractal height threshold percent for island seeds (percent 0..100; sparse when high) */
    fractalThresholdPercent?: number;
    /** Random denominator for island seeding near ACTIVE margins (lower = more frequent; unitless denominator) */
    baseIslandDenNearActive?: number;
    /** Random denominator elsewhere (lower = more frequent; unitless denominator) */
    baseIslandDenElse?: number;
    /** Random denominator when on a hotspot trail point (lower = more frequent; unitless denominator) */
    hotspotSeedDenom?: number;
    /** Max tiles in a small island cluster (tiles; total cluster size) */
    clusterMax?: number;
    /** Minimum Chebyshev radius from existing land for island placement (tiles) */
    minDistFromLandRadius?: number;
}

/** Strategic corridors (sea lanes, island-hop, land, river chains) */
export interface Corridors {
    /** Open-water protected sea lanes */
    sea?: CorridorSea;
    /** Hotspot-based island-hop arcs */
    islandHop?: CorridorIslandHop;
    /** Land open corridors (e.g., along rift shoulders) */
    land?: CorridorLand;
    /** River-adjacent lowland chains seeded post-rivers */
    river?: CorridorRiver;
    /** Per-consumer policy strengths and behaviors */
    policy?: CorridorPolicy;
    /**
     * Corridor kinds and styles (probabilities are gentle multipliers; consumers must validate).
     * Known keys are provided in defaults; additional styles are allowed.
     */
    kinds?: CorridorKinds;
}

export interface CorridorSea {
    /** Max number of sea lanes to tag across the map (count) */
    maxLanes?: number;
    /** Minimum fraction of map span a lane must cover to qualify (ratio 0..1) */
    minLengthFrac?: number;
    /** Sampling stride when scanning for lanes (tiles) */
    scanStride?: number;
    /** Radius to keep islands away from protected lanes (tiles) */
    avoidRadius?: number;
    /** Whether to consider diagonal lanes in selection/scoring */
    preferDiagonals?: boolean;
    /** Minimum spacing enforced between selected lanes (tiles) */
    laneSpacing?: number;
    /** Minimum channel width measured orthogonal to the lane (tiles) */
    minChannelWidth?: number;
}

export interface CorridorIslandHop {
    /** Whether to promote hotspot trails into island-hop lanes */
    useHotspots?: boolean;
    /** Max number of promoted arcs (count) */
    maxArcs?: number;
}

export interface CorridorLand {
    /** Whether to derive land corridors from rift shoulders */
    useRiftShoulders?: boolean;
    /** Cap on distinct land-open corridors (count) */
    maxCorridors?: number;
    /** Minimum contiguous shoulder run length eligible (tiles) */
    minRunLength?: number;
    /** Minimum spacing enforced between selected land corridor segments (tiles) */
    spacing?: number;
}

export interface CorridorRiver {
    /** Max number of river chain corridors (count) */
    maxChains?: number;
    /** Max greedy steps while following river-adjacent path (steps; ~tiles) */
    maxSteps?: number;
    /** Elevation threshold treated as lowland preference (elevation units) */
    preferLowlandBelow?: number;
    /** Coast seed radius for initial river-adjacent seed near coast (tiles) */
    coastSeedRadius?: number;
    /** Minimum tiles that must be tagged for a chain to qualify (tiles) */
    minTiles?: number;
    /** Require the chain to end near a coast or river mouth */
    mustEndNearCoast?: boolean;
}

/** Per-consumer policy strengths and behaviors for corridors */
export interface CorridorPolicy {
    /** Sea-lane policies (coastline/island interactions) */
    sea?: CorridorPolicySea;
    /** Land-open corridor policies (biome bias strength) */
    land?: CorridorPolicyLand;
    /** River-chain corridor policies (biome bias strength) */
    river?: CorridorPolicyRiver;
}

/** Sea-lane policy */
export interface CorridorPolicySea {
    /** 'hard' = never edit on lanes; 'soft' = reduce chance instead of skip */
    protection?: "hard" | "soft";
    /** When protection is 'soft', multiply coast edit probabilities by this factor (ratio 0..1) */
    softChanceMultiplier?: number;
}

/** Land-open corridor policy */
export interface CorridorPolicyLand {
    /** Scales grassland bias strength on land-open corridors (ratio 0..1) */
    biomesBiasStrength?: number;
}

/** River-chain corridor policy */
export interface CorridorPolicyRiver {
    /** Scales grassland bias strength on river-chain corridors (ratio 0..1) */
    biomesBiasStrength?: number;
}

/** Corridor kinds/styles (open schema with known areas for sea/islandHop/land/river) */
export interface CorridorKinds {
    /** Sea-lane kinds and styles */
    sea?: {
        /** Mapping of style-name → style config */
        styles?: Record<string, CorridorStyle>;
    };
    /** Island-hop kinds and styles */
    islandHop?: {
        styles?: Record<string, CorridorStyle>;
    };
    /** Land corridor kinds and styles */
    land?: {
        styles?: Record<string, CorridorStyle>;
    };
    /** River corridor kinds and styles */
    river?: {
        styles?: Record<string, CorridorStyle>;
    };
}

/** A generic corridor style configuration container */
export interface CorridorStyle {
    /**
     * Biome mixture biases where values represent weights or fractions for biome tendencies.
     * Values are unitless weights or ratios (0..1 typical). Keys are biome names as consumed by the layer.
     */
    biomes?: Record<string, number>;
    /**
     * Feature biases where numeric values represent probabilities (ratios 0..1) or multipliers (scalars).
     * Example keys (not exhaustive): reefBias (scalar), floodplainBias (scalar), forestBias (scalar).
     */
    features?: Record<string, number>;
    /**
     * Edge-shaping hints where numeric values are probabilities (ratios 0..1) or multipliers (scalars).
     * Example keys (not exhaustive): cliffsChance (ratio), fjordChance (ratio), bayCarveMultiplier (scalar),
     * shelfReefMultiplier (scalar), mountainRimChance (ratio), forestRimChance (ratio), hillRimChance (ratio),
     * cliffChance (ratio), escarpmentChance (ratio).
     */
    edge?: Record<string, number>;
}

/** Baseline rainfall and local bonuses */
export interface ClimateBaseline {
    blend?: {
        /** Weight for engine base rainfall component (ratio 0..1; unitless) */
        baseWeight?: number;
        /** Weight for latitude band target component (ratio 0..1; unitless) */
        bandWeight?: number;
    };
    bands?: {
        /** Target rainfall at absolute latitude 0–10° (rainfall units; 0..200) */
        deg0to10?: number;
        /** Target rainfall at absolute latitude 10–20° (rainfall units; 0..200) */
        deg10to20?: number;
        /** Target rainfall at absolute latitude 20–35° (rainfall units; 0..200) */
        deg20to35?: number;
        /** Target rainfall at absolute latitude 35–55° (rainfall units; 0..200) */
        deg35to55?: number;
        /** Target rainfall at absolute latitude 55–70° (rainfall units; 0..200) */
        deg55to70?: number;
        /** Target rainfall at absolute latitude 70°+ (rainfall units; 0..200) */
        deg70plus?: number;
    };
    orographic?: {
        /** First elevation threshold for mild orographic bonus (elevation units) */
        hi1Threshold?: number;
        /** Bonus applied when above first elevation threshold (rainfall units) */
        hi1Bonus?: number;
        /** Second elevation threshold for mild orographic bonus (elevation units) */
        hi2Threshold?: number;
        /** Bonus applied when above second elevation threshold (rainfall units) */
        hi2Bonus?: number;
    };
    coastal?: {
        /** Bonus rainfall on coastal land tiles (rainfall units) */
        coastalLandBonus?: number;
        /** Bonus rainfall when adjacent to shallow water (rainfall units) */
        shallowAdjBonus?: number;
    };
    noise?: {
        /** Base ±jitter span used on smaller maps (rainfall units) */
        baseSpanSmall?: number;
        /** Extra jitter span applied on larger maps (unitless scalar applied via sqrt(area)) */
        spanLargeScaleFactor?: number;
    };
}

/** Earthlike refinement parameters */
export interface ClimateRefine {
    waterGradient?: {
        /** Max Chebyshev radius to search for nearest water (tiles) */
        radius?: number;
        /** Bonus per ring closer to water (rainfall units per ring) */
        perRingBonus?: number;
        /** Additional bonus on low elevations (rainfall units) */
        lowlandBonus?: number;
    };
    orographic?: {
        /** Upwind scan distance for mountain/high-elevation barriers (steps ≈ tiles) */
        steps?: number;
        /** Base rainfall reduction when upwind barrier exists (rainfall units) */
        reductionBase?: number;
        /** Additional reduction scaled by closeness of barrier (rainfall units per step) */
        reductionPerStep?: number;
    };
    riverCorridor?: {
        /** River-adjacent wetness bonus at low elevation (rainfall units) */
        lowlandAdjacencyBonus?: number;
        /** River-adjacent wetness bonus at higher elevation (rainfall units) */
        highlandAdjacencyBonus?: number;
    };
    lowBasin?: {
        /** Neighborhood radius for detecting enclosed low basins (tiles) */
        radius?: number;
        /** Humidity bonus within enclosed low basins (rainfall units; lowlands only) */
        delta?: number;
    };
}

/** Biome nudge thresholds */
export interface Biomes {
    tundra?: {
        /** Minimum absolute latitude for tundra restraint to apply (degrees) */
        latMin?: number;
        /** Minimum elevation for tundra restraint to apply (elevation units) */
        elevMin?: number;
        /** Maximum rainfall for tundra to be retained (rainfall units) */
        rainMax?: number;
    };
    tropicalCoast?: {
        /** Maximum absolute latitude for equatorial tropical coast encouragement (degrees) */
        latMax?: number;
        /** Minimum rainfall to trigger tropical bias on coasts (rainfall units) */
        rainMin?: number;
    };
    riverValleyGrassland?: {
        /** Maximum absolute latitude for temperate/warm river-valley grassland bias (degrees) */
        latMax?: number;
        /** Minimum rainfall to trigger grassland bias in valleys (rainfall units) */
        rainMin?: number;
    };
    riftShoulder?: {
        /** Max latitude for grassland bias on rift shoulders (degrees) */
        grasslandLatMax?: number;
        /** Minimum rainfall for grassland bias on rift shoulders (rainfall units) */
        grasslandRainMin?: number;
        /** Max latitude for tropical bias on rift shoulders (degrees) */
        tropicalLatMax?: number;
        /** Minimum rainfall for tropical bias on rift shoulders (rainfall units) */
        tropicalRainMin?: number;
    };
}

/** Validated feature density tweaks */
export interface FeaturesDensity {
    /** Percent chance for additional rainforest in very wet tropical zones (percent 0..100) */
    rainforestExtraChance?: number; // percent
    /** Percent chance for additional forest in wetter temperate grasslands (percent 0..100) */
    forestExtraChance?: number; // percent
    /** Percent chance for additional taiga in cold lowlands (percent 0..100) */
    taigaExtraChance?: number; // percent
    /** Multiplier applied to paradiseReefChance to derive passive-shelf reef chance (unitless scalar) */
    shelfReefMultiplier?: number;
}

/** Late-stage placement */
export interface Placement {
    /** Whether to place +1 natural wonder vs. map default (compatibility) */
    wondersPlusOne?: boolean;
    /** Floodplains segment lengths (tiles; min/max along river segments) */
    floodplains?: {
        /** Minimum floodplain length (tiles) */
        minLength?: number;
        /** Maximum floodplain length (tiles) */
        maxLength?: number;
    };
}

/** Developer logging toggles (keep false for release) */
export interface DevLogging {
    /** Master switch for dev logging */
    enabled?: boolean;
    /** Log per-section timings */
    logTiming?: boolean;
    /** Log StoryTags summary counts */
    logStoryTags?: boolean;
    /** Log coarse rainfall histogram over land */
    rainfallHistogram?: boolean;
}

/** Optional world model (Earth forces; lightweight, optional) */
export interface WorldModel {
    /** Master switch for foundational Earth forces fields */
    enabled?: boolean;

    /** Plates (Voronoi plates + boundary types; drive rifts/orogeny/margins) */
    plates?: {
        /** Plate count target (count) */
        count?: number;
        /** Macro axes used to align plate trends (degrees) */
        axisAngles?: number[];
        /** 0..1 fraction for convergent vs divergent balance (ratio 0..1) */
        convergenceMix?: number;
        /** Tile jitter applied to plate seeds (tiles) */
        seedJitter?: number;
        /** Smoothing steps for shield interiors (steps; iterations) */
        interiorSmooth?: number;
    };

    /** Global winds (zonal baseline + jet streams; used in refinement upwind checks) */
    wind?: {
        /** Number of jet streaks (count) */
        jetStreaks?: number;
        /** Jet streak relative strength (unitless scalar) */
        jetStrength?: number;
        /** Wind variance (ratio 0..1) */
        variance?: number;
        /** Coriolis scaling for zonal components (unitless scalar) */
        coriolisZonalScale?: number;
    };

    /** Ocean currents (basin gyres + boundary currents; small humidity/coast effects) */
    currents?: {
        /** Max basin gyre systems (count) */
        basinGyreCountMax?: number;
        /** Western boundary current bias (unitless scalar) */
        westernBoundaryBias?: number;
        /** Overall current strength (unitless scalar) */
        currentStrength?: number;
    };

    /** Mantle pressure (bumps/ridges; optional small influence on hills/relief) */
    pressure?: {
        /** Number of pressure bumps (count) */
        bumps?: number;
        /** Pressure amplitude (unitless scalar) */
        amplitude?: number;
        /** Pressure scale (unitless scalar) */
        scale?: number;
    };

    /** Directionality (global cohesion and alignment controls for Earth forces) */
    directionality?: {
        /** Master cohesion dial; higher = stronger alignment between systems (ratio 0..1) */
        cohesion?: number;

        /** Macro axes in degrees: bias plate motion, prevailing winds, and gyre/currents */
        primaryAxes?: {
            /** Macro plate motion axis (degrees) */
            plateAxisDeg?: number;
            /** Global wind bias offset (degrees) */
            windBiasDeg?: number;
            /** Global current gyre bias (degrees) */
            currentBiasDeg?: number;
        };

        /** Interplay weights: how much one system aligns with another (ratio 0..1) */
        interplay?: {
            /** Jets and streaks align with plate axes (ratio 0..1) */
            windsFollowPlates?: number;
            /** Surface currents track prevailing winds (ratio 0..1) */
            currentsFollowWinds?: number;
            /** Divergent rifts align with plate boundaries (ratio 0..1) */
            riftsFollowPlates?: number;
            /** Convergent uplift tends to oppose divergent directions (ratio 0..1) */
            orogenyOpposesRifts?: number;
        };

        /** Hemisphere options and seasonal asymmetry (future-facing) */
        hemispheres?: {
            /** Flip sign conventions in S hemisphere for winds/currents bias */
            southernFlip?: boolean;
            /** Symmetric behavior band around equator (degrees) */
            equatorBandDeg?: number;
            /** Seasonal asymmetry placeholder (ratio 0..1; conservative) */
            monsoonBias?: number;
        };

        /** Variability knobs to avoid rigid patterns while honoring directionality */
        variability?: {
            /** Random jitter around macro axes (degrees) */
            angleJitterDeg?: number;
            /** Variance applied to vector magnitudes (ratio 0..1) */
            magnitudeVariance?: number;
            /** RNG stream offset dedicated to directionality (integer steps) */
            seedOffset?: number;
        };
    };

    /** Policy scalars for consumers (keep gentle; effects clamped/validated) */
    policy?: {
        /** Scales wind use in refinement upwind barrier checks (unitless scalar) */
        windInfluence?: number;
        /** Scales coastal humidity tweak from currents (unitless scalar) */
        currentHumidityBias?: number;
        /** Scales fjord/bay bias near convergent boundaries (unitless scalar) */
        boundaryFjordBias?: number;
        /** Scales passive-shelf reef bias (unitless scalar) */
        shelfReefBias?: number;

        /** Ocean separation policy (plate-aware; consumed by landmass/coast shaping) */
        oceanSeparation?: {
            /** Enable ocean separation biasing (flag) */
            enabled?: boolean;
            /**
             * Which continent band pairs to bias apart.
             * Uses 0-based indices used by orchestrator.
             * Example: [[0,1],[1,2]]
             */
            bandPairs?: [number, number][];
            /** Base lateral push applied pre-coast expansion; positive widens oceans (tiles) */
            baseSeparationTiles?: number;
            /** Multiplier scaling separation near high boundary closeness (ratio 0..2) */
            boundaryClosenessMultiplier?: number;
            /** Maximum absolute separation delta per row to preserve sea lanes (tiles) */
            maxPerRowDelta?: number;
            /** Respect strategic sea lanes and enforce minimum channel width */
            respectSeaLanes?: boolean;
            /** Minimum channel width to preserve when separating (tiles) */
            minChannelWidth?: number;

            /** Optional outer-edge ocean widening/narrowing (west map edge) */
            edgeWest?: {
                /** Enable west-edge override */
                enabled?: boolean;
                /** Base lateral tiles at west edge (tiles) */
                baseTiles?: number;
                /** Boundary-closeness multiplier (ratio; unitless) */
                boundaryClosenessMultiplier?: number;
                /** Max per-row delta (tiles) */
                maxPerRowDelta?: number;
            };

            /** Optional outer-edge ocean widening/narrowing (east map edge) */
            edgeEast?: {
                /** Enable east-edge override */
                enabled?: boolean;
                /** Base lateral tiles at east edge (tiles) */
                baseTiles?: number;
                /** Boundary-closeness multiplier (ratio; unitless) */
                boundaryClosenessMultiplier?: number;
                /** Max per-row delta (tiles) */
                maxPerRowDelta?: number;
            };
        };
    };
}

export namespace JSDoc {
    /**
     * Inline JSDoc helper for map_config.js
     *
     * Example:
     *   // @ts-check
     *   /** @type {import('./map_config.d.ts').MapConfig} *\/
     *   export const MAP_CONFIG = Object.freeze({ ... });
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface _Doc {}
}

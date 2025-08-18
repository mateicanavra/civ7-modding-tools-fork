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
    /** Land vs. ocean balance and band shaping (size-aware curvature/jitter) */
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
    /** Absolute max trails per map (size-scaled internally) */
    maxTrails?: number;
    /** Number of steps per trail (higher = longer trails) */
    steps?: number;
    /** Step length in tiles between successive polyline points */
    stepLen?: number;
    /** Minimum distance from land required for trail points */
    minDistFromLand?: number;
    /** Minimum separation between distinct trails (avoid parallel clutter) */
    minTrailSeparation?: number;
    /** Weight for classifying a hotspot center as “paradise” (lush, reef-friendly) */
    paradiseBias?: number;
    /** Weight for classifying a hotspot center as “volcanic” (rugged, fertile ash) */
    volcanicBias?: number;
    /** Chance (0–1) a volcanic hotspot center “peeks” above sea level as land */
    volcanicPeakChance?: number; // 0..1
}

/** Continental rift lines */
export interface Rift {
    /** Absolute cap on rifts per map (size-scaled internally) */
    maxRiftsPerMap?: number;
    /** Number of steps marched per rift line (controls straight-line length) */
    lineSteps?: number;
    /** Step length in tiles between successive rift points */
    stepLen?: number;
    /** Shoulder band width on each side of the rift line (narrow) */
    shoulderWidth?: number;
}

/** Orogeny belts (windward/lee amplification) */
export interface Orogeny {
    /** Hard cap on belts per large continent */
    beltMaxPerContinent?: number;
    /** Minimum tiles to consider a belt (filters trivial clusters) */
    beltMinLength?: number;
    /** Narrow radius for windward/lee flank effects */
    radius?: number;
    /** Small wetness boost applied on windward side (clamped) */
    windwardBoost?: number;
    /** Multiplier for lee-side dryness (amplifies small local subtraction) */
    leeDrynessAmplifier?: number;
}

/** Macro climate swatches */
export interface Swatches {
    /** Maximum swatches applied per map (engine typically paints one) */
    maxPerMap?: number; // currently one is applied
    /** Ensure at least one swatch gets selected and applied */
    forceAtLeastOne?: boolean; // ensure at least one swatch is used
    /** Size-aware multipliers for width/length based on sqrt(map area) */
    sizeScaling?: {
        /** Multiplier applied to swatch width on larger maps */
        widthMulSqrt?: number;
        /** Multiplier applied to swatch length on larger maps */
        lengthMulSqrt?: number;
    };
    /** Per-kind configuration; known keys optional, additional swatch keys supported */
    types?: {
        /** Subtropical dryness band with soft falloff around ~20° */
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
    /** Selection weight in the swatch lottery (higher = more likely) */
    weight?: number;
    // Band-centered kinds
    /** Latitude center (degrees) for banded swatches */
    latitudeCenterDeg?: number;
    /** Half-width (degrees) around the center; controls band thickness */
    halfWidthDeg?: number;
    // Effects
    /** Positive rainfall delta (wetness) to add within the swatch */
    wetnessDelta?: number;
    /** Negative rainfall delta (dryness) to subtract within the swatch */
    drynessDelta?: number;
    /** Alternative dryness delta used by some kinds */
    dryDelta?: number;
    /** Maximum elevation considered “lowland” for certain swatches */
    lowlandMaxElevation?: number;
    // Archipelago hints
    /** Increases bias near coasts/islands for archipelago swatches */
    islandBias?: number;
    /** Slightly increases reef propensity in warm shallow zones */
    reefBias?: number;
    // Orogeny-coupled
    /** Couple to orogeny windward/lee tags for more coherent patterns */
    coupleToOrogeny?: boolean;
    /** Extra wetness on windward tiles for mountainForests swatch */
    windwardBonus?: number;
    /** Small penalty on lee tiles for mountainForests swatch */
    leePenalty?: number;
    // Visual bleed hint (soft edges)
    /** Soft blending radius for swatch edges (visual cohesion) */
    bleedRadius?: number;
}

/** Paleo-hydrology overlays (subtle, clamped) */
export interface PaleoHydrology {
    /** Max river mouth deltas (tiny marsh/floodplain fans if validated) */
    maxDeltas?: number;
    /** Landward fan radius around selected river mouths */
    deltaFanRadius?: number;
    /** Chance (0–1) that landward fan tiles become marsh (if validated) */
    deltaMarshChance?: number; // 0..1
    /** Max one-tile oxbows in lowland meander pockets */
    maxOxbows?: number;
    /** Elevation ceiling for oxbow candidates (lowland only) */
    oxbowElevationMax?: number;
    /** Max fossil channels (short polylines in dry lowlands toward basins) */
    maxFossilChannels?: number;
    /** Fossil channel polyline length in tiles (before size scaling) */
    fossilChannelLengthTiles?: number;
    /** Step length between fossil channel points */
    fossilChannelStep?: number;
    /** Humidity delta applied on fossil centerlines (clamped) */
    fossilChannelHumidity?: number;
    /** Minimum distance from current rivers to seed fossil channels */
    fossilChannelMinDistanceFromCurrentRivers?: number;
    /** Minimum distance from starts for intrusive paleo effects */
    minDistanceFromStarts?: number;
    /** Size-aware scaling for fossil channel length */
    sizeScaling?: {
        /** Multiplier applied to fossil length based on sqrt(map area) */
        lengthMulSqrt?: number;
    };
    /** Optional canyon rim contrast (very subtle) */
    elevationCarving?: {
        /** Whether to apply slight dryness on canyon floor and dampen rims */
        enableCanyonRim?: boolean;
        /** Rim width in tiles around fossil centerline (usually 1) */
        rimWidth?: number;
        /** Extra dryness applied on the canyon floor (kept small) */
        canyonDryBonus?: number;
        /** Optional wetness reduction on bluffs (usually 0) */
        bluffWetReduction?: number;
    };
}

/** Microclimate adjustments applied by refinement passes */
export interface Microclimate {
    rainfall?: {
        /** Narrow rift-line rainfall boost (clamped; applied near StoryTags.riftLine) */
        riftBoost?: number;
        /** Radius (tiles) around rift line for the boost */
        riftRadius?: number;
        /** Small wetness boost near “paradise” hotspots */
        paradiseDelta?: number;
        /** Small wetness boost near “volcanic” hotspots */
        volcanicDelta?: number;
    };
    features?: {
        /** Percent chance for extra reefs near passive shelves (derived via multiplier) */
        paradiseReefChance?: number; // % chance
        /** Percent chance for extra forest near volcanic centers in warm/wet zones */
        volcanicForestChance?: number; // % chance
        /** Percent chance for extra taiga near volcanic centers in cold/wet zones */
        volcanicTaigaChance?: number; // % chance
    };
}

/** Landmass shaping */
export interface Landmass {
    /** Baseline global water percent used for fractal thresholding */
    baseWaterPercent?: number;
    /** Gentle water adjustment applied with sqrt(area) scaler; negative reduces water on larger maps */
    waterThumbOnScale?: number;
    /** Base fraction of map width used for per-row sinusoidal jitter amplitude */
    jitterAmpFracBase?: number;
    /** Extra jitter fraction applied with size scaling */
    jitterAmpFracScale?: number;
    /** Curvature amplitude as fraction of width to bow bands into long arcs */
    curveAmpFrac?: number;
}

/** Coastline ruggedizing (lane-safe) */
export interface Coastlines {
    bay?: {
        /** Additional widening of the noise gate for bay carving on larger maps */
        noiseGateAdd?: number;
        /** Random denominator for bay rolls on ACTIVE margins (lower = more frequent; keep sparse) */
        rollDenActive?: number;
        /** Random denominator for bay rolls elsewhere (lower = more frequent; keep sparse) */
        rollDenDefault?: number;
    };
    fjord?: {
        /** Base random denominator for fjord-like coast conversions (lower = more frequent) */
        baseDenom?: number;
        /** Bias on ACTIVE margins (subtracts from denom to slightly increase chance) */
        activeBonus?: number;
        /** Bias near PASSIVE shelves (subtracts from denom to slightly increase chance) */
        passiveBonus?: number;
    };
    /** Documented minimum safe sea-lane width (reserved for future shelf/trench edits) */
    minSeaLaneWidth?: number;
}

/** Continental margins tagging */
export interface Margins {
    /** Target fraction of coastal land tagged as ACTIVE margin (size-aware cap applies) */
    activeFraction?: number;
    /** Target fraction of coastal land tagged as PASSIVE shelf (size-aware cap applies) */
    passiveFraction?: number;
    /** Minimum contiguous coastal segment length eligible for tagging (reduces noise) */
    minSegmentLength?: number;
}

/** Island chain placement */
export interface Islands {
    /** Fractal height threshold percent for island seeds (sparse when high) */
    fractalThresholdPercent?: number;
    /** Random denominator for island seeding near ACTIVE margins (lower = more frequent; keep sparse) */
    baseIslandDenNearActive?: number;
    /** Random denominator elsewhere (lower = more frequent; keep sparse) */
    baseIslandDenElse?: number;
    /** Random denominator when on a hotspot trail point (lower = more frequent; keep sparse) */
    hotspotSeedDenom?: number;
    /** Max tiles in a small island cluster */
    clusterMax?: number;
    /** Minimum Chebyshev radius from existing land required for island placement */
    minDistFromLandRadius?: number;
}

/** Baseline rainfall and local bonuses */
export interface ClimateBaseline {
    blend?: {
        /** Weight for engine base rainfall component */
        baseWeight?: number;
        /** Weight for latitude band target component */
        bandWeight?: number;
    };
    bands?: {
        /** Target rainfall at absolute latitude 0–10° */
        deg0to10?: number;
        /** Target rainfall at absolute latitude 10–20° */
        deg10to20?: number;
        /** Target rainfall at absolute latitude 20–35° */
        deg20to35?: number;
        /** Target rainfall at absolute latitude 35–55° */
        deg35to55?: number;
        /** Target rainfall at absolute latitude 55–70° */
        deg55to70?: number;
        /** Target rainfall at absolute latitude 70°+ */
        deg70plus?: number;
    };
    orographic?: {
        /** First elevation threshold for mild orographic bonus */
        hi1Threshold?: number;
        /** Bonus applied when above first elevation threshold */
        hi1Bonus?: number;
        /** Second elevation threshold for mild orographic bonus */
        hi2Threshold?: number;
        /** Bonus applied when above second elevation threshold */
        hi2Bonus?: number;
    };
    coastal?: {
        /** Bonus rainfall on coastal land tiles */
        coastalLandBonus?: number;
        /** Bonus rainfall when adjacent to shallow water */
        shallowAdjBonus?: number;
    };
    noise?: {
        /** Base ±jitter span used on smaller maps */
        baseSpanSmall?: number;
        /** Extra jitter span applied on larger maps (scaled by sqrt(area)) */
        spanLargeScaleFactor?: number;
    };
}

/** Earthlike refinement parameters */
export interface ClimateRefine {
    waterGradient?: {
        /** Max Chebyshev radius to search for nearest water */
        radius?: number;
        /** Bonus per ring closer to water (decays inland) */
        perRingBonus?: number;
        /** Additional bonus on low elevations (coastal bleed) */
        lowlandBonus?: number;
    };
    orographic?: {
        /** Upwind scan distance for mountain/high-elevation barriers */
        steps?: number;
        /** Base rainfall reduction when upwind barrier exists */
        reductionBase?: number;
        /** Additional reduction scaled by closeness of barrier */
        reductionPerStep?: number;
    };
    riverCorridor?: {
        /** River-adjacent wetness bonus at low elevation */
        lowlandAdjacencyBonus?: number;
        /** River-adjacent wetness bonus at higher elevation */
        highlandAdjacencyBonus?: number;
    };
    lowBasin?: {
        /** Neighborhood radius for detecting enclosed low basins */
        radius?: number;
        /** Humidity bonus within enclosed low basins (lowlands only) */
        delta?: number;
    };
}

/** Biome nudge thresholds */
export interface Biomes {
    tundra?: {
        /** Minimum absolute latitude for tundra restraint to apply */
        latMin?: number;
        /** Minimum elevation for tundra restraint to apply */
        elevMin?: number;
        /** Maximum rainfall for tundra to be retained (restrains overgrowth) */
        rainMax?: number;
    };
    tropicalCoast?: {
        /** Maximum absolute latitude for equatorial tropical coast encouragement */
        latMax?: number;
        /** Minimum rainfall to trigger tropical bias on coasts */
        rainMin?: number;
    };
    riverValleyGrassland?: {
        /** Maximum absolute latitude for temperate/warm river-valley grassland bias */
        latMax?: number;
        /** Minimum rainfall to trigger grassland bias in valleys */
        rainMin?: number;
    };
    riftShoulder?: {
        /** Max latitude for grassland bias on rift shoulders when moist */
        grasslandLatMax?: number;
        /** Minimum rainfall for grassland bias on rift shoulders */
        grasslandRainMin?: number;
        /** Max latitude for tropical bias on rift shoulders when very wet */
        tropicalLatMax?: number;
        /** Minimum rainfall for tropical bias on rift shoulders */
        tropicalRainMin?: number;
    };
}

/** Validated feature density tweaks */
export interface FeaturesDensity {
    /** Percent chance for additional rainforest in very wet tropical zones */
    rainforestExtraChance?: number; // %
    /** Percent chance for additional forest in wetter temperate grasslands */
    forestExtraChance?: number; // %
    /** Percent chance for additional taiga in cold lowlands */
    taigaExtraChance?: number; // %
    /** Multiplier applied to paradiseReefChance to derive passive-shelf reef chance */
    shelfReefMultiplier?: number;
}

/** Late-stage placement */
export interface Placement {
    /** Whether to place +1 natural wonder vs. map default (compatibility) */
    wondersPlusOne?: boolean;
    /** Floodplains segment lengths (min/max) */
    floodplains?: {
        /** Minimum floodplain length */
        minLength?: number;
        /** Maximum floodplain length */
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

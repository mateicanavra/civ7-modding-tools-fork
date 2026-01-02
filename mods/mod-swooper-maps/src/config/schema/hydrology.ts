import { Type } from "typebox";
import { UnknownRecord } from "@mapgen/config/schema/common.js";

/**
 * Rainfall targets by latitude zone for the climate engine.
 * Values are rainfall units (0-200 typical range).
 */
export const ClimateBaselineBandEdgesSchema = Type.Object(
  {
    /** Edge between equatorial and tropical zones (degrees, default 10). */
    deg0to10: Type.Optional(
      Type.Number({
        description: "Edge between equatorial and tropical zones (degrees).",
        default: 10,
        minimum: 0,
        maximum: 90,
      })
    ),
    /** Edge between tropical and subtropical zones (degrees, default 20). */
    deg10to20: Type.Optional(
      Type.Number({
        description: "Edge between tropical and subtropical zones (degrees).",
        default: 20,
        minimum: 0,
        maximum: 90,
      })
    ),
    /** Edge between subtropical and temperate zones (degrees, default 35). */
    deg20to35: Type.Optional(
      Type.Number({
        description: "Edge between subtropical and temperate zones (degrees).",
        default: 35,
        minimum: 0,
        maximum: 90,
      })
    ),
    /** Edge between temperate and subpolar zones (degrees, default 55). */
    deg35to55: Type.Optional(
      Type.Number({
        description: "Edge between temperate and subpolar zones (degrees).",
        default: 55,
        minimum: 0,
        maximum: 90,
      })
    ),
    /** Edge between subpolar and polar zones (degrees, default 70). */
    deg55to70: Type.Optional(
      Type.Number({
        description: "Edge between subpolar and polar zones (degrees).",
        default: 70,
        minimum: 0,
        maximum: 90,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Latitude edges that separate rainfall bands.",
  }
);

export const ClimateBaselineBandsSchema = Type.Object(
  {
    /** Equatorial zone (0-10°) rainfall target (rainforests, monsoons; typically 110-130). */
    deg0to10: Type.Optional(
      Type.Number({
        description: "Equatorial zone rainfall target (rainforests, monsoons; typically 110-130).",
        default: 120,
      })
    ),
    /** Tropical zone (10-20°) rainfall target (wet but variable; typically 90-110). */
    deg10to20: Type.Optional(
      Type.Number({
        description: "Tropical zone rainfall target (wet but variable; typically 90-110).",
        default: 104,
      })
    ),
    /** Subtropical zone (20-35°) rainfall target (deserts, Mediterranean; typically 60-80). */
    deg20to35: Type.Optional(
      Type.Number({
        description: "Subtropical zone rainfall target (deserts, Mediterranean; typically 60-80).",
        default: 75,
      })
    ),
    /** Temperate zone (35-55°) rainfall target (moderate rainfall; typically 70-90). */
    deg35to55: Type.Optional(
      Type.Number({
        description: "Temperate zone rainfall target (moderate rainfall; typically 70-90).",
        default: 70,
      })
    ),
    /** Subpolar zone (55-70°) rainfall target (cool, moderate moisture; typically 55-70). */
    deg55to70: Type.Optional(
      Type.Number({
        description: "Subpolar zone rainfall target (cool, moderate moisture; typically 55-70).",
        default: 60,
      })
    ),
    /** Polar zone (70°+) rainfall target (cold deserts, ice; typically 40-50). */
    deg70plus: Type.Optional(
      Type.Number({
        description: "Polar zone rainfall target (cold deserts, ice; typically 40-50).",
        default: 45,
      })
    ),
    /** Explicit band edges (degrees) used for blending between targets. */
    edges: Type.Optional(ClimateBaselineBandEdgesSchema),
    /** Blend width (degrees) for smoothing between adjacent bands. */
    transitionWidth: Type.Optional(
      Type.Number({
        description: "Blend width (degrees) for smoothing between adjacent bands.",
        default: 4,
        minimum: 0,
        maximum: 20,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Rainfall targets by latitude zone (with explicit edges for blending).",
  }
);

export const ClimateBaselineSizeScalingSchema = Type.Object(
  {
    /** Reference map area (tiles) used to compute size scaling. */
    baseArea: Type.Optional(
      Type.Number({
        description: "Reference map area (tiles) used to compute size scaling.",
        default: 10000,
        minimum: 1,
      })
    ),
    /** Minimum scale multiplier applied to size scaling. */
    minScale: Type.Optional(
      Type.Number({
        description: "Minimum scale multiplier applied to size scaling.",
        default: 0.6,
        minimum: 0.1,
      })
    ),
    /** Maximum scale multiplier applied to size scaling. */
    maxScale: Type.Optional(
      Type.Number({
        description: "Maximum scale multiplier applied to size scaling.",
        default: 2.0,
        minimum: 0.1,
      })
    ),
    /** Equatorial boost per scale step (rainfall units). */
    equatorBoostScale: Type.Optional(
      Type.Number({
        description: "Equatorial boost per scale step (rainfall units).",
        default: 12,
        minimum: 0,
      })
    ),
    /** Fraction of equator boost applied to the 10-20° band (0..1). */
    equatorBoostTaper: Type.Optional(
      Type.Number({
        description: "Fraction of equator boost applied to the 10-20° band (0..1).",
        default: 0.6,
        minimum: 0,
        maximum: 1,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Blend weights for mixing engine rainfall with latitude-based targets.
 */
export const ClimateBaselineBlendSchema = Type.Object(
  {
    /** Weight for engine's base rainfall (0..1; typically 0.5-0.7). */
    baseWeight: Type.Optional(
      Type.Number({
        description: "Weight for engine's base rainfall (0..1; typically 0.5-0.7).",
        default: 0.6,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Weight for latitude band targets (0..1; typically 0.3-0.5). */
    bandWeight: Type.Optional(
      Type.Number({
        description: "Weight for latitude band targets (0..1; typically 0.3-0.5).",
        default: 0.4,
        minimum: 0,
        maximum: 1,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Blend weights for rainfall mixing.",
  }
);

/**
 * Orographic lift bonuses (mountains force air upward, causing condensation and rain).
 */
export const ClimateBaselineOrographicSchema = Type.Object(
  {
    /** Elevation for modest rain increase (hills get some extra moisture). */
    hi1Threshold: Type.Optional(
      Type.Number({
        description: "Elevation for modest rain increase (hills get some extra moisture).",
        default: 350,
      })
    ),
    /** Rainfall bonus at first threshold (typically 5-15 units). */
    hi1Bonus: Type.Optional(
      Type.Number({
        description: "Rainfall bonus at first threshold (typically 5-15 units).",
        default: 8,
      })
    ),
    /** Elevation for strong rain increase (mountains get significant moisture). */
    hi2Threshold: Type.Optional(
      Type.Number({
        description: "Elevation for strong rain increase (mountains get significant moisture).",
        default: 600,
      })
    ),
    /** Rainfall bonus at second threshold (typically 10-25 units). */
    hi2Bonus: Type.Optional(
      Type.Number({
        description: "Rainfall bonus at second threshold (typically 10-25 units).",
        default: 7,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Orographic lift rainfall bonuses by elevation.",
  }
);

/**
 * Coastal rainfall bonuses for the climate engine.
 */
export const ClimateBaselineCoastalSchema = Type.Object(
  {
    /** Bonus rainfall on coastal land tiles (rainfall units). */
    coastalLandBonus: Type.Optional(
      Type.Number({
        description: "Bonus rainfall on coastal land tiles (rainfall units).",
        default: 24,
      })
    ),
    /** How far inland the coastal bonus spreads (in tiles). Default: 4. */
    spread: Type.Optional(
      Type.Number({
        description: "How far inland the coastal bonus spreads (in tiles).",
        default: 4,
        minimum: 1,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Coastal proximity rainfall bonuses.",
  }
);

/**
 * Rainfall noise/jitter parameters for climate variation.
 */
export const ClimateBaselineNoiseSchema = Type.Object(
  {
    /** Base +/- jitter span used on smaller maps (rainfall units). */
    baseSpanSmall: Type.Optional(
      Type.Number({
        description: "Base +/- jitter span used on smaller maps (rainfall units).",
        default: 3,
      })
    ),
    /** Extra jitter span applied on larger maps (scalar via sqrt(area)). */
    spanLargeScaleFactor: Type.Optional(
      Type.Number({
        description: "Extra jitter span applied on larger maps (scalar via sqrt(area)).",
        default: 1,
      })
    ),
    /** Frequency scale for Perlin noise (lower = larger blobs). Default: 0.15. */
    scale: Type.Optional(
      Type.Number({
        description: "Frequency scale for Perlin noise (lower = larger blobs).",
        default: 0.15,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Rainfall noise parameters for variation.",
  }
);

/**
 * Baseline rainfall and local bonuses used by the climate engine.
 */
export const ClimateBaselineSchema = Type.Object(
  {
    /** Rainfall targets by latitude zone. */
    bands: Type.Optional(ClimateBaselineBandsSchema),
    /** Map-size scaling for latitude boosts and noise. */
    sizeScaling: Type.Optional(ClimateBaselineSizeScalingSchema),
    /** Blend weights for mixing engine rainfall with latitude-based targets. */
    blend: Type.Optional(ClimateBaselineBlendSchema),
    /** Orographic lift bonuses (mountains cause rain). */
    orographic: Type.Optional(ClimateBaselineOrographicSchema),
    /** Coastal proximity rainfall bonuses. */
    coastal: Type.Optional(ClimateBaselineCoastalSchema),
    /** Rainfall noise/jitter parameters. */
    noise: Type.Optional(ClimateBaselineNoiseSchema),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Continental effect (distance from ocean impacts humidity).
 */
export const ClimateRefineWaterGradientSchema = Type.Object(
  {
    /** How far inland to measure water proximity (typically 8-15 tiles). */
    radius: Type.Optional(
      Type.Number({
        description: "How far inland to measure water proximity (typically 8-15 tiles).",
        default: 5,
      })
    ),
    /** Humidity per tile closer to water; creates coastal-to-interior gradient (typically 1-3 units/tile). */
    perRingBonus: Type.Optional(
      Type.Number({
        description: "Humidity per tile closer to water; creates coastal-to-interior gradient (typically 1-3 units/tile).",
        default: 5,
      })
    ),
    /** Extra humidity in low-elevation areas near water (typically 5-12 units). */
    lowlandBonus: Type.Optional(
      Type.Number({
        description: "Extra humidity in low-elevation areas near water (typically 5-12 units).",
        default: 3,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Water proximity gradient settings.",
  }
);

/**
 * Orographic rain shadow simulation (leeward drying effect).
 */
export const ClimateRefineOrographicSchema = Type.Object(
  {
    /** How far upwind to scan for blocking mountains (typically 4-8 tiles). */
    steps: Type.Optional(
      Type.Number({
        description: "How far upwind to scan for blocking mountains (typically 4-8 tiles).",
        default: 4,
      })
    ),
    /** Base rainfall loss in rain shadow (typically 8-20 units). */
    reductionBase: Type.Optional(
      Type.Number({
        description: "Base rainfall loss in rain shadow (typically 8-20 units).",
        default: 8,
      })
    ),
    /** Extra drying per tile closer to mountain barrier (typically 1-3 units/tile). */
    reductionPerStep: Type.Optional(
      Type.Number({
        description: "Extra drying per tile closer to mountain barrier (typically 1-3 units/tile).",
        default: 6,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Rain shadow simulation settings.",
  }
);

/**
 * River valley humidity (water channels transport moisture inland).
 */
export const ClimateRefineRiverCorridorSchema = Type.Object(
  {
    /** Humidity bonus next to rivers in lowlands (typically 8-18 units). */
    lowlandAdjacencyBonus: Type.Optional(
      Type.Number({
        description: "Humidity bonus next to rivers in lowlands (typically 8-18 units).",
        default: 14,
      })
    ),
    /** Humidity bonus next to rivers in highlands; less than lowlands (typically 3-8 units). */
    highlandAdjacencyBonus: Type.Optional(
      Type.Number({
        description: "Humidity bonus next to rivers in highlands; less than lowlands (typically 3-8 units).",
        default: 10,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "River corridor humidity settings.",
  }
);

/**
 * Enclosed basin humidity retention (valleys trap moisture).
 */
export const ClimateRefineLowBasinSchema = Type.Object(
  {
    /** Search radius to detect if a lowland is surrounded by higher ground (typically 3-6 tiles). */
    radius: Type.Optional(
      Type.Number({
        description: "Search radius to detect if a lowland is surrounded by higher ground (typically 3-6 tiles).",
        default: 2,
      })
    ),
    /** Humidity bonus in enclosed lowland basins like oases (typically 10-25 units). */
    delta: Type.Optional(
      Type.Number({
        description: "Humidity bonus in enclosed lowland basins like oases (typically 10-25 units).",
        default: 6,
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description: "Enclosed basin humidity settings.",
  }
);

/**
 * Earthlike refinement parameters layered on top of baseline climate.
 */
export const ClimateRefineSchema = Type.Object(
  {
    /** Continental effect (distance from ocean impacts humidity). */
    waterGradient: Type.Optional(ClimateRefineWaterGradientSchema),
    /** Orographic rain shadow simulation (leeward drying effect). */
    orographic: Type.Optional(ClimateRefineOrographicSchema),
    /** River valley humidity (water channels transport moisture inland). */
    riverCorridor: Type.Optional(ClimateRefineRiverCorridorSchema),
    /** Enclosed basin humidity retention (valleys trap moisture). */
    lowBasin: Type.Optional(ClimateRefineLowBasinSchema),
    /** Pressure system effects (untyped placeholder). */
    pressure: Type.Optional(UnknownRecord),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Aggregated climate configuration grouping baseline, refinement, and swatch knobs.
 */
export const ClimateStoryRainfallSchema = Type.Object(
  {
    /**
     * Radius around rift line tiles that receives a humidity boost.
     * @default 2
     */
    riftRadius: Type.Optional(
      Type.Number({
        default: 2,
        description:
          "Radius around rift line tiles that receives a humidity boost (tiles). Typically 2–5.",
      })
    ),
    /**
     * Base rainfall bonus applied near rift shoulders, reduced by elevation.
     * @default 8
     */
    riftBoost: Type.Optional(
      Type.Number({
        default: 8,
        description:
          "Base rainfall bonus applied near rifts before elevation penalties (rainfall units). Typically 15–30.",
      })
    ),
    /**
     * Rainfall bonus applied within hotspot paradise neighborhoods.
     * @default 6
     */
    paradiseDelta: Type.Optional(
      Type.Number({
        default: 6,
        description:
          "Rainfall bonus applied near paradise hotspots (rainfall units). Typically 10–20.",
      })
    ),
    /**
     * Rainfall bonus applied within hotspot volcanic neighborhoods.
     * @default 8
     */
    volcanicDelta: Type.Optional(
      Type.Number({
        default: 8,
        description:
          "Rainfall bonus applied near volcanic hotspots (rainfall units). Typically 8–15.",
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const ClimateStoryPaleoSizeScalingSchema = Type.Object(
  {
    /**
     * Length multiplier applied with sqrt(mapArea) scaling.
     * @default 0
     */
    lengthMulSqrt: Type.Optional(
      Type.Number({
        description: "Length multiplier applied with sqrt(mapArea) scaling.",
        default: 0,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const ClimateStoryPaleoElevationCarvingSchema = Type.Object(
  {
    /** Whether canyon rims should be enabled when carving paleo artifacts. */
    enableCanyonRim: Type.Optional(
      Type.Boolean({
        description: "Whether canyon rims should be enabled when carving paleo artifacts.",
        default: true,
      })
    ),
    /** Rim width in tiles. */
    rimWidth: Type.Optional(
      Type.Number({
        description: "Rim width in tiles.",
        default: 0,
        minimum: 0,
      })
    ),
    /** Extra drying bonus applied inside canyons. */
    canyonDryBonus: Type.Optional(
      Type.Number({
        description: "Extra drying bonus applied inside canyons.",
        default: 0,
        minimum: 0,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const ClimateStoryPaleoSchema = Type.Object(
  {
    /** Maximum deltas to apply (0 disables). */
    maxDeltas: Type.Optional(
      Type.Number({
        description: "Maximum deltas to apply (0 disables).",
        default: 0,
        minimum: 0,
      })
    ),
    /** Delta fan radius in tiles. */
    deltaFanRadius: Type.Optional(
      Type.Number({
        description: "Delta fan radius in tiles.",
        default: 0,
        minimum: 0,
      })
    ),
    /** Chance of marshy delta tiles (0..1). */
    deltaMarshChance: Type.Optional(
      Type.Number({
        description: "Chance of marshy delta tiles (0..1).",
        default: 0.35,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Maximum oxbows to apply (0 disables). */
    maxOxbows: Type.Optional(
      Type.Number({
        description: "Maximum oxbows to apply (0 disables).",
        default: 0,
        minimum: 0,
      })
    ),
    /** Elevation ceiling for oxbow placement (meters). */
    oxbowElevationMax: Type.Optional(
      Type.Number({
        description: "Elevation ceiling for oxbow placement (meters).",
        default: 280,
        minimum: 0,
      })
    ),
    /** Maximum fossil channels to apply (0 disables). */
    maxFossilChannels: Type.Optional(
      Type.Number({
        description: "Maximum fossil channels to apply (0 disables).",
        default: 0,
        minimum: 0,
      })
    ),
    /** Fossil channel length (tiles). */
    fossilChannelLengthTiles: Type.Optional(
      Type.Number({
        description: "Fossil channel length (tiles).",
        default: 6,
        minimum: 0,
      })
    ),
    /** Fossil channel step length (tiles). */
    fossilChannelStep: Type.Optional(
      Type.Number({
        description: "Fossil channel step length (tiles).",
        default: 1,
        minimum: 1,
      })
    ),
    /** Target humidity for fossil channels. */
    fossilChannelHumidity: Type.Optional(
      Type.Number({
        description: "Target humidity for fossil channels (rainfall units).",
        default: 0,
        minimum: 0,
      })
    ),
    /** Minimum distance from current rivers (tiles). */
    fossilChannelMinDistanceFromCurrentRivers: Type.Optional(
      Type.Number({
        description: "Minimum distance from current rivers (tiles).",
        default: 0,
        minimum: 0,
      })
    ),
    /** Wetness reduction applied when carving bluffs (rainfall units). */
    bluffWetReduction: Type.Optional(
      Type.Number({
        description: "Wetness reduction applied when carving bluffs (rainfall units).",
        default: 0,
        minimum: 0,
      })
    ),
    /** Map-size scaling multipliers for paleo artifacts. */
    sizeScaling: Type.Optional(ClimateStoryPaleoSizeScalingSchema),
    /** Elevation carving knobs for canyons/bluffs. */
    elevationCarving: Type.Optional(ClimateStoryPaleoElevationCarvingSchema),
  },
  { additionalProperties: false }
);

export const ClimateStorySchema = Type.Object(
  {
    /** Story-driven rainfall modifiers keyed off narrative tags. */
    rainfall: Type.Optional(ClimateStoryRainfallSchema),
    /**
     * Optional paleo-hydrology artifacts (deltas, oxbows, fossil channels).
     * This block is intentionally not defaulted-in so the paleo pass can be disabled by omission.
     */
    paleo: Type.Optional(ClimateStoryPaleoSchema),
  },
  { additionalProperties: false, default: {} }
);

export const ClimateConfigSchema = Type.Object(
  {
    /** Baseline rainfall and local bonuses. */
    baseline: Type.Optional(ClimateBaselineSchema),
    /** Earthlike refinement parameters (rain shadow, river corridors, etc.). */
    refine: Type.Optional(ClimateRefineSchema),
    /** Story-driven climate modifiers reacting to narrative overlays. */
    story: Type.Optional(ClimateStorySchema),
    /**
     * Swatch overrides for macro climate regions.
     * Set `swatches.enabled = false` to disable the swatch pass entirely.
     */
    swatches: Type.Optional(UnknownRecord),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Biome nudge thresholds that fine-tune terrain assignment.
 */

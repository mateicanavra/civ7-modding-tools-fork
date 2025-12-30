import { Type } from "typebox";

/**
 * Biome classification thresholds for owned model.
 * These control where biome transitions occur in climate space.
 */
export const BiomeThresholdsSchema = Type.Object(
  {
    /** Temperature below which snow affinity rises (°C). */
    snowTempMax: Type.Optional(
      Type.Number({
        description: "Temperature below which snow affinity rises (°C).",
        default: -10,
      })
    ),
    /** Temperature center for tundra affinity (°C). */
    tundraTempCenter: Type.Optional(
      Type.Number({
        description: "Temperature center for tundra affinity (°C).",
        default: -2,
      })
    ),
    /** Minimum latitude for tundra bonus (degrees). */
    tundraLatMin: Type.Optional(
      Type.Number({
        description: "Minimum latitude for tundra bonus (degrees).",
        default: 55,
      })
    ),
    /** Aridity above which desert affinity rises (0-1). */
    desertAridityMin: Type.Optional(
      Type.Number({
        description: "Aridity above which desert affinity rises (0-1).",
        default: 0.6,
      })
    ),
    /** Temperature above which tropical affinity rises (°C). */
    tropicalTempMin: Type.Optional(
      Type.Number({
        description: "Temperature above which tropical affinity rises (°C).",
        default: 22,
      })
    ),
    /** Maximum latitude for tropical affinity (degrees). */
    tropicalLatMax: Type.Optional(
      Type.Number({
        description: "Maximum latitude for tropical affinity (degrees).",
        default: 20,
      })
    ),
    /** Moisture above which grassland affinity rises (0-1). */
    grasslandMoistureMin: Type.Optional(
      Type.Number({
        description: "Moisture above which grassland affinity rises (0-1).",
        default: 0.45,
      })
    ),
    /** Moisture center for plains affinity band (0-1). */
    plainsMoistureCenter: Type.Optional(
      Type.Number({
        description: "Moisture center for plains affinity band (0-1).",
        default: 0.35,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Narrative overlay policy for biome designation.
 * Controls how corridors and rifts influence biome selection.
 */
export const NarrativePolicySchema = Type.Object(
  {
    /** Strength of corridor→grassland preference (0-1). */
    corridorStrength: Type.Optional(
      Type.Number({
        description: "Strength of corridor→grassland preference (0-1).",
        default: 0.6,
        minimum: 0,
        maximum: 1,
      })
    ),
    /** Strength of rift shoulder→fertile biome preference (0-1). */
    riftStrength: Type.Optional(
      Type.Number({
        description: "Strength of rift shoulder→fertile biome preference (0-1).",
        default: 0.5,
        minimum: 0,
        maximum: 1,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Biome classification configuration for the owned model.
 */
export const BiomeConfigSchema = Type.Object(
  {
    /** Biome classification thresholds (controls climate→biome mapping). */
    thresholds: Type.Optional(BiomeThresholdsSchema),
    /** Narrative overlay policy (corridor/rift strength). */
    narrative: Type.Optional(NarrativePolicySchema),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Feature density controls for vegetation and reef prevalence.
 */
export const FeaturesDensityConfigSchema = Type.Object(
  {
    /**
     * Coral reef density multiplier on passive continental shelves.
     * - Values > 1 increase reef prevalence along shelf edges
     * - Values < 1 reduce reef spawning
     * @default 0.6
     */
    shelfReefMultiplier: Type.Optional(
      Type.Number({
        description: "Coral reef density multiplier on passive continental shelves (scalar).",
        default: 0.6,
      })
    ),
    /**
     * Bonus jungle/rainforest probability in wet tropics.
     * Adds to base chance when humidity and latitude criteria are met.
     * Example: 10 adds 10% extra chance for rainforest tiles.
     */
    rainforestExtraChance: Type.Optional(
      Type.Number({
        description: "Bonus jungle/rainforest probability in wet tropics (0..1 fraction or percent).",
        default: 55,
      })
    ),
    /**
     * Bonus temperate forest probability in moderate rainfall zones.
     * Adds to base chance in mid-latitude humid regions.
     * Example: 10 adds 10% extra chance for forest tiles.
     */
    forestExtraChance: Type.Optional(
      Type.Number({
        description: "Bonus temperate forest probability in moderate rainfall zones (0..1 fraction or percent).",
        default: 30,
      })
    ),
    /**
     * Bonus coniferous forest (taiga) probability in cold regions.
     * Adds to base chance near polar latitudes.
     * Example: 5 adds 5% extra chance for taiga tiles.
     */
    taigaExtraChance: Type.Optional(
      Type.Number({
        description: "Bonus coniferous forest probability in cold regions (0..1 fraction or percent).",
        default: 35,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Floodplain generation along rivers.
 */

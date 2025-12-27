import { Type } from "typebox";

/**
 * Biome nudge thresholds that fine-tune terrain assignment.
 */
export const BiomeConfigSchema = Type.Object(
  {
    /** Tundra biome thresholds. */
    tundra: Type.Optional(
      Type.Object(
        {
          /** Minimum latitude for tundra to prevent low-latitude cold deserts (degrees). */
          latMin: Type.Optional(
            Type.Number({
              description: "Minimum latitude for tundra to prevent low-latitude cold deserts (degrees).",
            })
          ),
          /** Minimum elevation for tundra; lowlands below this stay as taiga or grassland. */
          elevMin: Type.Optional(
            Type.Number({
              description: "Minimum elevation for tundra; lowlands below this stay as taiga or grassland.",
            })
          ),
          /** Maximum rainfall tolerated before tundra flips to wetter biomes (rainfall units). */
          rainMax: Type.Optional(
            Type.Number({
              description: "Maximum rainfall tolerated before tundra flips to wetter biomes (rainfall units).",
            })
          ),
        },
        { additionalProperties: false, default: {} }
      )
    ),
    /** Tropical coast biome thresholds. */
    tropicalCoast: Type.Optional(
      Type.Object(
        {
          /** Latitude limit for tropical coasts; nearer the equator keeps coasts lush (degrees). */
          latMax: Type.Optional(
            Type.Number({
              description: "Latitude limit for tropical coasts; nearer the equator keeps coasts lush (degrees).",
            })
          ),
          /** Minimum rainfall needed to classify a warm coastline as tropical (rainfall units). */
          rainMin: Type.Optional(
            Type.Number({
              description: "Minimum rainfall needed to classify a warm coastline as tropical (rainfall units).",
            })
          ),
        },
        { additionalProperties: false, default: {} }
      )
    ),
    /** River valley grassland biome thresholds. */
    riverValleyGrassland: Type.Optional(
      Type.Object(
        {
          /** Latitude limit for temperate river grasslands; beyond this prefer taiga or tundra. */
          latMax: Type.Optional(
            Type.Number({
              description: "Latitude limit for temperate river grasslands; beyond this prefer taiga or tundra.",
            })
          ),
          /** Minimum humidity needed for river valley grasslands (rainfall units). */
          rainMin: Type.Optional(
            Type.Number({
              description: "Minimum humidity needed for river valley grasslands (rainfall units).",
            })
          ),
        },
        { additionalProperties: false, default: {} }
      )
    ),
    /** Rift shoulder biome thresholds (along divergent boundaries). */
    riftShoulder: Type.Optional(
      Type.Object(
        {
          /** Latitude ceiling for grassland on rift shoulders (degrees). */
          grasslandLatMax: Type.Optional(
            Type.Number({
              description: "Latitude ceiling for grassland on rift shoulders (degrees).",
            })
          ),
          /** Minimum rainfall for grassland shoulders along rifts (rainfall units). */
          grasslandRainMin: Type.Optional(
            Type.Number({
              description: "Minimum rainfall for grassland shoulders along rifts (rainfall units).",
            })
          ),
          /** Latitude ceiling for tropical rift shoulders (degrees). */
          tropicalLatMax: Type.Optional(
            Type.Number({
              description: "Latitude ceiling for tropical rift shoulders (degrees).",
            })
          ),
          /** Minimum rainfall for tropical vegetation on rift shoulders (rainfall units). */
          tropicalRainMin: Type.Optional(
            Type.Number({
              description: "Minimum rainfall for tropical vegetation on rift shoulders (rainfall units).",
            })
          ),
        },
        { additionalProperties: false, default: {} }
      )
    ),
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

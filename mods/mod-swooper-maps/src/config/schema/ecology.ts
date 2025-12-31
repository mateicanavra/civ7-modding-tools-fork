import { Type } from "typebox";

import { classifyBiomes } from "@mapgen/domain/ecology/ops/classify-biomes.js";
import { BiomeEngineBindingsSchema } from "@mapgen/domain/ecology/biome-bindings.js";

/**
 * Biome classification config (Holdridge/Whittaker-inspired).
 * Sourced directly from the ecology domain operation to keep schema + logic colocated.
 */
export const BiomeConfigSchema = classifyBiomes.config;

/**
 * Optional bindings from biome symbols -> engine biome globals.
 * Allows mods to remap symbols without editing the operation config.
 */
export const BiomeBindingsSchema = BiomeEngineBindingsSchema;

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

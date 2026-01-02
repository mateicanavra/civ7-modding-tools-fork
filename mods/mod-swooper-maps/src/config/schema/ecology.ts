import { Type } from "typebox";

import { classifyBiomes } from "@mapgen/domain/ecology/ops/classify-biomes.js";
import { featuresPlacement } from "@mapgen/domain/ecology/ops/features-placement/index.js";
import { plotEffects } from "@mapgen/domain/ecology/ops/plot-effects/index.js";
import { BiomeEngineBindingsSchema } from "@mapgen/domain/ecology/biome-bindings.js";

/**
 * Biome classification config (Holdridge/Whittaker-inspired).
 * Sourced directly from the ecology domain operation to keep schema + logic colocated.
 * This controls how rainfall/temperature translate into biome symbols and vegetation density.
 */
export const BiomeConfigSchema = classifyBiomes.config;

/**
 * Optional bindings from biome symbols -> engine biome globals.
 * Allows mods to remap symbols without editing the operation config.
 */
export const BiomeBindingsSchema = BiomeEngineBindingsSchema;

/**
 * Feature density controls for vegetation and reef prevalence.
 * These are additive/scale knobs layered on top of the baseline feature pass.
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
        description:
          "Coral reef density multiplier on passive continental shelves (scalar, 0..2 typical).",
        default: 0.6,
        minimum: 0,
      })
    ),
    /**
     * Radius (tiles) around passive shelf markers to seed extra reefs.
     * Larger values widen reef skirts around continental shelves.
     */
    shelfReefRadius: Type.Optional(
      Type.Number({
        description: "Radius (tiles) around passive shelves to seed extra reefs.",
        default: 1,
        minimum: 0,
      })
    ),
    /**
     * Bonus jungle/rainforest probability in wet tropics.
     * Adds to base chance when humidity and latitude criteria are met.
     * Example: 10 adds 10% extra chance for rainforest tiles.
     */
    rainforestExtraChance: Type.Optional(
      Type.Number({
        description:
          "Bonus jungle/rainforest probability in wet tropics (percent 0..100).",
        default: 55,
        minimum: 0,
        maximum: 100,
      })
    ),
    /**
     * Bonus temperate forest probability in moderate rainfall zones.
     * Adds to base chance in mid-latitude humid regions.
     * Example: 10 adds 10% extra chance for forest tiles.
     */
    forestExtraChance: Type.Optional(
      Type.Number({
        description:
          "Bonus temperate forest probability in moderate rainfall zones (percent 0..100).",
        default: 30,
        minimum: 0,
        maximum: 100,
      })
    ),
    /**
     * Bonus coniferous forest (taiga) probability in cold regions.
     * Adds to base chance near polar latitudes.
     * Example: 5 adds 5% extra chance for taiga tiles.
     */
    taigaExtraChance: Type.Optional(
      Type.Number({
        description:
          "Bonus coniferous forest probability in cold regions (percent 0..100).",
        default: 35,
        minimum: 0,
        maximum: 100,
      })
    ),
    /**
     * Vegetation scaling factor for rainforest extra chance.
     * Higher values make dense vegetation add more rainforest bonus.
     */
    rainforestVegetationScale: Type.Optional(
      Type.Number({
        description:
          "Vegetation scaling factor for rainforest extra chance (percent per 1.0 vegetation).",
        default: 50,
        minimum: 0,
      })
    ),
    /**
     * Vegetation scaling factor for temperate forest extra chance.
     * Higher values make dense vegetation add more forest bonus.
     */
    forestVegetationScale: Type.Optional(
      Type.Number({
        description:
          "Vegetation scaling factor for temperate forest extra chance (percent per 1.0 vegetation).",
        default: 30,
        minimum: 0,
      })
    ),
    /**
     * Vegetation scaling factor for taiga extra chance.
     * Higher values make dense vegetation add more taiga bonus.
     */
    taigaVegetationScale: Type.Optional(
      Type.Number({
        description:
          "Vegetation scaling factor for taiga extra chance (percent per 1.0 vegetation).",
        default: 20,
        minimum: 0,
      })
    ),
    /**
     * Minimum rainfall needed before rainforest density bonuses apply.
     * Use to prevent rainforests from appearing in marginally wet tropics.
     */
    rainforestMinRainfall: Type.Optional(
      Type.Number({
        description: "Minimum rainfall needed before rainforest bonuses apply.",
        default: 130,
        minimum: 0,
      })
    ),
    /**
     * Minimum rainfall needed before temperate forest density bonuses apply.
     * Use to keep forests from appearing in dry grasslands.
     */
    forestMinRainfall: Type.Optional(
      Type.Number({
        description: "Minimum rainfall needed before forest bonuses apply.",
        default: 100,
        minimum: 0,
      })
    ),
    /**
     * Maximum elevation for taiga density bonuses (meters).
     * Lower values confine taiga boosts to lowlands.
     */
    taigaMaxElevation: Type.Optional(
      Type.Number({
        description: "Maximum elevation for taiga density bonuses (meters).",
        default: 300,
      })
    ),
    /**
     * Minimum vegetation density (0..1) before any extra density bonuses apply.
     * Raise this to keep barren regions from receiving bonus forests.
     */
    minVegetationForBonus: Type.Optional(
      Type.Number({
        description: "Minimum vegetation density before density bonuses apply (0..1).",
        default: 0.01,
        minimum: 0,
        maximum: 1,
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Config for the baseline feature placement operation (strategy wrapper).
 */
export const FeaturesPlacementConfigSchema = featuresPlacement.config;

/**
 * Config for climate/ecology plot effects (snow, sand, burned).
 */
export const PlotEffectsConfigSchema = plotEffects.config;

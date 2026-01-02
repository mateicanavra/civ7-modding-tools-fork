import { classifyBiomes } from "@mapgen/domain/ecology/ops/classify-biomes.js";
import { featuresPlacement } from "@mapgen/domain/ecology/ops/features-placement/index.js";
import { plotEffects } from "@mapgen/domain/ecology/ops/plot-effects/index.js";
import { BiomeEngineBindingsSchema } from "@mapgen/domain/ecology/biome-bindings.js";
export { FeaturesDensityConfigSchema } from "@mapgen/domain/ecology/config.js";

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
 * Config for the baseline feature placement operation (strategy wrapper).
 */
export const FeaturesPlacementConfigSchema = featuresPlacement.config;

/**
 * Config for climate/ecology plot effects (snow, sand, burned).
 */
export const PlotEffectsConfigSchema = plotEffects.config;


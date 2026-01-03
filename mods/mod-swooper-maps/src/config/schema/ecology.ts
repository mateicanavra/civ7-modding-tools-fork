import { classifyBiomes } from "@mapgen/domain/ecology/ops/classify-biomes/index.js";
import { planFeaturePlacements } from "@mapgen/domain/ecology/ops/plan-feature-placements/index.js";
import { planPlotEffects } from "@mapgen/domain/ecology/ops/plan-plot-effects/index.js";
import { planReefEmbellishments } from "@mapgen/domain/ecology/ops/plan-reef-embellishments/index.js";
import { planVegetationEmbellishments } from "@mapgen/domain/ecology/ops/plan-vegetation-embellishments/index.js";
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
 * Config for the feature placement plan operation.
 */
export const FeaturesPlacementConfigSchema = planFeaturePlacements.config;

/**
 * Config for reef embellishment plan placement.
 */
export const ReefEmbellishmentsConfigSchema = planReefEmbellishments.config;

/**
 * Config for vegetation embellishment plan placement.
 */
export const VegetationEmbellishmentsConfigSchema = planVegetationEmbellishments.config;

/**
 * Config for climate/ecology plot effects (snow, sand, burned).
 */
export const PlotEffectsConfigSchema = planPlotEffects.config;

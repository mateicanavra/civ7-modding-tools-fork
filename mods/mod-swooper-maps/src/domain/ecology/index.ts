import { classifyBiomes } from "./ops/classify-biomes/index.js";
import { planFeaturePlacements } from "./ops/plan-feature-placements/index.js";
import { planPlotEffects } from "./ops/plan-plot-effects/index.js";
import { planReefEmbellishments } from "./ops/plan-reef-embellishments/index.js";
import { planVegetationEmbellishments } from "./ops/plan-vegetation-embellishments/index.js";

export const ops = {
  classifyBiomes,
  planFeaturePlacements,
  planPlotEffects,
  planReefEmbellishments,
  planVegetationEmbellishments,
} as const;

export * from "./artifacts.js";
export {
  EcologyConfigSchema,
  type EcologyConfig,
  type FeaturesConfig,
  type FeaturesDensityConfig,
} from "./config.js";
export {
  BiomeEngineBindingsSchema,
  type BiomeEngineBindings,
} from "./biome-bindings.js";
export {
  BIOME_SYMBOL_ORDER,
  biomeSymbolFromIndex,
  FEATURE_PLACEMENT_KEYS,
  type BiomeSymbol,
  type FeatureKey,
  type PlotEffectKey,
} from "./types.js";
export { type ResolvedFeaturesPlacementConfig } from "./ops/plan-feature-placements/schema.js";
export { type ResolvedPlotEffectsConfig } from "./ops/plan-plot-effects/schema.js";
export { resolveSnowElevationRange } from "./ops/plan-plot-effects/snow-elevation.js";

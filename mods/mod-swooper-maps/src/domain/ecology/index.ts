import { classifyBiomes } from "../ops/ecology/classify-biomes/index.js";
import { planFeaturePlacements } from "../ops/ecology/plan-feature-placements/index.js";
import { planPlotEffects } from "../ops/ecology/plan-plot-effects/index.js";
import { planReefEmbellishments } from "../ops/ecology/plan-reef-embellishments/index.js";
import { planVegetationEmbellishments } from "../ops/ecology/plan-vegetation-embellishments/index.js";

export const ops = {
  classifyBiomes,
  planFeaturePlacements,
  planPlotEffects,
  planReefEmbellishments,
  planVegetationEmbellishments,
} as const;

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
export { type ResolvedFeaturesPlacementConfig } from "../ops/ecology/plan-feature-placements/schema.js";
export { type ResolvedPlotEffectsConfig } from "../ops/ecology/plan-plot-effects/schema.js";
export { resolveSnowElevationRange } from "../ops/ecology/plan-plot-effects/snow-elevation.js";

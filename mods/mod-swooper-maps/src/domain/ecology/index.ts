import { classifyBiomes } from "./ops/classify-biomes/index.js";
import { planAquaticFeaturePlacements } from "./ops/plan-aquatic-feature-placements/index.js";
import { planIceFeaturePlacements } from "./ops/plan-ice-feature-placements/index.js";
import { planPlotEffects } from "./ops/plan-plot-effects/index.js";
import { planReefEmbellishments } from "./ops/plan-reef-embellishments/index.js";
import { planVegetatedFeaturePlacements } from "./ops/plan-vegetated-feature-placements/index.js";
import { planVegetationEmbellishments } from "./ops/plan-vegetation-embellishments/index.js";
import { planWetFeaturePlacements } from "./ops/plan-wet-feature-placements/index.js";

export const ops = {
  classifyBiomes,
  planAquaticFeaturePlacements,
  planIceFeaturePlacements,
  planPlotEffects,
  planReefEmbellishments,
  planVegetatedFeaturePlacements,
  planVegetationEmbellishments,
  planWetFeaturePlacements,
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
export { resolveSnowElevationRange } from "./ops/plan-plot-effects/snow-elevation.js";

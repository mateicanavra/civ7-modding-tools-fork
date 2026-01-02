import { classifyBiomes } from "./ops/classify-biomes.js";
import { featuresEmbellishments } from "./ops/features-embellishments/index.js";
import { featuresPlacement } from "./ops/features-placement/index.js";
import { plotEffects } from "./ops/plot-effects/index.js";

export const ops = {
  classifyBiomes,
  featuresEmbellishments,
  featuresPlacement,
  plotEffects,
} as const;

export * from "./artifacts.js";
export { logSnowEligibilitySummary } from "./ops/plot-effects/diagnostics.js";
export { resolvePlotEffectsConfig } from "./ops/plot-effects/index.js";
export {
  FeaturesConfigSchema,
  FeaturesDensityConfigSchema,
  type FeaturesConfig,
  type FeaturesDensityConfig,
} from "./config.js";
export {
  BiomeEngineBindingsSchema,
  DEFAULT_ENGINE_BINDINGS,
  resolveEngineBiomeIds,
  type BiomeEngineBindings,
  type ResolvedEngineBiomeIds,
} from "./biome-bindings.js";
export { BIOME_SYMBOL_ORDER, biomeSymbolFromIndex, type BiomeSymbol } from "./types.js";

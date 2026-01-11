import { classifyBiomes } from "./ops/classify-biomes/index.js";
import { applyFeatures } from "./ops/features-apply/index.js";
import { planAquaticFeaturePlacements } from "./ops/plan-aquatic-feature-placements/index.js";
import { planIceFeaturePlacements } from "./ops/plan-ice-feature-placements/index.js";
import { planPlotEffects } from "./ops/plan-plot-effects/index.js";
import { planReefEmbellishments } from "./ops/plan-reef-embellishments/index.js";
import { planVegetatedFeaturePlacements } from "./ops/plan-vegetated-feature-placements/index.js";
import { planVegetationEmbellishments } from "./ops/plan-vegetation-embellishments/index.js";
import { planWetFeaturePlacements } from "./ops/plan-wet-feature-placements/index.js";
import { classifyPedology } from "./ops/pedology-classify/index.js";
import { aggregatePedology } from "./ops/pedology-aggregate/index.js";
import { planResourceBasins } from "./ops/resource-plan-basins/index.js";
import { scoreResourceBasins } from "./ops/resource-score-balance/index.js";
import { refineBiomeEdges } from "./ops/refine-biome-edges/index.js";
import { planVegetation } from "./ops/features-plan-vegetation/index.js";
import { planWetlands } from "./ops/features-plan-wetlands/index.js";
import { planReefs } from "./ops/features-plan-reefs/index.js";
import { planIce } from "./ops/features-plan-ice/index.js";
import { createDomainOpsSurface } from "@swooper/mapgen-core/authoring";

const opImplementations = {
  classifyBiomes,
  classifyPedology,
  aggregatePedology,
  planResourceBasins,
  scoreResourceBasins,
  refineBiomeEdges,
  planAquaticFeaturePlacements,
  planIceFeaturePlacements,
  planPlotEffects,
  planReefEmbellishments,
  planVegetatedFeaturePlacements,
  planVegetationEmbellishments,
  planWetFeaturePlacements,
  planVegetation,
  planWetlands,
  planReefs,
  planIce,
  applyFeatures,
} as const;

export const ops = createDomainOpsSurface(opImplementations);

export * from "./contracts.js";

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

export default ops;

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
import type { DomainOpCompileAny, DomainOpRuntimeAny } from "@swooper/mapgen-core/authoring";
import { runtimeOp } from "@swooper/mapgen-core/authoring";

export const ops = {
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
};

export const compileOpsById = buildOpsById(ops);
export const runtimeOpsById = buildRuntimeOpsById(compileOpsById);

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

function buildOpsById<const TOps extends Record<string, DomainOpCompileAny>>(
  input: TOps
): Readonly<Record<string, DomainOpCompileAny>> {
  const out: Record<string, DomainOpCompileAny> = {};
  for (const op of Object.values(input)) out[op.id] = op;
  return out;
}

function buildRuntimeOpsById(
  input: Readonly<Record<string, DomainOpCompileAny>>
): Readonly<Record<string, DomainOpRuntimeAny>> {
  const out: Record<string, DomainOpRuntimeAny> = {};
  for (const [id, op] of Object.entries(input)) out[id] = runtimeOp(op);
  return out;
}

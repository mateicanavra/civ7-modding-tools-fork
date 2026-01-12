import AggregatePedologyContract from "./ops/pedology-aggregate/contract.js";
import BiomeClassificationContract from "./ops/classify-biomes/contract.js";
import FeaturesApplyContract from "./ops/features-apply/contract.js";
import PedologyClassifyContract from "./ops/pedology-classify/contract.js";
import PlanAquaticFeaturePlacementsContract from "./ops/plan-aquatic-feature-placements/contract.js";
import PlanIceContract from "./ops/features-plan-ice/contract.js";
import PlanIceFeaturePlacementsContract from "./ops/plan-ice-feature-placements/contract.js";
import PlanPlotEffectsContract from "./ops/plan-plot-effects/contract.js";
import PlanReefEmbellishmentsContract from "./ops/plan-reef-embellishments/contract.js";
import PlanReefsContract from "./ops/features-plan-reefs/contract.js";
import PlanVegetatedFeaturePlacementsContract from "./ops/plan-vegetated-feature-placements/contract.js";
import PlanVegetationContract from "./ops/features-plan-vegetation/contract.js";
import PlanVegetationEmbellishmentsContract from "./ops/plan-vegetation-embellishments/contract.js";
import PlanWetFeaturePlacementsContract from "./ops/plan-wet-feature-placements/contract.js";
import PlanWetlandsContract from "./ops/features-plan-wetlands/contract.js";
import RefineBiomeEdgesContract from "./ops/refine-biome-edges/contract.js";
import ResourcePlanBasinsContract from "./ops/resource-plan-basins/contract.js";
import ResourceScoreBalanceContract from "./ops/resource-score-balance/contract.js";

export const contracts = {
  classifyBiomes: BiomeClassificationContract,
  classifyPedology: PedologyClassifyContract,
  aggregatePedology: AggregatePedologyContract,
  planResourceBasins: ResourcePlanBasinsContract,
  scoreResourceBasins: ResourceScoreBalanceContract,
  refineBiomeEdges: RefineBiomeEdgesContract,
  planAquaticFeaturePlacements: PlanAquaticFeaturePlacementsContract,
  planIceFeaturePlacements: PlanIceFeaturePlacementsContract,
  planPlotEffects: PlanPlotEffectsContract,
  planReefEmbellishments: PlanReefEmbellishmentsContract,
  planVegetatedFeaturePlacements: PlanVegetatedFeaturePlacementsContract,
  planVegetationEmbellishments: PlanVegetationEmbellishmentsContract,
  planWetFeaturePlacements: PlanWetFeaturePlacementsContract,
  planVegetation: PlanVegetationContract,
  planWetlands: PlanWetlandsContract,
  planReefs: PlanReefsContract,
  planIce: PlanIceContract,
  applyFeatures: FeaturesApplyContract,
} as const;

export default contracts;

export {
  AggregatePedologyContract,
  BiomeClassificationContract,
  FeaturesApplyContract,
  PedologyClassifyContract,
  PlanAquaticFeaturePlacementsContract,
  PlanIceContract,
  PlanIceFeaturePlacementsContract,
  PlanPlotEffectsContract,
  PlanReefEmbellishmentsContract,
  PlanReefsContract,
  PlanVegetatedFeaturePlacementsContract,
  PlanVegetationContract,
  PlanVegetationEmbellishmentsContract,
  PlanWetFeaturePlacementsContract,
  PlanWetlandsContract,
  RefineBiomeEdgesContract,
  ResourcePlanBasinsContract,
  ResourceScoreBalanceContract,
};

export type { PlanWetFeaturePlacementsTypes } from "./ops/plan-wet-feature-placements/types.js";

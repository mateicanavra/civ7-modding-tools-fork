import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type ContractModule = typeof import("./contract.js");
type Contract = ContractModule["PlanFeaturePlacementsContract"];

export type PlanFeaturePlacementsTypes = OpTypeBag<Contract>;
export type { FeatureKey } from "@mapgen/domain/ecology/types.js";
export type ResolvedFeaturesPlacementConfig = ReturnType<
  ContractModule["resolveFeaturesPlacementConfig"]
>;

import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanVegetationEmbellishmentsContract;

export type PlanVegetationEmbellishmentsTypes = OpTypeBag<Contract>;
export type { BiomeSymbol, FeatureKey } from "@mapgen/domain/ecology/types.js";

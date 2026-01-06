import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanFeaturePlacementsContract;

export type PlanFeaturePlacementsTypes = OpTypeBag<Contract>;

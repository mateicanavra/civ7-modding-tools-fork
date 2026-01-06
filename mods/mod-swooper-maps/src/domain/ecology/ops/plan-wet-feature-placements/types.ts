import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanWetFeaturePlacementsContract;

export type PlanWetFeaturePlacementsTypes = OpTypeBag<Contract>;


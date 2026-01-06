import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanVegetatedFeaturePlacementsContract;

export type PlanVegetatedFeaturePlacementsTypes = OpTypeBag<Contract>;


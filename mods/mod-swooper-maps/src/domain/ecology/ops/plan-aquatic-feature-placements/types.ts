import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanAquaticFeaturePlacementsContract;

export type PlanAquaticFeaturePlacementsTypes = OpTypeBag<Contract>;


import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanWondersContract;

export type PlanWondersTypes = OpTypeBag<Contract>;

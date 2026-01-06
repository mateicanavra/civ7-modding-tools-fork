import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanStartsContract;

export type PlanStartsTypes = OpTypeBag<Contract>;

import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanFloodplainsContract;

export type PlanFloodplainsTypes = OpTypeBag<Contract>;

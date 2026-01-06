import type { OpTypeBag } from "@swooper/mapgen-core/authoring";

type Contract = typeof import("./contract.js").PlanPlotEffectsContract;

export type PlanPlotEffectsTypes = OpTypeBag<Contract>;

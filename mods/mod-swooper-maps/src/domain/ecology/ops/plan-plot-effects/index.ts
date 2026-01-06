import { createOp } from "@swooper/mapgen-core/authoring";
import { PlanPlotEffectsContract } from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

export const planPlotEffects = createOp(PlanPlotEffectsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export * from "./contract.js";
export type * from "./types.js";

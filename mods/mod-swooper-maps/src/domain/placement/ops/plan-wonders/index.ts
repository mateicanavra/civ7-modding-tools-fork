import { createOp } from "@swooper/mapgen-core/authoring";

import {
  PlanWondersConfigSchema,
  PlanWondersInputSchema,
  PlanWondersOutputSchema,
  type PlanWondersConfig,
  type PlanWondersInput,
  type PlanWondersOutput,
} from "./schema.js";

function resolveNaturalWonderCount(mapInfo: PlanWondersInput["mapInfo"], wondersPlusOne: boolean): number {
  if (!mapInfo || typeof mapInfo.NumNaturalWonders !== "number") {
    return 1;
  }
  if (wondersPlusOne) {
    return Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders);
  }
  return mapInfo.NumNaturalWonders;
}

export const planWonders = createOp({
  kind: "plan",
  id: "placement/plan-wonders",
  input: PlanWondersInputSchema,
  output: PlanWondersOutputSchema,
  config: PlanWondersConfigSchema,
  run: (input: PlanWondersInput, config: PlanWondersConfig): PlanWondersOutput => {
    const wondersCount = resolveNaturalWonderCount(input.mapInfo, config.wondersPlusOne);
    return { wondersCount };
  },
} as const);

export type { PlanWondersInput, PlanWondersOutput, PlanWondersConfig };

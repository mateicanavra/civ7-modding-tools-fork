import { createOp, type Static } from "@swooper/mapgen-core/authoring";

import { PlanWondersSchema } from "./schema.js";

type PlanWondersInput = Static<typeof PlanWondersSchema["properties"]["input"]>;
type PlanWondersConfig = Static<typeof PlanWondersSchema["properties"]["config"]>;
type PlanWondersOutput = Static<typeof PlanWondersSchema["properties"]["output"]>;
type MapInfo = PlanWondersInput["mapInfo"];

function resolveNaturalWonderCount(mapInfo: MapInfo, wondersPlusOne: boolean): number {
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
  schema: PlanWondersSchema,
  run: (input: PlanWondersInput, config: PlanWondersConfig) => {
    const wondersCount = resolveNaturalWonderCount(input.mapInfo, config.wondersPlusOne);
    return { wondersCount };
  },
} as const);

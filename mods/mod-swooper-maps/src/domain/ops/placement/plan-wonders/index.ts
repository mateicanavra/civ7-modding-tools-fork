import { createOp } from "@swooper/mapgen-core/authoring";

import { PlanWondersSchema } from "./schema.js";

export const planWonders = createOp({
  kind: "plan",
  id: "placement/plan-wonders",
  input: PlanWondersSchema.properties.input,
  output: PlanWondersSchema.properties.output,
  strategies: {
    default: {
      config: PlanWondersSchema.properties.config,
      run: (input, config) => {
        const mapInfo = input.mapInfo;
        const wondersPlusOne = config.wondersPlusOne;
        let wondersCount = 1;

        if (mapInfo && typeof mapInfo.NumNaturalWonders === "number") {
          wondersCount = wondersPlusOne
            ? Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders)
            : mapInfo.NumNaturalWonders;
        }

        return { wondersCount };
      },
    },
  },
});

import { createStrategy } from "@swooper/mapgen-core/authoring";

import PlanWondersContract from "../contract.js";
export const defaultStrategy = createStrategy(PlanWondersContract, "default", {
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
});

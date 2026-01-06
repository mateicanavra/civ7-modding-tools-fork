import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import { CoastlinesStepContract } from "./coastlines.contract.js";

export default createStep(CoastlinesStepContract, {
  run: (context: ExtendedMapContext) => {
    const { width, height } = context.dimensions;
    context.adapter.expandCoasts(width, height);
  },
});

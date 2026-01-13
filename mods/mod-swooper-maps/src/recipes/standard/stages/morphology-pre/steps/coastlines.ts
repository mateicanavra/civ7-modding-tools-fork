import { createStep } from "@swooper/mapgen-core/authoring";
import CoastlinesStepContract from "./coastlines.contract.js";
export default createStep(CoastlinesStepContract, {
  run: (context) => {
    const { width, height } = context.dimensions;
    context.adapter.expandCoasts(width, height);
  },
});

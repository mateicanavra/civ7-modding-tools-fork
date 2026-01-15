import { createStrategy } from "@swooper/mapgen-core/authoring";
import ComputeGeomorphicCycleContract from "../contract.js";
import { computeGeomorphicDeltas, validateGeomorphicInputs } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeGeomorphicCycleContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const { elevation, flowAccum, erodibility, sedimentDepth, landMask } =
      validateGeomorphicInputs(input);

    return computeGeomorphicDeltas({
      width,
      height,
      elevation,
      flowAccum,
      erodibility,
      sedimentDepth,
      landMask,
      config,
    });
  },
});

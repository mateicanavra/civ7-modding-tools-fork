import { createStrategy } from "@swooper/mapgen-core/authoring";
import ComputeFlowRoutingContract from "../contract.js";
import {
  computeFlowAccumulation,
  selectFlowReceiver,
  validateFlowRoutingInputs,
} from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeFlowRoutingContract, "default", {
  run: (input) => {
    const { width, height } = input;
    const { size, elevation, landMask } = validateFlowRoutingInputs(input);

    const flowDir = new Int32Array(size);
    flowDir.fill(-1);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (landMask[i] === 0) {
          flowDir[i] = -1;
          continue;
        }
        flowDir[i] = selectFlowReceiver(x, y, width, height, elevation);
      }
    }
    const flowAccum = computeFlowAccumulation(elevation, landMask, flowDir);

    const basinId = new Int32Array(size);
    basinId.fill(-1);

    return { flowDir, flowAccum, basinId };
  },
});

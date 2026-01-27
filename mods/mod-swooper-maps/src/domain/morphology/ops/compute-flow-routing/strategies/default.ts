import { createStrategy } from "@swooper/mapgen-core/authoring";
import { computeFlowRoutingPriorityFlood } from "@swooper/mapgen-core/lib/grid";
import ComputeFlowRoutingContract from "../contract.js";
import {
  computeFlowAccumulation,
  validateFlowRoutingInputs,
} from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeFlowRoutingContract, "default", {
  run: (input) => {
    const { width, height } = input;
    const { size, elevation, landMask } = validateFlowRoutingInputs(input);

    const routing = computeFlowRoutingPriorityFlood({
      width,
      height,
      elevation,
      landMask,
      config: { epsilon: 1e-3, outlets: "water" },
    });

    const flowDir = routing.flowDir;
    const routingElevation = routing.routingElevation;
    const flowAccum = computeFlowAccumulation(landMask, flowDir);

    const basinId = new Int32Array(size);
    basinId.fill(-1);

    return { flowDir, flowAccum, routingElevation, basinId };
  },
});

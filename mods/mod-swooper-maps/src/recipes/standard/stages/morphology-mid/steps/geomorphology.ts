import { createStep } from "@swooper/mapgen-core/authoring";

import GeomorphologyStepContract from "./geomorphology.contract.js";

function clampInt16(value: number): number {
  if (value > 32767) return 32767;
  if (value < -32768) return -32768;
  return value;
}

export default createStep(GeomorphologyStepContract, {
  run: (context, config, ops, deps) => {
    const heightfield = context.buffers.heightfield;
    const routing = deps.artifacts.routing.read(context);
    const substrate = deps.artifacts.substrate.read(context) as {
      erodibilityK: Float32Array;
      sedimentDepth: Float32Array;
    };
    const { width, height } = context.dimensions;

    const deltas = ops.geomorphology(
      {
        width,
        height,
        elevation: heightfield.elevation,
        landMask: heightfield.landMask,
        flowAccum: routing.flowAccum,
        erodibilityK: substrate.erodibilityK,
        sedimentDepth: substrate.sedimentDepth,
      },
      config.geomorphology
    );

    const elevation = heightfield.elevation;
    const sedimentDepth = substrate.sedimentDepth;

    for (let i = 0; i < elevation.length; i++) {
      const nextElevation = clampInt16(Math.round(elevation[i] + deltas.elevationDelta[i]));
      elevation[i] = nextElevation;
      sedimentDepth[i] = Math.max(0, sedimentDepth[i] + deltas.sedimentDelta[i]);
    }
  },
});

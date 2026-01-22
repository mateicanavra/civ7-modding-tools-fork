import { createStep } from "@swooper/mapgen-core/authoring";

import GeomorphologyStepContract from "./geomorphology.contract.js";

function clampInt16(value: number): number {
  if (value > 32767) return 32767;
  if (value < -32768) return -32768;
  return value;
}

export default createStep(GeomorphologyStepContract, {
  run: (context, config, ops, deps) => {
    const routing = deps.artifacts.routing.read(context);
    const substrate = deps.artifacts.substrate.read(context) as {
      erodibilityK: Float32Array;
      sedimentDepth: Float32Array;
    };
    const { width, height } = context.dimensions;
    const heightfield = context.buffers.heightfield;

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

    context.trace.event(() => {
      const size = Math.max(0, (width | 0) * (height | 0));
      const landMask = heightfield.landMask;

      let landTiles = 0;
      let deltaMin = 0;
      let deltaMax = 0;
      let deltaSum = 0;
      let elevationMin = 0;
      let elevationMax = 0;

      for (let i = 0; i < size; i++) {
        if (landMask[i] !== 1) continue;
        landTiles += 1;

        const delta = deltas.elevationDelta[i] ?? 0;
        if (landTiles === 1 || delta < deltaMin) deltaMin = delta;
        if (landTiles === 1 || delta > deltaMax) deltaMax = delta;
        deltaSum += delta;

        const nextElevation = elevation[i] ?? 0;
        if (landTiles === 1 || nextElevation < elevationMin) elevationMin = nextElevation;
        if (landTiles === 1 || nextElevation > elevationMax) elevationMax = nextElevation;
      }

      return {
        kind: "morphology.geomorphology.summary",
        landTiles,
        elevationDeltaMin: landTiles ? Number(deltaMin.toFixed(4)) : 0,
        elevationDeltaMax: landTiles ? Number(deltaMax.toFixed(4)) : 0,
        elevationDeltaMean: landTiles ? Number((deltaSum / landTiles).toFixed(4)) : 0,
        elevationMin,
        elevationMax,
      };
    });
  },
});

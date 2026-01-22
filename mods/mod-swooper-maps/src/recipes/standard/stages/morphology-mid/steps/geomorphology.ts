import { createStep } from "@swooper/mapgen-core/authoring";

import GeomorphologyStepContract from "./geomorphology.contract.js";
import { MORPHOLOGY_EROSION_RATE_MULTIPLIER } from "@mapgen/domain/morphology/shared/knob-multipliers.js";
import type { MorphologyErosionKnob } from "@mapgen/domain/morphology/shared/knobs.js";

function clampInt16(value: number): number {
  if (value > 32767) return 32767;
  if (value < -32768) return -32768;
  return value;
}

function roundHalfAwayFromZero(value: number): number {
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

function clampNumber(value: number, bounds: { min: number; max?: number }): number {
  if (!Number.isFinite(value)) return bounds.min;
  const max = bounds.max ?? Number.POSITIVE_INFINITY;
  return Math.max(bounds.min, Math.min(max, value));
}

export default createStep(GeomorphologyStepContract, {
  normalize: (config, ctx) => {
    const { erosion } = ctx.knobs as Readonly<{ erosion?: MorphologyErosionKnob }>;
    const multiplier = MORPHOLOGY_EROSION_RATE_MULTIPLIER[erosion ?? "normal"] ?? 1.0;

    const geomorphologySelection =
      config.geomorphology.strategy === "default"
        ? {
            ...config.geomorphology,
            config: {
              ...config.geomorphology.config,
              geomorphology: {
                ...config.geomorphology.config.geomorphology,
                fluvial: {
                  ...config.geomorphology.config.geomorphology.fluvial,
                  rate: clampNumber(config.geomorphology.config.geomorphology.fluvial.rate * multiplier, { min: 0 }),
                },
                diffusion: {
                  ...config.geomorphology.config.geomorphology.diffusion,
                  rate: clampNumber(config.geomorphology.config.geomorphology.diffusion.rate * multiplier, { min: 0 }),
                },
                deposition: {
                  ...config.geomorphology.config.geomorphology.deposition,
                  rate: clampNumber(config.geomorphology.config.geomorphology.deposition.rate * multiplier, { min: 0 }),
                },
              },
            },
          }
        : config.geomorphology;

    return { ...config, geomorphology: geomorphologySelection };
  },
  run: (context, config, ops, deps) => {
    const topography = deps.artifacts.topography.read(context) as {
      seaLevel?: number;
      bathymetry?: Int16Array;
    };
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

    const seaLevel = typeof topography.seaLevel === "number" ? topography.seaLevel : 0;
    const bathymetry = topography.bathymetry;
    if (!(bathymetry instanceof Int16Array) || bathymetry.length !== elevation.length) {
      throw new Error("Morphology topography bathymetry buffer missing or shape-mismatched.");
    }
    for (let i = 0; i < elevation.length; i++) {
      const isLand = elevation[i] > seaLevel;
      heightfield.landMask[i] = isLand ? 1 : 0;
      if (isLand) {
        bathymetry[i] = 0;
      } else {
        const delta = Math.min(0, elevation[i] - seaLevel);
        bathymetry[i] = clampInt16(roundHalfAwayFromZero(delta));
      }
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

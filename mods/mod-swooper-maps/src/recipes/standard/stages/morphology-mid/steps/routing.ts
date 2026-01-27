import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";

import RoutingStepContract from "./routing.contract.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectedSize(dimensions: MapDimensions): number {
  return Math.max(0, (dimensions.width | 0) * (dimensions.height | 0));
}

function validateTypedArray(
  errors: ArtifactValidationIssue[],
  label: string,
  value: unknown,
  ctor: { new (...args: any[]): { length: number } },
  expectedLength?: number
): value is { length: number } {
  if (!(value instanceof ctor)) {
    errors.push({ message: `Expected ${label} to be ${ctor.name}.` });
    return false;
  }
  if (expectedLength != null && value.length !== expectedLength) {
    errors.push({
      message: `Expected ${label} length ${expectedLength} (received ${value.length}).`,
    });
  }
  return true;
}

function validateRoutingBuffer(value: unknown, dimensions: MapDimensions): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing routing buffer." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as { flowDir?: unknown; flowAccum?: unknown; routingElevation?: unknown; basinId?: unknown };
  validateTypedArray(errors, "routing.flowDir", candidate.flowDir, Int32Array, size);
  validateTypedArray(errors, "routing.flowAccum", candidate.flowAccum, Float32Array, size);
  if (candidate.routingElevation != null) {
    validateTypedArray(errors, "routing.routingElevation", candidate.routingElevation, Float32Array, size);
  }
  if (candidate.basinId != null) {
    validateTypedArray(errors, "routing.basinId", candidate.basinId, Int32Array, size);
  }
  return errors;
}

export default createStep(RoutingStepContract, {
  artifacts: implementArtifacts(RoutingStepContract.artifacts!.provides!, {
    routing: {
      validate: (value, context) => validateRoutingBuffer(value, context.dimensions),
    },
  }),
  run: (context, config, ops, deps) => {
    const topography = deps.artifacts.topography.read(context);
    const { width, height } = context.dimensions;
    const routing = ops.routing(
      {
        width,
        height,
        elevation: topography.elevation,
        landMask: topography.landMask,
      },
      config.routing
    );
    context.trace.event(() => {
      const size = Math.max(0, (width | 0) * (height | 0));
      const flowDir = routing.flowDir;
      const flowAccum = routing.flowAccum;
      const landMask = topography.landMask;

      let landTiles = 0;
      let sinks = 0;
      let minFlow = 0;
      let maxFlow = 0;
      let sumFlow = 0;

      for (let i = 0; i < size; i++) {
        if (landMask[i] !== 1) continue;
        landTiles += 1;

        const dir = flowDir[i] ?? -1;
        if (dir < 0) sinks += 1;

        const flow = flowAccum[i] ?? 0;
        if (landTiles === 1 || flow < minFlow) minFlow = flow;
        if (landTiles === 1 || flow > maxFlow) maxFlow = flow;
        sumFlow += flow;
      }

      return {
        kind: "morphology.routing.summary",
        landTiles,
        sinks,
        flowAccumMin: landTiles ? Number(minFlow.toFixed(4)) : 0,
        flowAccumMax: landTiles ? Number(maxFlow.toFixed(4)) : 0,
        flowAccumMean: landTiles ? Number((sumFlow / landTiles).toFixed(4)) : 0,
      };
    });
    deps.artifacts.routing.publish(context, routing);
  },
});

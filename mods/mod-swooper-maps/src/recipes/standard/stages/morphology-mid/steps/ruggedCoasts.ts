import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import { addRuggedCoasts } from "@mapgen/domain/morphology/coastlines/index.js";
import { readOverlayCorridors, readOverlayMotifsMargins } from "../../../overlays.js";
import RuggedCoastsStepContract from "./ruggedCoasts.contract.js";

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

function validateCoastlineMetrics(value: unknown, dimensions: MapDimensions): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing coastline metrics." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as { coastalLand?: unknown; coastalWater?: unknown };
  validateTypedArray(errors, "coastlineMetrics.coastalLand", candidate.coastalLand, Uint8Array, size);
  validateTypedArray(errors, "coastlineMetrics.coastalWater", candidate.coastalWater, Uint8Array, size);
  return errors;
}

function computeCoastlineMetrics(width: number, height: number, landMask: Uint8Array): {
  coastalLand: Uint8Array;
  coastalWater: Uint8Array;
} {
  const size = Math.max(0, (width | 0) * (height | 0));
  if (landMask.length !== size) {
    throw new Error(
      `Expected heightfield.landMask length ${size} (received ${landMask.length}).`
    );
  }

  const coastalLand = new Uint8Array(size);
  const coastalWater = new Uint8Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const isLand = (landMask[i] | 0) === 1;
      let hasOpposite = false;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        if (hasOpposite) return;
        const ni = ny * width + nx;
        const neighborIsLand = (landMask[ni] | 0) === 1;
        if (neighborIsLand !== isLand) hasOpposite = true;
      });
      if (!hasOpposite) continue;
      if (isLand) coastalLand[i] = 1;
      else coastalWater[i] = 1;
    }
  }

  return { coastalLand, coastalWater };
}

export default createStep(RuggedCoastsStepContract, {
  artifacts: implementArtifacts(RuggedCoastsStepContract.artifacts!.provides!, {
    coastlineMetrics: {
      validate: (value, context) => validateCoastlineMetrics(value, context.dimensions),
    },
  }),
  run: (context, config, _ops, deps) => {
    const { width, height } = context.dimensions;
    const plates = deps.artifacts.foundationPlates.read(context);
    const overlays = deps.artifacts.overlays.read(context);
    const margins = readOverlayMotifsMargins(overlays);
    const corridors = readOverlayCorridors(overlays);
    addRuggedCoasts(width, height, context, config, plates, { margins, corridors });

    const metrics = computeCoastlineMetrics(width, height, context.buffers.heightfield.landMask);
    deps.artifacts.coastlineMetrics.publish(context, metrics);
  },
});

import type { MapDimensions } from "@civ7/adapter";
import {
  COAST_TERRAIN,
  FLAT_TERRAIN,
  OCEAN_TERRAIN,
  writeHeightfield,
} from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import RuggedCoastsStepContract from "./ruggedCoasts.contract.js";
import { deriveStepSeed } from "../../ecology/steps/helpers/seed.js";

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

export default createStep(RuggedCoastsStepContract, {
  artifacts: implementArtifacts(RuggedCoastsStepContract.artifacts!.provides!, {
    coastlineMetrics: {
      validate: (value, context) => validateCoastlineMetrics(value, context.dimensions),
    },
  }),
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const plates = deps.artifacts.foundationPlates.read(context);
    const heightfield = context.buffers.heightfield;
    const rngSeed = deriveStepSeed(context.env.seed, "morphology:computeCoastlineMetrics");

    const result = ops.coastlines(
      {
        width,
        height,
        landMask: heightfield.landMask,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        rngSeed,
      },
      config.coastlines
    );

    const updatedLandMask = result.landMask;
    const coastMask = result.coastMask;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (coastMask[i] === 1) {
          writeHeightfield(context, x, y, { terrain: COAST_TERRAIN, isLand: false });
          continue;
        }
        const isLand = updatedLandMask[i] === 1;
        const currentIsLand = heightfield.landMask[i] === 1;
        if (isLand !== currentIsLand) {
          const terrain = isLand ? FLAT_TERRAIN : OCEAN_TERRAIN;
          writeHeightfield(context, x, y, { terrain, isLand });
        } else if (!isLand && heightfield.terrain[i] === COAST_TERRAIN) {
          writeHeightfield(context, x, y, { terrain: OCEAN_TERRAIN, isLand: false });
        }
      }
    }

    deps.artifacts.coastlineMetrics.publish(context, {
      coastalLand: result.coastalLand,
      coastalWater: result.coastalWater,
    });
  },
});

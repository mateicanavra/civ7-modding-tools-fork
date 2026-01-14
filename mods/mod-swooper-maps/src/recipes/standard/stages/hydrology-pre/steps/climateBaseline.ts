import {
  ctxRandom,
  ctxRandomLabel,
  logElevationSummary,
  syncHeightfield,
} from "@swooper/mapgen-core";
import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { hydrologyPreArtifacts } from "../artifacts.js";
import { applyClimateBaseline } from "@mapgen/domain/hydrology/climate/index.js";
import ClimateBaselineStepContract from "./climateBaseline.contract.js";

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

function validateClimateFieldBuffer(
  value: unknown,
  dimensions: MapDimensions
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing climate field buffer." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as { rainfall?: unknown; humidity?: unknown };
  validateTypedArray(errors, "climate.rainfall", candidate.rainfall, Uint8Array, size);
  validateTypedArray(errors, "climate.humidity", candidate.humidity, Uint8Array, size);
  return errors;
}

export default createStep(ClimateBaselineStepContract, {
  artifacts: implementArtifacts([hydrologyPreArtifacts.climateField, hydrologyPreArtifacts.windField], {
    climateField: {
      validate: (value, context) => validateClimateFieldBuffer(value, context.dimensions),
    },
    windField: {
      validate: (value, context) => {
        const errors: ArtifactValidationIssue[] = [];
        const size = expectedSize(context.dimensions);
        if (!isRecord(value)) {
          return [{ message: "Missing wind field artifact payload." }];
        }
        const candidate = value as {
          windU?: unknown;
          windV?: unknown;
          currentU?: unknown;
          currentV?: unknown;
        };
        validateTypedArray(errors, "wind.windU", candidate.windU, Int8Array, size);
        validateTypedArray(errors, "wind.windV", candidate.windV, Int8Array, size);
        validateTypedArray(errors, "wind.currentU", candidate.currentU, Int8Array, size);
        validateTypedArray(errors, "wind.currentV", candidate.currentV, Int8Array, size);
        return errors;
      },
    },
  }),
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;

    context.adapter.recalculateAreas();
    context.adapter.buildElevation();
    context.adapter.recalculateAreas();
    context.adapter.stampContinents();

    syncHeightfield(context);
    logElevationSummary(context.trace, context.adapter, width, height, "post-buildElevation");

    const latitudeByRow = new Float32Array(height);
    for (let y = 0; y < height; y++) {
      latitudeByRow[y] = context.adapter.getLatitude(0, y);
    }

    const isWaterMask = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x;
        isWaterMask[i] = context.adapter.isWater(x, y) ? 1 : 0;
      }
    }

    const stepId = `${ClimateBaselineStepContract.phase}/${ClimateBaselineStepContract.id}`;
    const rngSeed = ctxRandom(context, ctxRandomLabel(stepId, "hydrology/compute-wind-fields"), 2_147_483_647);
    const windResult = ops.computeWindFields(
      {
        width,
        height,
        latitudeByRow,
        isWaterMask,
        rngSeed,
      },
      config.computeWindFields
    );

    applyClimateBaseline(width, height, context, config.climate);
    deps.artifacts.climateField.publish(context, context.buffers.climate);
    deps.artifacts.windField.publish(context, windResult.wind);
  },
});

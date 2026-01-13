import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { syncHeightfield, type MapDimensions } from "@swooper/mapgen-core";
import { getStandardRuntime } from "../../../runtime.js";
import { hydrologyPreArtifacts } from "../artifacts.js";
import LakesStepContract from "./lakes.contract.js";

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

function validateHeightfieldBuffer(
  value: unknown,
  dimensions: MapDimensions
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing heightfield buffer." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as {
    elevation?: unknown;
    terrain?: unknown;
    landMask?: unknown;
  };
  validateTypedArray(errors, "heightfield.elevation", candidate.elevation, Int16Array, size);
  validateTypedArray(errors, "heightfield.terrain", candidate.terrain, Uint8Array, size);
  validateTypedArray(errors, "heightfield.landMask", candidate.landMask, Uint8Array, size);
  return errors;
}

export default createStep(LakesStepContract, {
  artifacts: implementArtifacts([hydrologyPreArtifacts.heightfield], {
    heightfield: {
      validate: (value, context) => validateHeightfieldBuffer(value, context.dimensions),
    },
  }),
  run: (context, _config, _ops, deps) => {
    const runtime = getStandardRuntime(context);
    const { width, height } = context.dimensions;
    const iTilesPerLake = Math.max(10, (runtime.mapInfo.LakeGenerationFrequency ?? 5) * 2);
    context.adapter.generateLakes(width, height, iTilesPerLake);
    syncHeightfield(context);
    deps.artifacts.heightfield.publish(context, context.buffers.heightfield);
  },
});

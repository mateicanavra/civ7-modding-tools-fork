import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { syncHeightfield } from "@swooper/mapgen-core";
import { getStandardRuntime } from "../../../runtime.js";
import { hydrologyClimateBaselineArtifacts } from "../artifacts.js";
import LakesStepContract from "./lakes.contract.js";
import { HYDROLOGY_LAKEINESS_TILES_PER_LAKE_MULTIPLIER } from "@mapgen/domain/hydrology/shared/knob-multipliers.js";

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
  artifacts: implementArtifacts([hydrologyClimateBaselineArtifacts.heightfield], {
    heightfield: {
      validate: (value, context) => validateHeightfieldBuffer(value, context.dimensions),
    },
  }),
  normalize: (config, ctx) => {
    if (config.tilesPerLakeMultiplier !== 1) return config;

    const knobs = isRecord(ctx.knobs) ? ctx.knobs : {};
    const lakeinessRaw = knobs.lakeiness;
    const lakeiness =
      lakeinessRaw === "few" || lakeinessRaw === "normal" || lakeinessRaw === "many"
        ? lakeinessRaw
        : "normal";

    const tilesPerLakeMultiplier = HYDROLOGY_LAKEINESS_TILES_PER_LAKE_MULTIPLIER[lakeiness];

    return tilesPerLakeMultiplier === 1
      ? config
      : { ...config, tilesPerLakeMultiplier };
  },
  run: (context, config, _ops, deps) => {
    const runtime = getStandardRuntime(context);
    const { width, height } = context.dimensions;
    const baseTilesPerLake = Math.max(10, (runtime.mapInfo.LakeGenerationFrequency ?? 5) * 2);
    const tilesPerLake = Math.max(10, Math.round(baseTilesPerLake * config.tilesPerLakeMultiplier));
    context.adapter.generateLakes(width, height, tilesPerLake);
    syncHeightfield(context);
    deps.artifacts.heightfield.publish(context, context.buffers.heightfield);
  },
});

import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { hydrologyHydrographyArtifacts } from "../artifacts.js";
import RiversStepContract from "./rivers.contract.js";
import {
  HYDROLOGY_RIVER_DENSITY_MAJOR_PERCENTILE,
  HYDROLOGY_RIVER_DENSITY_MINOR_PERCENTILE,
} from "@mapgen/domain/hydrology/shared/knob-multipliers.js";
import type { HydrologyRiverDensityKnob } from "@mapgen/domain/hydrology/shared/knobs.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

function expectedSize(dimensions: MapDimensions): number {
  return Math.max(0, (dimensions.width | 0) * (dimensions.height | 0));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function validateHydrography(value: unknown, dimensions: MapDimensions): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  const size = expectedSize(dimensions);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    errors.push({ message: "Missing hydrology hydrography artifact payload." });
    return errors;
  }
  const candidate = value as {
    runoff?: unknown;
    discharge?: unknown;
    riverClass?: unknown;
    sinkMask?: unknown;
    outletMask?: unknown;
    basinId?: unknown;
  };
  validateTypedArray(errors, "hydrography.runoff", candidate.runoff, Float32Array, size);
  validateTypedArray(errors, "hydrography.discharge", candidate.discharge, Float32Array, size);
  validateTypedArray(errors, "hydrography.riverClass", candidate.riverClass, Uint8Array, size);
  validateTypedArray(errors, "hydrography.sinkMask", candidate.sinkMask, Uint8Array, size);
  validateTypedArray(errors, "hydrography.outletMask", candidate.outletMask, Uint8Array, size);
  if (candidate.basinId != null) validateTypedArray(errors, "hydrography.basinId", candidate.basinId, Int32Array, size);
  return errors;
}

export default createStep(RiversStepContract, {
  artifacts: implementArtifacts([hydrologyHydrographyArtifacts.hydrography], {
    hydrography: {
      validate: (value, context) => validateHydrography(value, context.dimensions),
    },
  }),
  normalize: (config, ctx) => {
    const { riverDensity } = ctx.knobs as { riverDensity: HydrologyRiverDensityKnob };
    if (config.projectRiverNetwork.strategy !== "default") return config;

    const minorDelta =
      HYDROLOGY_RIVER_DENSITY_MINOR_PERCENTILE[riverDensity] -
      HYDROLOGY_RIVER_DENSITY_MINOR_PERCENTILE.normal;
    const majorDelta =
      HYDROLOGY_RIVER_DENSITY_MAJOR_PERCENTILE[riverDensity] -
      HYDROLOGY_RIVER_DENSITY_MAJOR_PERCENTILE.normal;

    const minorPercentile = Math.max(
      0,
      Math.min(1, config.projectRiverNetwork.config.minorPercentile + minorDelta)
    );
    const majorPercentile = Math.max(
      0,
      Math.min(1, config.projectRiverNetwork.config.majorPercentile + majorDelta)
    );

    return {
      ...config,
      projectRiverNetwork: {
        ...config.projectRiverNetwork,
        config: { ...config.projectRiverNetwork.config, minorPercentile, majorPercentile },
      },
    };
  },
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const topography = deps.artifacts.topography.read(context) as {
      elevation: Int16Array;
      landMask: Uint8Array;
    };
    const routing = deps.artifacts.routing.read(context) as { flowDir: Int32Array };
    const climateField = deps.artifacts.climateField.read(context) as {
      rainfall: Uint8Array;
      humidity: Uint8Array;
    };
    const flowDir = routing.flowDir;

    const discharge = ops.accumulateDischarge(
      {
        width,
        height,
        landMask: topography.landMask,
        flowDir,
        rainfall: climateField.rainfall,
        humidity: climateField.humidity,
      },
      config.accumulateDischarge
    );

    const projected = ops.projectRiverNetwork(
      {
        width,
        height,
        landMask: topography.landMask,
        discharge: discharge.discharge,
      },
      config.projectRiverNetwork
    );

    deps.artifacts.hydrography.publish(context, {
      runoff: discharge.runoff,
      discharge: discharge.discharge,
      riverClass: projected.riverClass,
      sinkMask: discharge.sinkMask,
      outletMask: discharge.outletMask,
    });
  },
});

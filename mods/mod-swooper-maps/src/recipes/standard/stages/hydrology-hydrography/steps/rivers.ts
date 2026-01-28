import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import { hydrologyHydrographyArtifacts } from "../artifacts.js";
import RiversStepContract from "./rivers.contract.js";
import { HYDROLOGY_RIVER_DENSITY_RUNOFF_SCALE_MULTIPLIER } from "@mapgen/domain/hydrology/shared/knob-multipliers.js";
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
    slope01?: unknown;
    confinement01?: unknown;
    channelWidthTiles?: unknown;
    riverClass?: unknown;
    sinkMask?: unknown;
    outletMask?: unknown;
    basinId?: unknown;
  };
  validateTypedArray(errors, "hydrography.runoff", candidate.runoff, Float32Array, size);
  validateTypedArray(errors, "hydrography.discharge", candidate.discharge, Float32Array, size);
  if (candidate.slope01 != null) validateTypedArray(errors, "hydrography.slope01", candidate.slope01, Float32Array, size);
  if (candidate.confinement01 != null)
    validateTypedArray(errors, "hydrography.confinement01", candidate.confinement01, Float32Array, size);
  if (candidate.channelWidthTiles != null)
    validateTypedArray(errors, "hydrography.channelWidthTiles", candidate.channelWidthTiles, Float32Array, size);
  validateTypedArray(errors, "hydrography.riverClass", candidate.riverClass, Uint8Array, size);
  validateTypedArray(errors, "hydrography.sinkMask", candidate.sinkMask, Uint8Array, size);
  validateTypedArray(errors, "hydrography.outletMask", candidate.outletMask, Uint8Array, size);
  if (candidate.basinId != null) validateTypedArray(errors, "hydrography.basinId", candidate.basinId, Int32Array, size);
  return errors;
}

function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

function computeSlope01(
  width: number,
  height: number,
  landMask: Uint8Array,
  flowDir: Int32Array,
  routingElevation: Float32Array | undefined,
  elevation: Int16Array
): Float32Array {
  const size = Math.max(0, (width | 0) * (height | 0));
  const slope01 = new Float32Array(size);
  if (size === 0) return slope01;

  const maxDropM = 250;

  const elevAt = (i: number): number =>
    routingElevation ? (routingElevation[i] ?? 0) : (elevation[i] ?? 0);

  for (let i = 0; i < size; i++) {
    if (landMask[i] !== 1) continue;
    const dest = flowDir[i] ?? -1;
    if (dest < 0 || dest >= size || landMask[dest] !== 1) continue;
    const drop = elevAt(i) - elevAt(dest);
    slope01[i] = clamp01(Math.max(0, drop) / maxDropM);
  }

  return slope01;
}

function computeConfinement01(
  width: number,
  height: number,
  landMask: Uint8Array,
  routingElevation: Float32Array | undefined,
  elevation: Int16Array
): Float32Array {
  const size = Math.max(0, (width | 0) * (height | 0));
  const confinement01 = new Float32Array(size);
  if (size === 0) return confinement01;

  const reliefScaleM = 400;
  const elevAt = (i: number): number =>
    routingElevation ? (routingElevation[i] ?? 0) : (elevation[i] ?? 0);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const i = rowOffset + x;
      if (landMask[i] !== 1) continue;

      const floorElev = elevAt(i);
      let maxNeighborElev = floorElev;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const ni = ny * width + nx;
        if (landMask[ni] !== 1) return;
        const e = elevAt(ni);
        if (e > maxNeighborElev) maxNeighborElev = e;
      });

      const relief = maxNeighborElev - floorElev;
      confinement01[i] = clamp01(Math.max(0, relief) / reliefScaleM);
    }
  }

  return confinement01;
}

export default createStep(RiversStepContract, {
  artifacts: implementArtifacts([hydrologyHydrographyArtifacts.hydrography], {
    hydrography: {
      validate: (value, context) => validateHydrography(value, context.dimensions),
    },
  }),
  normalize: (config, ctx) => {
    const { riverDensity } = ctx.knobs as { riverDensity: HydrologyRiverDensityKnob };
    if (config.accumulateDischarge.strategy !== "default") return config;

    const mul = HYDROLOGY_RIVER_DENSITY_RUNOFF_SCALE_MULTIPLIER[riverDensity] ?? 1;
    const runoffScale = Math.max(0, (config.accumulateDischarge.config.runoffScale ?? 1) * mul);
    if (runoffScale === config.accumulateDischarge.config.runoffScale) return config;

    return {
      ...config,
      accumulateDischarge: {
        ...config.accumulateDischarge,
        config: { ...config.accumulateDischarge.config, runoffScale },
      },
    };
  },
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const topography = deps.artifacts.topography.read(context) as {
      elevation: Int16Array;
      landMask: Uint8Array;
    };
    const routing = deps.artifacts.routing.read(context) as { flowDir: Int32Array; routingElevation?: Float32Array };
    const climateField = deps.artifacts.climateField.read(context) as {
      rainfall: Uint8Array;
      humidity: Uint8Array;
    };
    const flowDir = routing.flowDir;
    const routingElevation = routing.routingElevation;

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

    const slope01 = computeSlope01(
      width,
      height,
      topography.landMask,
      flowDir,
      routingElevation,
      topography.elevation
    );

    const confinement01 = computeConfinement01(
      width,
      height,
      topography.landMask,
      routingElevation,
      topography.elevation
    );

    const projected = ops.projectRiverNetwork(
      {
        width,
        height,
        landMask: topography.landMask,
        discharge: discharge.discharge,
        slope01,
        confinement01,
      },
      config.projectRiverNetwork
    );

    const payload: {
      runoff: Float32Array;
      discharge: Float32Array;
      slope01: Float32Array;
      confinement01: Float32Array;
      channelWidthTiles?: Float32Array;
      riverClass: Uint8Array;
      sinkMask: Uint8Array;
      outletMask: Uint8Array;
    } = {
      runoff: discharge.runoff,
      discharge: discharge.discharge,
      slope01,
      confinement01,
      riverClass: projected.riverClass,
      sinkMask: discharge.sinkMask,
      outletMask: discharge.outletMask,
    };

    if (projected.channelWidthTiles) payload.channelWidthTiles = projected.channelWidthTiles;

    deps.artifacts.hydrography.publish(context, payload);
  },
});

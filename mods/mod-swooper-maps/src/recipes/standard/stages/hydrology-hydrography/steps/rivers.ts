import type { MapDimensions } from "@civ7/adapter";
import {
  HILL_TERRAIN,
  MOUNTAIN_TERRAIN,
  NAVIGABLE_RIVER_TERRAIN,
  syncHeightfield,
} from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { hydrologyHydrographyArtifacts } from "../artifacts.js";
import RiversStepContract from "./rivers.contract.js";
import {
  HYDROLOGY_RIVER_DENSITY_LENGTH_BOUNDS,
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

function clampInt(value: number, min: number, max: number): number {
  const int = Math.trunc(value);
  if (int < min) return min;
  if (int > max) return max;
  return int;
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
    const normalBounds = HYDROLOGY_RIVER_DENSITY_LENGTH_BOUNDS.normal;
    const bounds = HYDROLOGY_RIVER_DENSITY_LENGTH_BOUNDS[riverDensity];
    const minLengthDelta = bounds.minLength - normalBounds.minLength;
    const maxLengthDelta = bounds.maxLength - normalBounds.maxLength;

    const minLength = clampInt(config.minLength + minLengthDelta, 1, 40);
    let maxLength = clampInt(config.maxLength + maxLengthDelta, 1, 80);
    if (maxLength < minLength) maxLength = minLength;

    const next = {
      ...config,
      minLength,
      maxLength,
    };

    if (next.projectRiverNetwork.strategy !== "default") return next;

    const minorDelta =
      HYDROLOGY_RIVER_DENSITY_MINOR_PERCENTILE[riverDensity] -
      HYDROLOGY_RIVER_DENSITY_MINOR_PERCENTILE.normal;
    const majorDelta =
      HYDROLOGY_RIVER_DENSITY_MAJOR_PERCENTILE[riverDensity] -
      HYDROLOGY_RIVER_DENSITY_MAJOR_PERCENTILE.normal;

    const minorPercentile = Math.max(
      0,
      Math.min(1, next.projectRiverNetwork.config.minorPercentile + minorDelta)
    );
    const majorPercentile = Math.max(
      0,
      Math.min(1, next.projectRiverNetwork.config.majorPercentile + majorDelta)
    );

    return {
      ...next,
      projectRiverNetwork: {
        ...next.projectRiverNetwork,
        config: { ...next.projectRiverNetwork.config, minorPercentile, majorPercentile },
      },
    };
  },
  run: (context, config, ops, deps) => {
    const navigableRiverTerrain = NAVIGABLE_RIVER_TERRAIN;
    const { width, height } = context.dimensions;
    const logStats = (label: string) => {
      if (!context.trace.isVerbose) return;
      let flat = 0,
        hill = 0,
        mtn = 0,
        water = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (context.adapter.isWater(x, y)) {
            water++;
            continue;
          }
          const t = context.adapter.getTerrainType(x, y);
          if (t === MOUNTAIN_TERRAIN) mtn++;
          else if (t === HILL_TERRAIN) hill++;
          else flat++;
        }
      }
      const total = width * height;
      const land = Math.max(1, flat + hill + mtn);
      context.trace.event(() => ({
        type: "rivers.terrainStats",
        label,
        totals: {
          land,
          water,
          landShare: Number(((land / total) * 100).toFixed(1)),
        },
        shares: {
          mountains: Number(((mtn / land) * 100).toFixed(1)),
          hills: Number(((hill / land) * 100).toFixed(1)),
          flat: Number(((flat / land) * 100).toFixed(1)),
        },
      }));
    };

    const heightfield = deps.artifacts.heightfield.read(context) as {
      landMask: Uint8Array;
    };
    const climateField = deps.artifacts.climateField.read(context) as {
      rainfall: Uint8Array;
      humidity: Uint8Array;
    };
    const routing = deps.artifacts.routing.read(context) as {
      flowDir: Int32Array;
      basinId?: Int32Array;
    };

    const discharge = ops.accumulateDischarge(
      {
        width,
        height,
        landMask: heightfield.landMask,
        flowDir: routing.flowDir,
        rainfall: climateField.rainfall,
        humidity: climateField.humidity,
      },
      config.accumulateDischarge
    );

    const projected = ops.projectRiverNetwork(
      {
        width,
        height,
        landMask: heightfield.landMask,
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
      ...(routing.basinId instanceof Int32Array ? { basinId: routing.basinId } : {}),
    });

    logStats("PRE-RIVERS");
    context.adapter.modelRivers(config.minLength, config.maxLength, navigableRiverTerrain);
    logStats("POST-MODELRIVERS");
    context.adapter.validateAndFixTerrain();
    logStats("POST-VALIDATE");
    syncHeightfield(context);
    context.adapter.defineNamedRivers();
  },
});

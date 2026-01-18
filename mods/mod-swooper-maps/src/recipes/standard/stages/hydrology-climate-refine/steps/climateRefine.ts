import { ctxRandom, ctxRandomLabel, logRainfallStats, writeClimateField } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import ClimateRefineStepContract from "./climateRefine.contract.js";
import { hydrologyClimateRefineArtifacts } from "../artifacts.js";
import { computeRiverAdjacencyMaskFromRiverClass } from "../../hydrology-hydrography/river-adjacency.js";
import {
  HYDROLOGY_DRYNESS_WETNESS_SCALE,
  HYDROLOGY_TEMPERATURE_BASE_TEMPERATURE_C,
} from "@mapgen/domain/hydrology/shared/knob-multipliers.js";
import type {
  HydrologyCryosphereKnob,
  HydrologyDrynessKnob,
  HydrologyTemperatureKnob,
} from "@mapgen/domain/hydrology/shared/knobs.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectedSize(width: number, height: number): number {
  return Math.max(0, (width | 0) * (height | 0));
}

function validateTypedArray(
  errors: ArtifactValidationIssue[],
  label: string,
  value: unknown,
  ctor: { new (...args: any[]): { length: number } },
  expectedLength?: number
): void {
  if (!(value instanceof ctor)) {
    errors.push({ message: `Expected ${label} to be ${ctor.name}.` });
    return;
  }
  if (expectedLength != null && value.length !== expectedLength) {
    errors.push({ message: `Expected ${label} length ${expectedLength} (received ${value.length}).` });
  }
}

export default createStep(ClimateRefineStepContract, {
  artifacts: implementArtifacts(
    [
      hydrologyClimateRefineArtifacts.climateIndices,
      hydrologyClimateRefineArtifacts.cryosphere,
      hydrologyClimateRefineArtifacts.climateDiagnostics,
    ],
    {
      climateIndices: {
        validate: (value, context) => {
          const errors: ArtifactValidationIssue[] = [];
          const size = expectedSize(context.dimensions.width, context.dimensions.height);
          if (!isRecord(value)) return [{ message: "Missing hydrology climate indices artifact payload." }];
          const candidate = value as {
            surfaceTemperatureC?: unknown;
            pet?: unknown;
            aridityIndex?: unknown;
            freezeIndex?: unknown;
          };
          validateTypedArray(errors, "climateIndices.surfaceTemperatureC", candidate.surfaceTemperatureC, Float32Array, size);
          validateTypedArray(errors, "climateIndices.pet", candidate.pet, Float32Array, size);
          validateTypedArray(errors, "climateIndices.aridityIndex", candidate.aridityIndex, Float32Array, size);
          validateTypedArray(errors, "climateIndices.freezeIndex", candidate.freezeIndex, Float32Array, size);
          return errors;
        },
      },
      cryosphere: {
        validate: (value, context) => {
          const errors: ArtifactValidationIssue[] = [];
          const size = expectedSize(context.dimensions.width, context.dimensions.height);
          if (!isRecord(value)) return [{ message: "Missing hydrology cryosphere artifact payload." }];
          const candidate = value as { snowCover?: unknown; seaIceCover?: unknown; albedo?: unknown };
          validateTypedArray(errors, "cryosphere.snowCover", candidate.snowCover, Uint8Array, size);
          validateTypedArray(errors, "cryosphere.seaIceCover", candidate.seaIceCover, Uint8Array, size);
          validateTypedArray(errors, "cryosphere.albedo", candidate.albedo, Uint8Array, size);
          return errors;
        },
      },
      climateDiagnostics: {
        validate: (value, context) => {
          const errors: ArtifactValidationIssue[] = [];
          const size = expectedSize(context.dimensions.width, context.dimensions.height);
          if (!isRecord(value)) return [{ message: "Missing hydrology climate diagnostics artifact payload." }];
          const candidate = value as {
            rainShadowIndex?: unknown;
            continentalityIndex?: unknown;
            convergenceIndex?: unknown;
          };
          validateTypedArray(errors, "climateDiagnostics.rainShadowIndex", candidate.rainShadowIndex, Float32Array, size);
          validateTypedArray(errors, "climateDiagnostics.continentalityIndex", candidate.continentalityIndex, Float32Array, size);
          validateTypedArray(errors, "climateDiagnostics.convergenceIndex", candidate.convergenceIndex, Float32Array, size);
          return errors;
        },
      },
    }
  ),
  normalize: (config, ctx) => {
    const { dryness, temperature, cryosphere } = ctx.knobs as {
      dryness: HydrologyDrynessKnob;
      temperature: HydrologyTemperatureKnob;
      cryosphere: HydrologyCryosphereKnob;
    };

    const wetnessScale = HYDROLOGY_DRYNESS_WETNESS_SCALE[dryness];
    const baseTemperatureC = HYDROLOGY_TEMPERATURE_BASE_TEMPERATURE_C[temperature];

    const next = { ...config };

    if (next.computeThermalState.strategy === "default") {
      const deltaC = baseTemperatureC - HYDROLOGY_TEMPERATURE_BASE_TEMPERATURE_C.temperate;
      if (deltaC !== 0) {
        next.computeThermalState = {
          ...next.computeThermalState,
          config: {
            ...next.computeThermalState.config,
            baseTemperatureC: next.computeThermalState.config.baseTemperatureC + deltaC,
          },
        };
      }
    }

    if (next.computePrecipitation.strategy === "refine") {
      const cur = next.computePrecipitation.config;
      next.computePrecipitation = {
        ...next.computePrecipitation,
        config: {
          ...cur,
          riverCorridor: {
            ...cur.riverCorridor,
            lowlandAdjacencyBonus: Math.round(cur.riverCorridor.lowlandAdjacencyBonus * wetnessScale),
            highlandAdjacencyBonus: Math.round(cur.riverCorridor.highlandAdjacencyBonus * wetnessScale),
          },
          lowBasin: {
            ...cur.lowBasin,
            delta: Math.round(cur.lowBasin.delta * wetnessScale),
          },
        },
      };
    }

    if (cryosphere === "off") {
      if (next.applyAlbedoFeedback.strategy === "default") {
        next.applyAlbedoFeedback = {
          ...next.applyAlbedoFeedback,
          config: { ...next.applyAlbedoFeedback.config, iterations: 0 },
        };
      }

      if (next.computeCryosphereState.strategy === "default") {
        next.computeCryosphereState = {
          ...next.computeCryosphereState,
          config: {
            ...next.computeCryosphereState.config,
            landSnowStartC: -60,
            landSnowFullC: -80,
            seaIceStartC: -60,
            seaIceFullC: -80,
            freezeIndexStartC: -60,
            freezeIndexFullC: -80,
            precipitationInfluence: 0,
            snowAlbedoBoost: 0,
            seaIceAlbedoBoost: 0,
          },
        };
      }
    }

    return next;
  },
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const windField = deps.artifacts.windField.read(context);
    const hydrography = deps.artifacts.hydrography.read(context) as { riverClass: Uint8Array };
    const heightfield = deps.artifacts.heightfield.read(context) as {
      elevation: Int16Array;
      terrain: Uint8Array;
      landMask: Uint8Array;
    };

    const climateField = deps.artifacts.climateField.read(context) as {
      rainfall: Uint8Array;
      humidity: Uint8Array;
    };

    const latitudeByRow = new Float32Array(height);
    for (let y = 0; y < height; y++) {
      latitudeByRow[y] = context.adapter.getLatitude(0, y);
    }

    const size = width * height;
    const humidityF32 = new Float32Array(size);
    for (let i = 0; i < size; i++) humidityF32[i] = (climateField.humidity[i] ?? 0) / 255;

    const stepId = `${ClimateRefineStepContract.phase}/${ClimateRefineStepContract.id}`;
    const perlinSeed = ctxRandom(
      context,
      ctxRandomLabel(stepId, "hydrology/compute-precipitation/noise"),
      2_147_483_647
    );

    const riverAdjacency = computeRiverAdjacencyMaskFromRiverClass({
      width,
      height,
      riverClass: hydrography.riverClass,
      radius: 1,
    });

    const refined = ops.computePrecipitation(
      {
        width,
        height,
        latitudeByRow,
        elevation: heightfield.elevation,
        terrain: heightfield.terrain,
        landMask: heightfield.landMask,
        windU: windField.windU,
        windV: windField.windV,
        humidityF32,
        rainfallIn: climateField.rainfall,
        humidityIn: climateField.humidity,
        riverAdjacency,
        perlinSeed,
      },
      config.computePrecipitation
    );

    const forcing = ops.computeRadiativeForcing({ width, height, latitudeByRow }, config.computeRadiativeForcing);
    const thermal = ops.computeThermalState(
      {
        width,
        height,
        insolation: forcing.insolation,
        elevation: heightfield.elevation,
        landMask: heightfield.landMask,
      },
      config.computeThermalState
    );

    const albedoFeedback = ops.applyAlbedoFeedback(
      {
        width,
        height,
        landMask: heightfield.landMask,
        rainfall: refined.rainfall,
        surfaceTemperatureC: thermal.surfaceTemperatureC,
      },
      config.applyAlbedoFeedback
    );

    const cryosphere = ops.computeCryosphereState(
      {
        width,
        height,
        landMask: heightfield.landMask,
        surfaceTemperatureC: albedoFeedback.surfaceTemperatureC,
        rainfall: refined.rainfall,
      },
      config.computeCryosphereState
    );

    const waterBudget = ops.computeLandWaterBudget(
      {
        width,
        height,
        landMask: heightfield.landMask,
        rainfall: refined.rainfall,
        humidity: refined.humidity,
        surfaceTemperatureC: albedoFeedback.surfaceTemperatureC,
      },
      config.computeLandWaterBudget
    );

    const diagnostics = ops.computeClimateDiagnostics(
      {
        width,
        height,
        latitudeByRow,
        elevation: heightfield.elevation,
        landMask: heightfield.landMask,
        windU: windField.windU,
        windV: windField.windV,
        rainfall: refined.rainfall,
        humidity: refined.humidity,
      },
      config.computeClimateDiagnostics
    );

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x;
        writeClimateField(context, x, y, {
          rainfall: refined.rainfall[i],
          humidity: refined.humidity[i],
        });
      }
    }

    deps.artifacts.climateIndices.publish(context, {
      surfaceTemperatureC: albedoFeedback.surfaceTemperatureC,
      pet: waterBudget.pet,
      aridityIndex: waterBudget.aridityIndex,
      freezeIndex: cryosphere.freezeIndex,
    });
    deps.artifacts.cryosphere.publish(context, {
      snowCover: cryosphere.snowCover,
      seaIceCover: cryosphere.seaIceCover,
      albedo: cryosphere.albedo,
    });
    deps.artifacts.climateDiagnostics.publish(context, {
      rainShadowIndex: diagnostics.rainShadowIndex,
      continentalityIndex: diagnostics.continentalityIndex,
      convergenceIndex: diagnostics.convergenceIndex,
    });

    logRainfallStats(context.trace, context.adapter, width, height, "post-climate");
  },
});

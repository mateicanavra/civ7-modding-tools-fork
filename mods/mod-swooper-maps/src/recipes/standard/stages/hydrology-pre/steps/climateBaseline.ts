import {
  ctxRandom,
  ctxRandomLabel,
  logElevationSummary,
  syncHeightfield,
  writeClimateField,
} from "@swooper/mapgen-core";
import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { hydrologyPreArtifacts } from "../artifacts.js";
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
  normalize: (config, ctx) => {
    const knobs = isRecord(ctx.knobs) ? ctx.knobs : {};
    const drynessRaw = knobs.dryness;
    const dryness =
      drynessRaw === "wet" || drynessRaw === "mix" || drynessRaw === "dry" ? drynessRaw : "mix";
    const temperatureRaw = knobs.temperature;
    const temperature =
      temperatureRaw === "cold" || temperatureRaw === "temperate" || temperatureRaw === "hot"
        ? temperatureRaw
        : "temperate";
    const seasonalityRaw = knobs.seasonality;
    const seasonality =
      seasonalityRaw === "low" || seasonalityRaw === "normal" || seasonalityRaw === "high"
        ? seasonalityRaw
        : "normal";
    const oceanCouplingRaw = knobs.oceanCoupling;
    const oceanCoupling =
      oceanCouplingRaw === "off" || oceanCouplingRaw === "simple" || oceanCouplingRaw === "earthlike"
        ? oceanCouplingRaw
        : "earthlike";

    const drynessScale = dryness === "wet" ? 1.15 : dryness === "dry" ? 0.85 : 1.0;
    const baseTemperatureC = temperature === "cold" ? 6 : temperature === "hot" ? 22 : 14;

    const windJetStreaks = seasonality === "high" ? 4 : seasonality === "low" ? 2 : 3;
    const windVariance = seasonality === "high" ? 0.75 : seasonality === "low" ? 0.45 : 0.6;
    const windJetStrength = oceanCoupling === "off" ? 0.85 : oceanCoupling === "simple" ? 1.0 : 1.05;
    const currentStrength = oceanCoupling === "off" ? 0 : oceanCoupling === "simple" ? 0.75 : 1.0;

    const next = { ...config };

    if (
      next.computeThermalState.strategy === "default" &&
      next.computeThermalState.config.baseTemperatureC === 14
    ) {
      next.computeThermalState = {
        ...next.computeThermalState,
        config: { ...next.computeThermalState.config, baseTemperatureC },
      };
    }

    if (
      next.computeAtmosphericCirculation.strategy === "default" &&
      next.computeAtmosphericCirculation.config.windJetStreaks === 3
    ) {
      next.computeAtmosphericCirculation = {
        ...next.computeAtmosphericCirculation,
        config: { ...next.computeAtmosphericCirculation.config, windJetStreaks },
      };
    }
    if (
      next.computeAtmosphericCirculation.strategy === "default" &&
      next.computeAtmosphericCirculation.config.windVariance === 0.6
    ) {
      next.computeAtmosphericCirculation = {
        ...next.computeAtmosphericCirculation,
        config: { ...next.computeAtmosphericCirculation.config, windVariance },
      };
    }
    if (
      next.computeAtmosphericCirculation.strategy === "default" &&
      next.computeAtmosphericCirculation.config.windJetStrength === 1
    ) {
      next.computeAtmosphericCirculation = {
        ...next.computeAtmosphericCirculation,
        config: { ...next.computeAtmosphericCirculation.config, windJetStrength },
      };
    }

    if (
      next.computeOceanSurfaceCurrents.strategy === "default" &&
      next.computeOceanSurfaceCurrents.config.strength === 1
    ) {
      next.computeOceanSurfaceCurrents = {
        ...next.computeOceanSurfaceCurrents,
        config: { ...next.computeOceanSurfaceCurrents.config, strength: currentStrength },
      };
    }

    if (
      next.computeEvaporationSources.strategy === "default" &&
      next.computeEvaporationSources.config.oceanStrength === 1
    ) {
      next.computeEvaporationSources = {
        ...next.computeEvaporationSources,
        config: { ...next.computeEvaporationSources.config, oceanStrength: 1.0 * drynessScale },
      };
    }
    if (
      next.computeEvaporationSources.strategy === "default" &&
      next.computeEvaporationSources.config.landStrength === 0.2
    ) {
      next.computeEvaporationSources = {
        ...next.computeEvaporationSources,
        config: { ...next.computeEvaporationSources.config, landStrength: 0.2 * drynessScale },
      };
    }

    if (
      next.transportMoisture.strategy === "default" &&
      next.transportMoisture.config.iterations === 28
    ) {
      next.transportMoisture = {
        ...next.transportMoisture,
        config: {
          ...next.transportMoisture.config,
          iterations: oceanCoupling === "off" ? 18 : oceanCoupling === "simple" ? 24 : 28,
        },
      };
    }

    if (next.computePrecipitation.strategy === "default") {
      if (next.computePrecipitation.config.rainfallScale === 180) {
        next.computePrecipitation = {
          ...next.computePrecipitation,
          config: { ...next.computePrecipitation.config, rainfallScale: 180 * drynessScale },
        };
      }

      if (next.computePrecipitation.config.noiseAmplitude === 6) {
        const noiseAmplitude = seasonality === "high" ? 8 : seasonality === "low" ? 5 : 6;
        next.computePrecipitation = {
          ...next.computePrecipitation,
          config: { ...next.computePrecipitation.config, noiseAmplitude },
        };
      }

      if (next.computePrecipitation.config.waterGradient.radius === 5) {
        const radius = oceanCoupling === "off" ? 4 : oceanCoupling === "simple" ? 5 : 6;
        next.computePrecipitation = {
          ...next.computePrecipitation,
          config: {
            ...next.computePrecipitation.config,
            waterGradient: { ...next.computePrecipitation.config.waterGradient, radius },
          },
        };
      }
      if (next.computePrecipitation.config.waterGradient.perRingBonus === 4) {
        const perRingBonus = Math.round((oceanCoupling === "off" ? 3 : 4) * drynessScale);
        next.computePrecipitation = {
          ...next.computePrecipitation,
          config: {
            ...next.computePrecipitation.config,
            waterGradient: { ...next.computePrecipitation.config.waterGradient, perRingBonus },
          },
        };
      }
      if (next.computePrecipitation.config.waterGradient.lowlandBonus === 2) {
        const lowlandBonus = Math.round(2 * drynessScale);
        next.computePrecipitation = {
          ...next.computePrecipitation,
          config: {
            ...next.computePrecipitation.config,
            waterGradient: { ...next.computePrecipitation.config.waterGradient, lowlandBonus },
          },
        };
      }

      if (next.computePrecipitation.config.orographic.reductionBase === 8) {
        const reductionBase = Math.round(8 / Math.max(0.1, drynessScale));
        next.computePrecipitation = {
          ...next.computePrecipitation,
          config: {
            ...next.computePrecipitation.config,
            orographic: { ...next.computePrecipitation.config.orographic, reductionBase },
          },
        };
      }
      if (next.computePrecipitation.config.orographic.reductionPerStep === 6) {
        const reductionPerStep = Math.round(6 / Math.max(0.1, drynessScale));
        next.computePrecipitation = {
          ...next.computePrecipitation,
          config: {
            ...next.computePrecipitation.config,
            orographic: { ...next.computePrecipitation.config.orographic, reductionPerStep },
          },
        };
      }
    }

    return next;
  },
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

    const heightfield = deps.artifacts.heightfield.read(context) as {
      elevation: Int16Array;
      terrain: Uint8Array;
      landMask: Uint8Array;
    };
    const isWaterMask = new Uint8Array(width * height);
    for (let i = 0; i < isWaterMask.length; i++) {
      isWaterMask[i] = heightfield.landMask[i] === 0 ? 1 : 0;
    }

    const stepId = `${ClimateBaselineStepContract.phase}/${ClimateBaselineStepContract.id}`;
    const rngSeed = ctxRandom(
      context,
      ctxRandomLabel(stepId, "hydrology/compute-atmospheric-circulation"),
      2_147_483_647
    );
    const perlinSeed = ctxRandom(
      context,
      ctxRandomLabel(stepId, "hydrology/compute-precipitation/noise"),
      2_147_483_647
    );

    const forcing = ops.computeRadiativeForcing(
      { width, height, latitudeByRow },
      config.computeRadiativeForcing
    );

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

    const winds = ops.computeAtmosphericCirculation(
      {
        width,
        height,
        latitudeByRow,
        rngSeed,
      },
      config.computeAtmosphericCirculation
    );

    const currents = ops.computeOceanSurfaceCurrents(
      {
        width,
        height,
        latitudeByRow,
        isWaterMask,
        windU: winds.windU,
        windV: winds.windV,
      },
      config.computeOceanSurfaceCurrents
    );

    const evaporation = ops.computeEvaporationSources(
      {
        width,
        height,
        landMask: heightfield.landMask,
        surfaceTemperatureC: thermal.surfaceTemperatureC,
      },
      config.computeEvaporationSources
    );

    const moisture = ops.transportMoisture(
      {
        width,
        height,
        latitudeByRow,
        landMask: heightfield.landMask,
        windU: winds.windU,
        windV: winds.windV,
        evaporation: evaporation.evaporation,
      },
      config.transportMoisture
    );

    const size = expectedSize(context.dimensions);
    const zeros = new Uint8Array(size);
    const precipitation = ops.computePrecipitation(
      {
        width,
        height,
        latitudeByRow,
        elevation: heightfield.elevation,
        terrain: heightfield.terrain,
        landMask: heightfield.landMask,
        windU: winds.windU,
        windV: winds.windV,
        humidityF32: moisture.humidity,
        rainfallIn: zeros,
        humidityIn: zeros,
        riverAdjacency: zeros,
        perlinSeed,
      },
      config.computePrecipitation
    );

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x;
        writeClimateField(context, x, y, {
          rainfall: precipitation.rainfall[i],
          humidity: precipitation.humidity[i],
        });
      }
    }

    deps.artifacts.climateField.publish(context, context.buffers.climate);
    deps.artifacts.windField.publish(context, {
      windU: winds.windU,
      windV: winds.windV,
      currentU: currents.currentU,
      currentV: currents.currentV,
    });
  },
});

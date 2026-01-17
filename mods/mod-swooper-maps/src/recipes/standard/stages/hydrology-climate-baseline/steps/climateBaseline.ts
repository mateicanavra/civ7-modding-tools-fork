import {
  ctxRandom,
  ctxRandomLabel,
  logElevationSummary,
  syncHeightfield,
  writeClimateField,
} from "@swooper/mapgen-core";
import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { hydrologyClimateBaselineArtifacts } from "../artifacts.js";
import ClimateBaselineStepContract from "./climateBaseline.contract.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;
type TypedArrayConstructor = { new (...args: unknown[]): { length: number } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectedSize(dimensions: MapDimensions): number {
  return Math.max(0, (dimensions.width | 0) * (dimensions.height | 0));
}

function clampLatitudeDeg(latitudeDeg: number): number {
  if (!Number.isFinite(latitudeDeg)) return 0;
  return Math.max(-89.999, Math.min(89.999, latitudeDeg));
}

function validateTypedArray(
  errors: ArtifactValidationIssue[],
  label: string,
  value: unknown,
  ctor: TypedArrayConstructor,
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

function validateClimateSeasonalityPayload(
  value: unknown,
  dimensions: MapDimensions
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  const size = expectedSize(dimensions);
  if (!isRecord(value)) {
    errors.push({ message: "Missing hydrology climate seasonality artifact payload." });
    return errors;
  }

  const candidate = value as {
    modeCount?: unknown;
    axialTiltDeg?: unknown;
    rainfallAmplitude?: unknown;
    humidityAmplitude?: unknown;
  };

  const modeCount = candidate.modeCount;
  if (modeCount !== 2 && modeCount !== 4) {
    errors.push({ message: "Expected climateSeasonality.modeCount to be 2 or 4." });
  }
  if (typeof candidate.axialTiltDeg !== "number" || !Number.isFinite(candidate.axialTiltDeg)) {
    errors.push({ message: "Expected climateSeasonality.axialTiltDeg to be a finite number." });
  }

  validateTypedArray(errors, "climateSeasonality.rainfallAmplitude", candidate.rainfallAmplitude, Uint8Array, size);
  validateTypedArray(errors, "climateSeasonality.humidityAmplitude", candidate.humidityAmplitude, Uint8Array, size);
  return errors;
}

function getSeasonPhases(modeCount: 2 | 4): readonly number[] {
  if (modeCount === 4) return [0, 0.25, 0.5, 0.75];
  return [0.25, 0.75];
}

export default createStep(ClimateBaselineStepContract, {
  artifacts: implementArtifacts(
    [
      hydrologyClimateBaselineArtifacts.climateField,
      hydrologyClimateBaselineArtifacts.climateSeasonality,
      hydrologyClimateBaselineArtifacts.windField,
    ],
    {
      climateField: {
        validate: (value, context) => validateClimateFieldBuffer(value, context.dimensions),
      },
      climateSeasonality: {
        validate: (value, context) => validateClimateSeasonalityPayload(value, context.dimensions),
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
    }
  ),
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

    const seasonalityDefaults =
      seasonality === "high"
        ? { modeCount: 4 as const, axialTiltDeg: 23.44 }
        : seasonality === "low"
          ? { modeCount: 2 as const, axialTiltDeg: 12 }
          : { modeCount: 2 as const, axialTiltDeg: 18 };

    next.seasonality = {
      modeCount: next.seasonality?.modeCount ?? seasonalityDefaults.modeCount,
      axialTiltDeg: next.seasonality?.axialTiltDeg ?? seasonalityDefaults.axialTiltDeg,
    };

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

    const size = expectedSize(context.dimensions);
    const zeros = new Uint8Array(size);

    const modeCount = config.seasonality?.modeCount === 4 ? 4 : 2;
    const axialTiltDeg = config.seasonality?.axialTiltDeg ?? 18;
    const phases = getSeasonPhases(modeCount);

    const seasonalRainfall: Uint8Array[] = [];
    const seasonalHumidity: Uint8Array[] = [];
    const seasonalWindU: Int8Array[] = [];
    const seasonalWindV: Int8Array[] = [];
    const seasonalCurrentU: Int8Array[] = [];
    const seasonalCurrentV: Int8Array[] = [];

    for (const phase of phases) {
      const declinationDeg = axialTiltDeg * Math.sin(2 * Math.PI * phase);
      const latitudeByRowSeasonal = new Float32Array(height);
      for (let y = 0; y < height; y++) {
        latitudeByRowSeasonal[y] = clampLatitudeDeg(latitudeByRow[y] - declinationDeg);
      }

      const forcing = ops.computeRadiativeForcing(
        { width, height, latitudeByRow: latitudeByRowSeasonal },
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
          latitudeByRow: latitudeByRowSeasonal,
          rngSeed,
        },
        config.computeAtmosphericCirculation
      );

      const currents = ops.computeOceanSurfaceCurrents(
        {
          width,
          height,
          latitudeByRow: latitudeByRowSeasonal,
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
          latitudeByRow: latitudeByRowSeasonal,
          landMask: heightfield.landMask,
          windU: winds.windU,
          windV: winds.windV,
          evaporation: evaporation.evaporation,
        },
        config.transportMoisture
      );

      const precipitation = ops.computePrecipitation(
        {
          width,
          height,
          latitudeByRow: latitudeByRowSeasonal,
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

      seasonalRainfall.push(precipitation.rainfall);
      seasonalHumidity.push(precipitation.humidity);
      seasonalWindU.push(winds.windU);
      seasonalWindV.push(winds.windV);
      seasonalCurrentU.push(currents.currentU);
      seasonalCurrentV.push(currents.currentV);
    }

    const seasonCount = phases.length;
    const meanRainfall = new Uint8Array(size);
    const meanHumidity = new Uint8Array(size);
    const rainfallAmplitude = new Uint8Array(size);
    const humidityAmplitude = new Uint8Array(size);
    const meanWindU = new Int8Array(size);
    const meanWindV = new Int8Array(size);
    const meanCurrentU = new Int8Array(size);
    const meanCurrentV = new Int8Array(size);

    const clampI8 = (value: number): number => Math.max(-128, Math.min(127, value));

    for (let i = 0; i < size; i++) {
      let rainSum = 0;
      let humidSum = 0;
      let rainMin = 255;
      let rainMax = 0;
      let humidMin = 255;
      let humidMax = 0;
      let windUSum = 0;
      let windVSum = 0;
      let currentUSum = 0;
      let currentVSum = 0;

      for (let s = 0; s < seasonCount; s++) {
        const rain = seasonalRainfall[s]?.[i] ?? 0;
        const humid = seasonalHumidity[s]?.[i] ?? 0;
        rainSum += rain;
        humidSum += humid;
        if (rain < rainMin) rainMin = rain;
        if (rain > rainMax) rainMax = rain;
        if (humid < humidMin) humidMin = humid;
        if (humid > humidMax) humidMax = humid;

        windUSum += seasonalWindU[s]?.[i] ?? 0;
        windVSum += seasonalWindV[s]?.[i] ?? 0;
        currentUSum += seasonalCurrentU[s]?.[i] ?? 0;
        currentVSum += seasonalCurrentV[s]?.[i] ?? 0;
      }

      meanRainfall[i] = Math.max(0, Math.min(255, Math.round(rainSum / seasonCount)));
      meanHumidity[i] = Math.max(0, Math.min(255, Math.round(humidSum / seasonCount)));
      rainfallAmplitude[i] = Math.max(0, Math.min(255, Math.round((rainMax - rainMin) / 2)));
      humidityAmplitude[i] = Math.max(0, Math.min(255, Math.round((humidMax - humidMin) / 2)));

      meanWindU[i] = clampI8(Math.round(windUSum / seasonCount));
      meanWindV[i] = clampI8(Math.round(windVSum / seasonCount));
      meanCurrentU[i] = clampI8(Math.round(currentUSum / seasonCount));
      meanCurrentV[i] = clampI8(Math.round(currentVSum / seasonCount));
    }

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x;
        writeClimateField(context, x, y, {
          rainfall: meanRainfall[i],
          humidity: meanHumidity[i],
        });
      }
    }

    deps.artifacts.climateField.publish(context, context.buffers.climate);
    deps.artifacts.climateSeasonality.publish(context, {
      modeCount,
      axialTiltDeg,
      rainfallAmplitude,
      humidityAmplitude,
    });
    deps.artifacts.windField.publish(context, {
      windU: meanWindU,
      windV: meanWindV,
      currentU: meanCurrentU,
      currentV: meanCurrentV,
    });
  },
});

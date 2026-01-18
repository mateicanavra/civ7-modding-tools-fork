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
import {
  HYDROLOGY_DRYNESS_WETNESS_SCALE,
  HYDROLOGY_EVAPORATION_LAND_STRENGTH_BASE,
  HYDROLOGY_EVAPORATION_OCEAN_STRENGTH_BASE,
  HYDROLOGY_OCEAN_COUPLING_CURRENT_STRENGTH,
  HYDROLOGY_OCEAN_COUPLING_MOISTURE_TRANSPORT_ITERATIONS,
  HYDROLOGY_OCEAN_COUPLING_WATER_GRADIENT_RADIUS,
  HYDROLOGY_OCEAN_COUPLING_WIND_JET_STRENGTH,
  HYDROLOGY_OROGRAPHIC_REDUCTION_BASE,
  HYDROLOGY_OROGRAPHIC_REDUCTION_PER_STEP,
  HYDROLOGY_SEASONALITY_DEFAULTS,
  HYDROLOGY_SEASONALITY_PRECIP_NOISE_AMPLITUDE,
  HYDROLOGY_SEASONALITY_WIND_JET_STREAKS,
  HYDROLOGY_SEASONALITY_WIND_VARIANCE,
  HYDROLOGY_TEMPERATURE_BASE_TEMPERATURE_C,
  HYDROLOGY_WATER_GRADIENT_LOWLAND_BONUS_BASE,
  HYDROLOGY_WATER_GRADIENT_PER_RING_BONUS_BASE,
} from "@mapgen/domain/hydrology/shared/knob-multipliers.js";
import type {
  HydrologyDrynessKnob,
  HydrologyOceanCouplingKnob,
  HydrologySeasonalityKnob,
  HydrologyTemperatureKnob,
} from "@mapgen/domain/hydrology/shared/knobs.js";

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
    const { dryness, temperature, seasonality, oceanCoupling } = ctx.knobs as Readonly<{
      dryness: HydrologyDrynessKnob;
      temperature: HydrologyTemperatureKnob;
      seasonality: HydrologySeasonalityKnob;
      oceanCoupling: HydrologyOceanCouplingKnob;
    }>;

    const wetnessScale = HYDROLOGY_DRYNESS_WETNESS_SCALE[dryness];
    const temperatureDeltaC =
      HYDROLOGY_TEMPERATURE_BASE_TEMPERATURE_C[temperature] -
      HYDROLOGY_TEMPERATURE_BASE_TEMPERATURE_C.temperate;

    const seasonalityDefaults = HYDROLOGY_SEASONALITY_DEFAULTS[seasonality];
    const normalSeasonalityDefaults = HYDROLOGY_SEASONALITY_DEFAULTS.normal;
    const modeCountCandidate =
      (config.seasonality?.modeCount ?? normalSeasonalityDefaults.modeCount) +
      (seasonalityDefaults.modeCount - normalSeasonalityDefaults.modeCount);
    const modeCount: 2 | 4 = modeCountCandidate >= 3 ? 4 : 2;
    const axialTiltDeg =
      (config.seasonality?.axialTiltDeg ?? normalSeasonalityDefaults.axialTiltDeg) +
      (seasonalityDefaults.axialTiltDeg - normalSeasonalityDefaults.axialTiltDeg);

    const jetStreakDelta =
      HYDROLOGY_SEASONALITY_WIND_JET_STREAKS[seasonality] -
      HYDROLOGY_SEASONALITY_WIND_JET_STREAKS.normal;
    const varianceFactor =
      HYDROLOGY_SEASONALITY_WIND_VARIANCE[seasonality] /
      HYDROLOGY_SEASONALITY_WIND_VARIANCE.normal;
    const noiseAmplitudeFactor =
      HYDROLOGY_SEASONALITY_PRECIP_NOISE_AMPLITUDE[seasonality] /
      HYDROLOGY_SEASONALITY_PRECIP_NOISE_AMPLITUDE.normal;

    const jetStrengthFactor =
      HYDROLOGY_OCEAN_COUPLING_WIND_JET_STRENGTH[oceanCoupling] /
      HYDROLOGY_OCEAN_COUPLING_WIND_JET_STRENGTH.earthlike;
    const currentStrengthFactor =
      HYDROLOGY_OCEAN_COUPLING_CURRENT_STRENGTH[oceanCoupling] /
      HYDROLOGY_OCEAN_COUPLING_CURRENT_STRENGTH.earthlike;

    const transportIterationsDelta =
      HYDROLOGY_OCEAN_COUPLING_MOISTURE_TRANSPORT_ITERATIONS[oceanCoupling] -
      HYDROLOGY_OCEAN_COUPLING_MOISTURE_TRANSPORT_ITERATIONS.earthlike;

    const computeThermalState =
      config.computeThermalState.strategy === "default"
        ? {
            ...config.computeThermalState,
            config: {
              ...config.computeThermalState.config,
              baseTemperatureC: config.computeThermalState.config.baseTemperatureC + temperatureDeltaC,
            },
          }
        : config.computeThermalState;

    const computeAtmosphericCirculation =
      config.computeAtmosphericCirculation.strategy === "default"
        ? {
            ...config.computeAtmosphericCirculation,
            config: {
              ...config.computeAtmosphericCirculation.config,
              windJetStreaks: Math.max(
                0,
                Math.round(config.computeAtmosphericCirculation.config.windJetStreaks + jetStreakDelta)
              ),
              windVariance: config.computeAtmosphericCirculation.config.windVariance * varianceFactor,
              windJetStrength: config.computeAtmosphericCirculation.config.windJetStrength * jetStrengthFactor,
            },
          }
        : config.computeAtmosphericCirculation;

    const computeOceanSurfaceCurrents =
      config.computeOceanSurfaceCurrents.strategy === "default"
        ? {
            ...config.computeOceanSurfaceCurrents,
            config: {
              ...config.computeOceanSurfaceCurrents.config,
              strength: config.computeOceanSurfaceCurrents.config.strength * currentStrengthFactor,
            },
          }
        : config.computeOceanSurfaceCurrents;

    const computeEvaporationSources =
      config.computeEvaporationSources.strategy === "default"
        ? {
            ...config.computeEvaporationSources,
            config: {
              ...config.computeEvaporationSources.config,
              oceanStrength: config.computeEvaporationSources.config.oceanStrength * wetnessScale,
              landStrength: config.computeEvaporationSources.config.landStrength * wetnessScale,
            },
          }
        : config.computeEvaporationSources;

    const transportMoisture =
      config.transportMoisture.strategy === "default"
        ? {
            ...config.transportMoisture,
            config: {
              ...config.transportMoisture.config,
              iterations: Math.max(0, Math.round(config.transportMoisture.config.iterations + transportIterationsDelta)),
            },
          }
        : config.transportMoisture;

    const computePrecipitation =
      config.computePrecipitation.strategy !== "default"
        ? config.computePrecipitation
        : (() => {
            const waterGradientRadiusDelta =
              HYDROLOGY_OCEAN_COUPLING_WATER_GRADIENT_RADIUS[oceanCoupling] -
              HYDROLOGY_OCEAN_COUPLING_WATER_GRADIENT_RADIUS.earthlike;
            const perRingBonusDelta =
              HYDROLOGY_WATER_GRADIENT_PER_RING_BONUS_BASE[oceanCoupling] -
              HYDROLOGY_WATER_GRADIENT_PER_RING_BONUS_BASE.earthlike;

            const scaleDenom = Math.max(0.1, wetnessScale);

            return {
              ...config.computePrecipitation,
              config: {
                ...config.computePrecipitation.config,
                rainfallScale: config.computePrecipitation.config.rainfallScale * wetnessScale,
                noiseAmplitude: config.computePrecipitation.config.noiseAmplitude * noiseAmplitudeFactor,
                waterGradient: {
                  ...config.computePrecipitation.config.waterGradient,
                  radius: Math.max(
                    1,
                    Math.round(config.computePrecipitation.config.waterGradient.radius + waterGradientRadiusDelta)
                  ),
                  perRingBonus: Math.max(
                    0,
                    Math.round(
                      (config.computePrecipitation.config.waterGradient.perRingBonus + perRingBonusDelta) * wetnessScale
                    )
                  ),
                  lowlandBonus: Math.max(
                    0,
                    Math.round(config.computePrecipitation.config.waterGradient.lowlandBonus * wetnessScale)
                  ),
                },
                orographic: {
                  ...config.computePrecipitation.config.orographic,
                  reductionBase: Math.max(
                    0,
                    Math.round(config.computePrecipitation.config.orographic.reductionBase / scaleDenom)
                  ),
                  reductionPerStep: Math.max(
                    0,
                    Math.round(config.computePrecipitation.config.orographic.reductionPerStep / scaleDenom)
                  ),
                },
              },
            };
          })();

    return {
      ...config,
      seasonality: { modeCount, axialTiltDeg },
      computeThermalState,
      computeAtmosphericCirculation,
      computeOceanSurfaceCurrents,
      computeEvaporationSources,
      transportMoisture,
      computePrecipitation,
    };
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

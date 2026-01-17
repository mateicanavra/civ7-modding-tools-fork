import { Type, createStage, type Static } from "@swooper/mapgen-core/authoring";
import { climateBaseline, lakes } from "./steps/index.js";
import {
  HydrologyKnobsSchema,
  resolveHydrologyKnobs,
  type HydrologyKnobs,
} from "@mapgen/domain/hydrology/knobs.js";

const publicSchema = Type.Object({}, { additionalProperties: false });
type PublicConfig = Static<typeof publicSchema>;

export default createStage({
  id: "hydrology-pre",
  knobsSchema: HydrologyKnobsSchema,
  public: publicSchema,
  compile: (args: { env: unknown; knobs: HydrologyKnobs; config: PublicConfig }) => {
    const { env, knobs } = args;
    void env;
    void args.config;
    const resolved = resolveHydrologyKnobs(knobs);

    const drynessScale = resolved.dryness === "wet" ? 1.15 : resolved.dryness === "dry" ? 0.85 : 1.0;

    const windJetStreaks = resolved.seasonality === "high" ? 4 : resolved.seasonality === "low" ? 2 : 3;
    const windVariance = resolved.seasonality === "high" ? 0.75 : resolved.seasonality === "low" ? 0.45 : 0.6;
    const windJetStrength =
      resolved.oceanCoupling === "off" ? 0.85 : resolved.oceanCoupling === "simple" ? 1.0 : 1.05;

    const currentStrength =
      resolved.oceanCoupling === "off" ? 0 : resolved.oceanCoupling === "simple" ? 0.75 : 1.0;

    const baseTemperatureC = resolved.temperature === "cold" ? 6 : resolved.temperature === "hot" ? 22 : 14;

    const lakeMultiplier =
      resolved.lakeiness === "many" ? 0.7 : resolved.lakeiness === "few" ? 1.5 : 1.0;

    return {
      lakes: {
        tilesPerLakeMultiplier: lakeMultiplier,
      },
      "climate-baseline": {
        computeRadiativeForcing: { strategy: "default", config: {} },
        computeThermalState: {
          strategy: "default",
          config: { baseTemperatureC },
        },
        computeAtmosphericCirculation: {
          strategy: "default",
          config: {
            windJetStreaks,
            windJetStrength,
            windVariance,
          },
        },
        computeOceanSurfaceCurrents: { strategy: "default", config: { strength: currentStrength } },
        computeEvaporationSources: {
          strategy: "default",
          config: {
            oceanStrength: 1.0 * drynessScale,
            landStrength: 0.2 * drynessScale,
          },
        },
        transportMoisture: {
          strategy: "default",
          config: {
            iterations: resolved.oceanCoupling === "off" ? 18 : resolved.oceanCoupling === "simple" ? 24 : 28,
            advection: 0.65,
            retention: 0.92,
          },
        },
        computePrecipitation: {
          strategy: "default",
          config: {
            rainfallScale: 180 * drynessScale,
            humidityExponent: 1.0,
            noiseAmplitude: resolved.seasonality === "high" ? 8 : resolved.seasonality === "low" ? 5 : 6,
            noiseScale: 0.12,
            waterGradient: {
              radius: resolved.oceanCoupling === "off" ? 4 : resolved.oceanCoupling === "simple" ? 5 : 6,
              perRingBonus: Math.round((resolved.oceanCoupling === "off" ? 3 : 4) * drynessScale),
              lowlandBonus: Math.round(2 * drynessScale),
              lowlandElevationMax: 150,
            },
            orographic: {
              steps: 4,
              reductionBase: Math.round(8 / Math.max(0.1, drynessScale)),
              reductionPerStep: Math.round(6 / Math.max(0.1, drynessScale)),
              barrierElevationM: 500,
            },
          },
        },
      },
    };
  },
  steps: [lakes, climateBaseline],
} as const);

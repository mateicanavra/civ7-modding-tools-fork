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
    const riverScale = resolved.dryness === "wet" ? 1.05 : resolved.dryness === "dry" ? 0.95 : 1.0;

    const windJetStreaks = resolved.seasonality === "high" ? 4 : resolved.seasonality === "low" ? 2 : 3;
    const windVariance = resolved.seasonality === "high" ? 0.75 : resolved.seasonality === "low" ? 0.45 : 0.6;
    const windJetStrength =
      resolved.oceanCoupling === "off" ? 0.85 : resolved.oceanCoupling === "simple" ? 1.0 : 1.05;

    const lakeMultiplier =
      resolved.lakeiness === "many" ? 0.7 : resolved.lakeiness === "few" ? 1.5 : 1.0;

    return {
      lakes: {
        tilesPerLakeMultiplier: lakeMultiplier,
      },
      "climate-baseline": {
        climate: {
          baseline: {
            seed: {
              baseRainfall: Math.round(40 * drynessScale),
              coastalExponent: resolved.oceanCoupling === "off" ? 1.6 : resolved.oceanCoupling === "simple" ? 1.25 : 1.0,
            },
            bands: {
              deg0to10: Math.round(120 * drynessScale),
              deg10to20: Math.round(104 * drynessScale),
              deg20to35: Math.round(75 * drynessScale),
              deg35to55: Math.round(70 * drynessScale),
              deg55to70: Math.round(60 * drynessScale),
              deg70plus: Math.round(45 * drynessScale),
            },
            coastal: {
              coastalLandBonus: Math.round(24 * riverScale),
            },
          },
        },
        computeWindFields: {
          strategy: "default",
          config: {
            windJetStreaks,
            windJetStrength,
            windVariance,
          },
        },
      },
    };
  },
  steps: [lakes, climateBaseline],
} as const);

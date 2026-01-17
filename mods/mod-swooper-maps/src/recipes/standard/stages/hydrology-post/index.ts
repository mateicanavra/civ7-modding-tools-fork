import { Type, createStage, type Static } from "@swooper/mapgen-core/authoring";
import { climateRefine } from "./steps/index.js";
import {
  HydrologyKnobsSchema,
  resolveHydrologyKnobs,
  type HydrologyKnobs,
} from "@mapgen/domain/hydrology/knobs.js";

/**
 * Hydrology-post stage has no stage-local public config.
 *
 * All author-facing control flows through `knobsSchema` (semantic intent), which compiles into op strategy configs.
 */
const publicSchema = Type.Object(
  {},
  {
    additionalProperties: false,
    description:
      "Hydrology-post stage public config (empty). Use Hydrology knobs to affect refinement/cryosphere deterministically.",
  }
);
type PublicConfig = Static<typeof publicSchema>;

export default createStage({
  id: "hydrology-post",
  knobsSchema: HydrologyKnobsSchema,
  public: publicSchema,
  compile: (args: { env: unknown; knobs: HydrologyKnobs; config: PublicConfig }) => {
    const { env, knobs } = args;
    void env;
    void args.config;
    const resolved = resolveHydrologyKnobs(knobs);

    const wetnessScale = resolved.dryness === "wet" ? 1.15 : resolved.dryness === "dry" ? 0.85 : 1.0;
    const baseTemperatureC = resolved.temperature === "cold" ? 6 : resolved.temperature === "hot" ? 22 : 14;
    const cryosphereOn = resolved.cryosphere !== "off";

    return {
      "climate-refine": {
        computePrecipitation: {
          strategy: "refine",
          config: {
            riverCorridor: {
              adjacencyRadius: 1,
              lowlandAdjacencyBonus: Math.round(14 * wetnessScale),
              highlandAdjacencyBonus: Math.round(10 * wetnessScale),
              lowlandElevationMax: 250,
            },
            lowBasin: {
              radius: 2,
              delta: Math.round(6 * wetnessScale),
              elevationMax: 200,
              openThresholdM: 20,
            },
          },
        },
        computeRadiativeForcing: { strategy: "default", config: {} },
        computeThermalState: {
          strategy: "default",
          config: { baseTemperatureC },
        },
        applyAlbedoFeedback: {
          strategy: "default",
          config: {
            iterations: cryosphereOn ? 4 : 0,
            snowCoolingC: 4,
            seaIceCoolingC: 6,
          },
        },
        computeCryosphereState: {
          strategy: "default",
          config: cryosphereOn
            ? {}
            : {
                landSnowStartC: -999,
                landSnowFullC: -1000,
                seaIceStartC: -999,
                seaIceFullC: -1000,
                freezeIndexStartC: -999,
                freezeIndexFullC: -1000,
                precipitationInfluence: 0,
                snowAlbedoBoost: 0,
                seaIceAlbedoBoost: 0,
              },
        },
        computeLandWaterBudget: { strategy: "default", config: {} },
        computeClimateDiagnostics: { strategy: "default", config: {} },
      },
    };
  },
  steps: [climateRefine],
} as const);

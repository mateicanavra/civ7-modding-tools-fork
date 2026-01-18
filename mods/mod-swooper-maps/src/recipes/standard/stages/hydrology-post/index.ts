import { Type, createStage, type Static } from "@swooper/mapgen-core/authoring";
import { climateRefine } from "./steps/index.js";
import {
  HydrologyKnobsSchema,
  resolveHydrologyKnobs,
  type HydrologyKnobs,
} from "@mapgen/domain/hydrology/knobs.js";

const publicSchema = Type.Object({}, { additionalProperties: false });
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
      },
    };
  },
  steps: [climateRefine],
} as const);

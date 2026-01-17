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
        climate: {
          refine: {
            waterGradient: {
              radius: 5,
              perRingBonus: Math.round(5 * wetnessScale),
              lowlandBonus: Math.round(3 * wetnessScale),
            },
            orographic: {
              steps: 4,
              reductionBase: Math.round(8 / wetnessScale),
              reductionPerStep: Math.round(6 / wetnessScale),
            },
            riverCorridor: {
              adjacencyRadius: 1,
              lowlandAdjacencyBonus: Math.round(14 * wetnessScale),
              highlandAdjacencyBonus: Math.round(10 * wetnessScale),
            },
            lowBasin: {
              radius: 2,
              delta: Math.round(6 * wetnessScale),
            },
          },
        },
      },
    };
  },
  steps: [climateRefine],
} as const);

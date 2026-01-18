import { Type, createStage, type Static } from "@swooper/mapgen-core/authoring";
import { rivers } from "./steps/index.js";
import {
  HydrologyKnobsSchema,
  resolveHydrologyKnobs,
  type HydrologyKnobs,
} from "@mapgen/domain/hydrology/knobs.js";

const publicSchema = Type.Object({}, { additionalProperties: false });
type PublicConfig = Static<typeof publicSchema>;

export default createStage({
  id: "hydrology-core",
  knobsSchema: HydrologyKnobsSchema,
  public: publicSchema,
  compile: (args: { env: unknown; knobs: HydrologyKnobs; config: PublicConfig }) => {
    const { env, knobs } = args;
    void env;
    void args.config;
    const resolved = resolveHydrologyKnobs(knobs);

    const lengths =
      resolved.riverDensity === "dense"
        ? { minLength: 3, maxLength: 12 }
        : resolved.riverDensity === "sparse"
          ? { minLength: 7, maxLength: 18 }
          : { minLength: 5, maxLength: 15 };

    const riverProjection =
      resolved.riverDensity === "dense"
        ? { minorPercentile: 0.75, majorPercentile: 0.9 }
        : resolved.riverDensity === "sparse"
          ? { minorPercentile: 0.88, majorPercentile: 0.97 }
          : { minorPercentile: 0.82, majorPercentile: 0.94 };

    return {
      rivers: {
        ...lengths,
        accumulateDischarge: {
          strategy: "default",
          config: {},
        },
        projectRiverNetwork: {
          strategy: "default",
          config: riverProjection,
        },
      },
    };
  },
  steps: [rivers],
} as const);

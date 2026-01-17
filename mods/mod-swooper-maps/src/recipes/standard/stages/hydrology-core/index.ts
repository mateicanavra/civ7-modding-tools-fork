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

    return {
      rivers: lengths,
    };
  },
  steps: [rivers],
} as const);

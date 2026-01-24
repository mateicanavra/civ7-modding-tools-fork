import { Type, createStage, type Static } from "@swooper/mapgen-core/authoring";
import { islands, landmasses, volcanoes } from "./steps/index.js";
import { MorphologyVolcanismKnobSchema } from "@mapgen/domain/morphology/shared/knobs.js";

/**
 * Advanced Morphology-post step config baseline. Knobs apply last as deterministic transforms over this baseline.
 */
const publicSchema = Type.Object(
  {
    advanced: Type.Optional(
      Type.Object(
        {
          islands: Type.Optional(islands.contract.schema),
          volcanoes: Type.Optional(volcanoes.contract.schema),
          landmasses: Type.Optional(landmasses.contract.schema),
        },
        {
          additionalProperties: false,
          description:
            "Advanced Morphology-post step config baseline. Knobs apply last as deterministic transforms over this baseline.",
        }
      )
    ),
  },
  { additionalProperties: false }
);

type MorphologyPostStageConfig = Static<typeof publicSchema>;

/**
 * Morphology-post knobs (volcanism). Knobs apply after defaulted step config as deterministic transforms.
 */
const knobsSchema = Type.Object(
  {
    volcanism: Type.Optional(MorphologyVolcanismKnobSchema),
  },
  {
    description:
      "Morphology-post knobs (volcanism). Knobs apply after defaulted step config as deterministic transforms.",
  }
);

export default createStage({
  id: "morphology-post",
  knobsSchema,
  public: publicSchema,
  compile: ({ config }: { config: MorphologyPostStageConfig }) => config.advanced ?? {},
  steps: [islands, volcanoes, landmasses],
} as const);

import { Type, createStage, type Static } from "@swooper/mapgen-core/authoring";
import { landmassPlates } from "./steps/index.js";
import { MorphologySeaLevelKnobSchema } from "@mapgen/domain/morphology/shared/knobs.js";

/**
 * Advanced Morphology-pre step config baseline. Knobs apply last as deterministic transforms over this baseline.
 */
const publicSchema = Type.Object(
  {
    advanced: Type.Optional(
      Type.Object(
        {
          "landmass-plates": Type.Optional(landmassPlates.contract.schema),
        },
        {
          additionalProperties: false,
          description:
            "Advanced Morphology-pre step config baseline. Knobs apply last as deterministic transforms over this baseline.",
        }
      )
    ),
  },
  { additionalProperties: false }
);

type MorphologyPreStageConfig = Static<typeof publicSchema>;

/**
 * Morphology-pre knobs (seaLevel). Knobs apply after defaulted step config as deterministic transforms.
 */
const knobsSchema = Type.Object(
  {
    seaLevel: Type.Optional(MorphologySeaLevelKnobSchema),
  },
  {
    description:
      "Morphology-pre knobs (seaLevel). Knobs apply after defaulted step config as deterministic transforms.",
  }
);

export default createStage({
  id: "morphology-pre",
  knobsSchema,
  public: publicSchema,
  compile: ({ config }: { config: MorphologyPreStageConfig }) => config.advanced ?? {},
  steps: [landmassPlates],
} as const);

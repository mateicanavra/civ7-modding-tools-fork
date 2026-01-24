import { Type, createStage, type Static } from "@swooper/mapgen-core/authoring";
import { geomorphology, ruggedCoasts, routing } from "./steps/index.js";
import {
  MorphologyCoastRuggednessKnobSchema,
  MorphologyErosionKnobSchema,
} from "@mapgen/domain/morphology/shared/knobs.js";

/**
 * Advanced Morphology-mid step config baseline. Knobs apply last as deterministic transforms over this baseline.
 */
const publicSchema = Type.Object(
  {
    advanced: Type.Optional(
      Type.Object(
        {
          "rugged-coasts": Type.Optional(ruggedCoasts.contract.schema),
          routing: Type.Optional(routing.contract.schema),
          geomorphology: Type.Optional(geomorphology.contract.schema),
        },
        {
          additionalProperties: false,
          description:
            "Advanced Morphology-mid step config baseline. Knobs apply last as deterministic transforms over this baseline.",
        }
      )
    ),
  },
  { additionalProperties: false }
);

type MorphologyMidStageConfig = Static<typeof publicSchema>;

/**
 * Morphology-mid knobs (erosion/coastRuggedness). Knobs apply after defaulted step config as deterministic transforms.
 */
const knobsSchema = Type.Object(
  {
    erosion: Type.Optional(MorphologyErosionKnobSchema),
    coastRuggedness: Type.Optional(MorphologyCoastRuggednessKnobSchema),
  },
  {
    description:
      "Morphology-mid knobs (erosion/coastRuggedness). Knobs apply after defaulted step config as deterministic transforms.",
  }
);

export default createStage({
  id: "morphology-mid",
  knobsSchema,
  public: publicSchema,
  compile: ({ config }: { config: MorphologyMidStageConfig }) => config.advanced ?? {},
  steps: [ruggedCoasts, routing, geomorphology],
} as const);

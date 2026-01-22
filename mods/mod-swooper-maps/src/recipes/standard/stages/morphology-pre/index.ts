import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { landmassPlates } from "./steps/index.js";
import { MorphologySeaLevelKnobSchema } from "@mapgen/domain/morphology/shared/knobs.js";

export default createStage({
  id: "morphology-pre",
  knobsSchema: Type.Object(
    {
      seaLevel: Type.Optional(MorphologySeaLevelKnobSchema),
    },
    {
      description:
        "Morphology-pre knobs (seaLevel). Knobs apply after defaulted step config as deterministic transforms.",
    }
  ),
  steps: [landmassPlates],
} as const);

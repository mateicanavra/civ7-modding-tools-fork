import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { geomorphology, ruggedCoasts, routing } from "./steps/index.js";
import {
  MorphologyCoastRuggednessKnobSchema,
  MorphologyErosionKnobSchema,
} from "@mapgen/domain/morphology/shared/knobs.js";

export default createStage({
  id: "morphology-mid",
  knobsSchema: Type.Object(
    {
      erosion: Type.Optional(MorphologyErosionKnobSchema),
      coastRuggedness: Type.Optional(MorphologyCoastRuggednessKnobSchema),
    },
    {
      description:
        "Morphology-mid knobs (erosion/coastRuggedness). Knobs apply after defaulted step config as deterministic transforms.",
    }
  ),
  steps: [ruggedCoasts, routing, geomorphology],
} as const);

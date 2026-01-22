import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { islands, landmasses, volcanoes } from "./steps/index.js";
import { MorphologyVolcanismKnobSchema } from "@mapgen/domain/morphology/shared/knobs.js";

export default createStage({
  id: "morphology-post",
  knobsSchema: Type.Object(
    {
      volcanism: Type.Optional(MorphologyVolcanismKnobSchema),
    },
    {
      description:
        "Morphology-post knobs (volcanism). Knobs apply after defaulted step config as deterministic transforms.",
    }
  ),
  steps: [islands, volcanoes, landmasses],
} as const);

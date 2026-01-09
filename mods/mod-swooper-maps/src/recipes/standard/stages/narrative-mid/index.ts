import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { storyCorridorsPre, storyOrogeny } from "./steps/index.js";

export default createStage({
  id: "narrative-mid",
  knobsSchema: Type.Object({}, { additionalProperties: false, default: {} }),
  steps: [storyOrogeny, storyCorridorsPre],
} as const);

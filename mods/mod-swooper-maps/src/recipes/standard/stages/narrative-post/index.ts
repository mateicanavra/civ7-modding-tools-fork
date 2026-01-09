import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { storyCorridorsPost } from "./steps/index.js";

export default createStage({
  id: "narrative-post",
  knobsSchema: Type.Object({}, { additionalProperties: false, default: {} }),
  steps: [storyCorridorsPost],
} as const);

import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { storyOrogeny } from "./steps/index.js";

export default createStage({
  id: "narrative-mid",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [storyOrogeny],
} as const);

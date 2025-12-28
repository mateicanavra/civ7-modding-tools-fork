import { createStage } from "@swooper/mapgen-core/authoring";
import { storyCorridorsPre, storyOrogeny } from "./steps/index.js";

export default createStage({
  id: "narrative-mid",
  steps: [storyOrogeny, storyCorridorsPre],
} as const);

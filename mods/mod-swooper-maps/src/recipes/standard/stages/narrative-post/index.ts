import { createStage } from "@swooper/mapgen-core/authoring";
import { storyCorridorsPost } from "./steps/index.js";

export default createStage({
  id: "narrative-post",
  steps: [storyCorridorsPost],
} as const);

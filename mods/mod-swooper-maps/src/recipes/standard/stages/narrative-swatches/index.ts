import { createStage } from "@swooper/mapgen-core/authoring";
import { storySwatches } from "./steps/index.js";

export default createStage({
  id: "narrative-swatches",
  steps: [storySwatches],
} as const);

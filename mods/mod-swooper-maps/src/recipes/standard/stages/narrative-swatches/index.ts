import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { storySwatches } from "./steps/index.js";

export default createStage({
  id: "narrative-swatches",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [storySwatches],
} as const);

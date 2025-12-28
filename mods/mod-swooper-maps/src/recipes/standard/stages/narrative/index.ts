import { createStage } from "@swooper/mapgen-core/authoring";
import { seedNarrative } from "./steps/index.js";

export default createStage({
  id: "narrative",
  steps: [seedNarrative],
} as const);

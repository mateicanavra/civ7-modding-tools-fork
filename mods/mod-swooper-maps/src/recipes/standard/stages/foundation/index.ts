import { createStage } from "@swooper/mapgen-core/authoring";
import { foundation } from "./steps/index.js";

export default createStage({
  id: "foundation",
  steps: [foundation],
} as const);

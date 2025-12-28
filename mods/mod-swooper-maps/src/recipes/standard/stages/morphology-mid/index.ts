import { createStage } from "@swooper/mapgen-core/authoring";
import { ruggedCoasts } from "./steps/index.js";

export default createStage({
  id: "morphology-mid",
  steps: [ruggedCoasts],
} as const);

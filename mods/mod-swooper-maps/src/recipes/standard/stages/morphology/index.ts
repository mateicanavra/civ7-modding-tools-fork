import { createStage } from "@swooper/mapgen-core/authoring";
import { buildHeightfield } from "./steps/index.js";

export default createStage({
  id: "morphology",
  steps: [buildHeightfield],
} as const);

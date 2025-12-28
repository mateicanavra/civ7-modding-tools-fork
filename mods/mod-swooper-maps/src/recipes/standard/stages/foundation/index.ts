import { createStage } from "@swooper/mapgen-core/authoring";
import { buildFoundation } from "./steps/index.js";

export default createStage({
  id: "foundation",
  steps: [buildFoundation],
} as const);

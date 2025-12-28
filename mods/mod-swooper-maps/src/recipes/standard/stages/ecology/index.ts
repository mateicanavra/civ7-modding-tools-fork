import { createStage } from "@swooper/mapgen-core/authoring";
import { applyBiomes } from "./steps/index.js";

export default createStage({
  id: "ecology",
  steps: [applyBiomes],
} as const);

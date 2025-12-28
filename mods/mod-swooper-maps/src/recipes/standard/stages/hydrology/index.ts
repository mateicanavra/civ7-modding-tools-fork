import { createStage } from "@swooper/mapgen-core/authoring";
import { buildClimateField } from "./steps/index.js";

export default createStage({
  id: "hydrology",
  steps: [buildClimateField],
} as const);

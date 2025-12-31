import { createStage } from "@swooper/mapgen-core/authoring";
import { climateRefine } from "./steps/index.js";

export default createStage({
  id: "hydrology-post",
  steps: [climateRefine],
} as const);

import { createStage } from "@swooper/mapgen-core/authoring";
import { climateBaseline, climateRefine, lakes, rivers } from "./steps/index.js";

export default createStage({
  id: "hydrology",
  steps: [lakes, climateBaseline, rivers, climateRefine],
} as const);

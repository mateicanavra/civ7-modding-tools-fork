import { createStage } from "@swooper/mapgen-core/authoring";
import { climateBaseline, lakes } from "./steps/index.js";

export default createStage({
  id: "hydrology-pre",
  steps: [lakes, climateBaseline],
} as const);

import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { plotCoasts, plotContinents } from "./steps/index.js";

export default createStage({
  id: "map-morphology",
  knobsSchema: Type.Object({}),
  steps: [plotCoasts, plotContinents],
} as const);

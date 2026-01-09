import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { climateRefine } from "./steps/index.js";

export default createStage({
  id: "hydrology-post",
  knobsSchema: Type.Object({}, { additionalProperties: false, default: {} }),
  steps: [climateRefine],
} as const);

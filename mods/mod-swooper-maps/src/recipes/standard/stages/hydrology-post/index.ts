import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { climateRefine } from "./steps/index.js";

export default createStage({
  id: "hydrology-post",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [climateRefine],
} as const);

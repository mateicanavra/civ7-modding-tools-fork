import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { climateBaseline, lakes } from "./steps/index.js";

export default createStage({
  id: "hydrology-pre",
  knobsSchema: Type.Object({}, { additionalProperties: false, default: {} }),
  steps: [lakes, climateBaseline],
} as const);

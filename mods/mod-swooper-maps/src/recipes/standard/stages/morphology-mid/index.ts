import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { ruggedCoasts } from "./steps/index.js";

export default createStage({
  id: "morphology-mid",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [ruggedCoasts],
} as const);

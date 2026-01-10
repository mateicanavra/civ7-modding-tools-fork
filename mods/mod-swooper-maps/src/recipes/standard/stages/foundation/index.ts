import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { foundation } from "./steps/index.js";

export default createStage({
  id: "foundation",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [foundation],
} as const);

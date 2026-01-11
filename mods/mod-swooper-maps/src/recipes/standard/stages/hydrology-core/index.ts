import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { rivers } from "./steps/index.js";

export default createStage({
  id: "hydrology-core",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [rivers],
} as const);

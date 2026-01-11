import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { derivePlacementInputs, placement } from "./steps/index.js";

export default createStage({
  id: "placement",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [derivePlacementInputs, placement],
} as const);

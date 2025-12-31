import { createStage } from "@swooper/mapgen-core/authoring";
import { derivePlacementInputs, placement } from "./steps/index.js";

export default createStage({
  id: "placement",
  steps: [derivePlacementInputs, placement],
} as const);

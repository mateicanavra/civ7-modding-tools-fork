import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { derivePlacementInputs, placement, plotLandmassRegions } from "./steps/index.js";

export default createStage({
  id: "placement",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [derivePlacementInputs, plotLandmassRegions, placement],
} as const);

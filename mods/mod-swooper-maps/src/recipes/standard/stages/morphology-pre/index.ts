import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { coastlines, landmassPlates } from "./steps/index.js";

export default createStage({
  id: "morphology-pre",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [landmassPlates, coastlines],
} as const);

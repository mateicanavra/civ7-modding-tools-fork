import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { landmassPlates } from "./steps/index.js";

export default createStage({
  id: "morphology-pre",
  knobsSchema: Type.Object({}),
  steps: [landmassPlates],
} as const);

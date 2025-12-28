import { createStage } from "@swooper/mapgen-core/authoring";
import { coastlines, landmassPlates } from "./steps/index.js";

export default createStage({
  id: "morphology-pre",
  steps: [landmassPlates, coastlines],
} as const);

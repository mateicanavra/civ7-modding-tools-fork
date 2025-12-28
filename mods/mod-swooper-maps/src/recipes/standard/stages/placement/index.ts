import { createStage } from "@swooper/mapgen-core/authoring";
import { assignStarts } from "./steps/index.js";

export default createStage({
  id: "placement",
  steps: [assignStarts],
} as const);

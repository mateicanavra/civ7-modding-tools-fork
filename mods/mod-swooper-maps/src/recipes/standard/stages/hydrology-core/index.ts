import { createStage } from "@swooper/mapgen-core/authoring";
import { rivers } from "./steps/index.js";

export default createStage({
  id: "hydrology-core",
  steps: [rivers],
} as const);

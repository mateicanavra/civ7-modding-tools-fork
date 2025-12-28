import { createStage } from "@swooper/mapgen-core/authoring";
import { islands, mountains, volcanoes } from "./steps/index.js";

export default createStage({
  id: "morphology-post",
  steps: [islands, mountains, volcanoes],
} as const);

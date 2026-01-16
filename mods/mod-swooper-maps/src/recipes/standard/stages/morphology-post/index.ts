import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { islands, landmasses, mountains, volcanoes } from "./steps/index.js";

export default createStage({
  id: "morphology-post",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [islands, mountains, volcanoes, landmasses],
} as const);

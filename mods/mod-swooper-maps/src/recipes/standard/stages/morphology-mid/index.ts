import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { geomorphology, ruggedCoasts, routing } from "./steps/index.js";

export default createStage({
  id: "morphology-mid",
  knobsSchema: Type.Object({}),
  steps: [ruggedCoasts, routing, geomorphology],
} as const);

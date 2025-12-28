import { createStage } from "@swooper/mapgen-core/authoring";
import {
  coastlines,
  islands,
  landmassPlates,
  mountains,
  ruggedCoasts,
  volcanoes,
} from "./steps/index.js";

export default createStage({
  id: "morphology",
  steps: [landmassPlates, coastlines, ruggedCoasts, islands, mountains, volcanoes],
} as const);

import { createStage } from "@swooper/mapgen-core/authoring";
import { climateRefine } from "./steps/index.js";
import {
  HydrologyKnobsSchema,
} from "@mapgen/domain/hydrology/knobs.js";

export default createStage({
  id: "hydrology-post",
  knobsSchema: HydrologyKnobsSchema,
  steps: [climateRefine],
} as const);

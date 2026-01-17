import { createStage } from "@swooper/mapgen-core/authoring";
import { climateRefine } from "./steps/index.js";
import {
  HydrologyClimateRefineKnobsSchema,
} from "@mapgen/domain/hydrology/knobs.js";

export default createStage({
  id: "hydrology-climate-refine",
  knobsSchema: HydrologyClimateRefineKnobsSchema,
  steps: [climateRefine],
} as const);

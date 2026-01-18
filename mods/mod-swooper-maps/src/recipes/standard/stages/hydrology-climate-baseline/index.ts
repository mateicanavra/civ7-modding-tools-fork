import { createStage } from "@swooper/mapgen-core/authoring";
import { climateBaseline, lakes } from "./steps/index.js";
import {
  HydrologyKnobsSchema,
} from "@mapgen/domain/hydrology/knobs.js";

export default createStage({
  id: "hydrology-climate-baseline",
  knobsSchema: HydrologyKnobsSchema,
  steps: [lakes, climateBaseline],
} as const);

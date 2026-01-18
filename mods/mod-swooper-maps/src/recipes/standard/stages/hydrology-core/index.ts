import { createStage } from "@swooper/mapgen-core/authoring";
import { rivers } from "./steps/index.js";
import {
  HydrologyKnobsSchema,
} from "@mapgen/domain/hydrology/knobs.js";

export default createStage({
  id: "hydrology-core",
  knobsSchema: HydrologyKnobsSchema,
  steps: [rivers],
} as const);

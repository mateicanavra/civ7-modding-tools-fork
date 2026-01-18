import { createStage } from "@swooper/mapgen-core/authoring";
import { rivers } from "./steps/index.js";
import {
  HydrologyHydrographyKnobsSchema,
} from "@mapgen/domain/hydrology/knobs.js";

export default createStage({
  id: "hydrology-hydrography",
  knobsSchema: HydrologyHydrographyKnobsSchema,
  steps: [rivers],
} as const);

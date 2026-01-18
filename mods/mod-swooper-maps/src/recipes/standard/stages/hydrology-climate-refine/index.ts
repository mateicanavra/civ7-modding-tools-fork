import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { climateRefine } from "./steps/index.js";

import {
  HydrologyCryosphereKnobSchema,
  HydrologyDrynessKnobSchema,
  HydrologyTemperatureKnobSchema,
} from "@mapgen/domain/hydrology/knobs.js";

const knobsSchema = Type.Object(
  {
    /**
     * Global moisture availability bias (not regional).
     *
     * This stage uses the knob to bias bounded feedback and diagnostics; it does not rewrite baseline climate fields.
     */
    dryness: Type.Optional(HydrologyDrynessKnobSchema),
    /**
     * Global thermal bias.
     *
     * This stage uses the knob to bias cryosphere formation and post-pass diagnostics (deterministically).
     */
    temperature: Type.Optional(HydrologyTemperatureKnobSchema),
    /**
     * Cryosphere enablement.
     *
     * If you want to disable bounded cryosphere/albedo feedback entirely, set `cryosphere: "off"`.
     */
    cryosphere: Type.Optional(HydrologyCryosphereKnobSchema),
  },
  {
    description:
      "Hydrology climate-refine knobs (dryness/temperature/cryosphere). Stage-scoped: knobs only affect bounded feedback and diagnostics, not river projection.",
  }
);

export default createStage({
  id: "hydrology-climate-refine",
  knobsSchema,
  steps: [climateRefine],
} as const);

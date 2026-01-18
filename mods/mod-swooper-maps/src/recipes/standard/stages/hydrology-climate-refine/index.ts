import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { climateRefine } from "./steps/index.js";
import {
  HydrologyCryosphereKnobSchema,
  HydrologyDrynessKnobSchema,
  HydrologyTemperatureKnobSchema,
} from "@mapgen/domain/hydrology/shared/knobs.js";

const knobsSchema = Type.Object(
  {
    /**
     * Global moisture availability bias (not regional).
     *
     * Stage scope:
     * - Transforms bounded refine deltas and diagnostics biases.
     * - Must not change baseline climate generation (that belongs to climate-baseline).
     */
    dryness: Type.Optional(HydrologyDrynessKnobSchema),
    /**
     * Global thermal bias.
     *
     * Stage scope:
     * - Transforms thermal regime over the defaulted baseline for refine/diagnostics.
     */
    temperature: Type.Optional(HydrologyTemperatureKnobSchema),
    /**
     * Cryosphere enablement.
     *
     * Stage scope:
     * - When off: disables bounded albedo feedback and disables cryosphere products deterministically.
     */
    cryosphere: Type.Optional(HydrologyCryosphereKnobSchema),
  },
  {
    description:
      "Hydrology climate-refine knobs (dryness/temperature/cryosphere). Knobs apply after defaulted step config as deterministic transforms.",
  }
);

export default createStage({
  id: "hydrology-climate-refine",
  knobsSchema,
  steps: [climateRefine],
} as const);

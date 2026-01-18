import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { climateBaseline, lakes } from "./steps/index.js";
import {
  HydrologyDrynessKnobSchema,
  HydrologyLakeinessKnobSchema,
  HydrologyOceanCouplingKnobSchema,
  HydrologySeasonalityKnobSchema,
  HydrologyTemperatureKnobSchema,
} from "@mapgen/domain/hydrology/shared/knobs.js";

const knobsSchema = Type.Object(
  {
    /**
     * Global moisture availability bias (not regional).
     *
     * Stage scope:
     * - Transforms baseline rainfall/moisture and related forcing only.
     * - Must not change discharge routing truth or hydrography projection thresholds.
     */
    dryness: Type.Optional(HydrologyDrynessKnobSchema),
    /**
     * Global thermal bias.
     *
     * Stage scope:
     * - Transforms baseline temperature regime and downstream evap/precip coupling inputs.
     * - Must not implement “compat” behavior; use advanced config for exact numeric control.
     */
    temperature: Type.Optional(HydrologyTemperatureKnobSchema),
    /**
     * Seasonal cycle posture.
     *
     * Stage scope:
     * - Transforms wind texture + precip noise texture.
     * - Transforms the annual amplitude posture (mode count / axial tilt biases).
     */
    seasonality: Type.Optional(HydrologySeasonalityKnobSchema),
    /**
     * Ocean coupling posture.
     *
     * Stage scope:
     * - Transforms winds/currents/transport and coastal gradients deterministically.
     */
    oceanCoupling: Type.Optional(HydrologyOceanCouplingKnobSchema),
    /**
     * Lake projection frequency bias.
     *
     * Stage scope:
     * - Transforms lake projection frequency only (engine projection).
     * - Does not change discharge routing truth or hydrography classification.
     */
    lakeiness: Type.Optional(HydrologyLakeinessKnobSchema),
  },
  {
    description:
      "Hydrology climate-baseline knobs (dryness/temperature/seasonality/oceanCoupling/lakeiness). Knobs apply after defaulted step config as deterministic transforms.",
  }
);

export default createStage({
  id: "hydrology-climate-baseline",
  knobsSchema,
  steps: [lakes, climateBaseline],
} as const);

import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { climateBaseline, lakes } from "./steps/index.js";

import {
  HydrologyDrynessKnobSchema,
  HydrologyLakeinessKnobSchema,
  HydrologyOceanCouplingKnobSchema,
  HydrologySeasonalityKnobSchema,
  HydrologyTemperatureKnobSchema,
} from "@mapgen/domain/hydrology/knobs.js";

const knobsSchema = Type.Object(
  {
    /**
     * Global moisture availability bias (not regional).
     *
     * If you want the map globally wetter/drier, change this knob; it compiles into internal climate forcing and
     * moisture source parameters for the baseline climate pass.
     */
    dryness: Type.Optional(HydrologyDrynessKnobSchema),
    /**
     * Global thermal bias.
     *
     * If you want colder/hotter baseline climates (snowline shifts, PET changes), change this knob.
     */
    temperature: Type.Optional(HydrologyTemperatureKnobSchema),
    /**
     * Seasonal forcing intent.
     *
     * This stage uses the knob to select a seasonal sampling posture and to shape the annual mean + amplitude fields.
     */
    seasonality: Type.Optional(HydrologySeasonalityKnobSchema),
    /**
     * Ocean influence preset.
     *
     * This stage uses the knob to choose ocean coupling posture for winds/currents and moisture transport iterations.
     */
    oceanCoupling: Type.Optional(HydrologyOceanCouplingKnobSchema),
    /**
     * Lake frequency bias.
     *
     * This stage uses the knob to bias lake projection frequency; it does not change discharge routing truth.
     */
    lakeiness: Type.Optional(HydrologyLakeinessKnobSchema),
  },
  {
    description:
      "Hydrology climate-baseline knobs (dryness/temperature/seasonality/oceanCoupling/lakeiness). Stage-scoped: knobs only affect baseline climate and lake projection, not river network projection thresholds.",
  }
);

export default createStage({
  id: "hydrology-climate-baseline",
  knobsSchema,
  steps: [lakes, climateBaseline],
} as const);

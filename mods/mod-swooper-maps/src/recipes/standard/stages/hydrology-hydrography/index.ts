import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { rivers } from "./steps/index.js";

import { HydrologyRiverDensityKnobSchema } from "@mapgen/domain/hydrology/knobs.js";

const knobsSchema = Type.Object(
  {
    /**
     * River network projection density (engine-facing projection only).
     *
     * If you want fewer/more projected rivers while keeping discharge routing truth intact, adjust this knob.
     */
    riverDensity: Type.Optional(HydrologyRiverDensityKnobSchema),
  },
  {
    description:
      "Hydrology hydrography knobs (riverDensity). Stage-scoped: knobs only affect river network projection thresholds, not baseline/refine climate.",
  }
);

export default createStage({
  id: "hydrology-hydrography",
  knobsSchema,
  steps: [rivers],
} as const);

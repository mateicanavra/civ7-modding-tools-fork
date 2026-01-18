import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { rivers } from "./steps/index.js";
import {
  HydrologyRiverDensityKnobSchema,
} from "@mapgen/domain/hydrology/shared/knobs.js";

const knobsSchema = Type.Object(
  {
    /**
     * River projection density.
     *
     * Stage scope:
     * - Transforms projection thresholds/length bounds over the defaulted baseline.
     * - Does not change discharge routing truth (only projection/classification).
     */
    riverDensity: Type.Optional(HydrologyRiverDensityKnobSchema),
  },
  {
    description:
      "Hydrology hydrography knobs (riverDensity). Knobs apply after defaulted step config as deterministic transforms.",
  }
);

export default createStage({
  id: "hydrology-hydrography",
  knobsSchema,
  steps: [rivers],
} as const);

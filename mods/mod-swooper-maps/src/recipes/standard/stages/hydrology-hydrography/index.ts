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
     * - Applies as a deterministic transform over Hydrology physics inputs (runoff scaling).
     * - Does not change routing truth (flow directions); it changes how much water becomes runoff.
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

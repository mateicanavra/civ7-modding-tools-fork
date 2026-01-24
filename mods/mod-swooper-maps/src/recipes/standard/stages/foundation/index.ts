import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { crust, mesh, plateGraph, projection, tectonics } from "./steps/index.js";
import {
  FoundationPlateActivityKnobSchema,
  FoundationPlateCountKnobSchema,
} from "@mapgen/domain/foundation/shared/knobs.js";

const knobsSchema = Type.Object(
  {
    plateCount: Type.Optional(FoundationPlateCountKnobSchema),
    plateActivity: Type.Optional(FoundationPlateActivityKnobSchema),
  },
  {
    description:
      "Foundation knobs (plateCount/plateActivity). Knobs apply after defaulted step config as deterministic transforms.",
  }
);

export default createStage({
  id: "foundation",
  knobsSchema,
  steps: [mesh, crust, plateGraph, tectonics, projection],
} as const);

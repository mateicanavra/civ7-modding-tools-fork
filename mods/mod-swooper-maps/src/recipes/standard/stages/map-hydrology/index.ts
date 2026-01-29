import { Type, createStage } from "@swooper/mapgen-core/authoring";
import {
  HydrologyLakeinessKnobSchema,
} from "@mapgen/domain/hydrology/shared/knobs.js";
import { lakes, plotRivers } from "./steps/index.js";

const knobsSchema = Type.Object(
  {
    lakeiness: Type.Optional(HydrologyLakeinessKnobSchema),
  },
  {
    description:
      "Map-hydrology knobs (lakeiness). Knobs apply to gameplay projection; lakeiness affects lake persistence physics.",
  }
);

export default createStage({
  id: "map-hydrology",
  knobsSchema,
  steps: [lakes, plotRivers],
} as const);

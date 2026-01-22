import { Type, createStage, type Static } from "@swooper/mapgen-core/authoring";
import { crust, mesh, plateGraph, projection, tectonics } from "./steps/index.js";
import {
  FoundationPlateActivityKnobSchema,
  FoundationPlateCountKnobSchema,
} from "@mapgen/domain/foundation/shared/knobs.js";

/**
 * Foundation knobs (plateCount/plateActivity). Knobs apply after defaulted step config as deterministic transforms.
 */
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

/**
 * Advanced Foundation step config baseline. Knobs apply last as deterministic transforms over this baseline.
 */
const publicSchema = Type.Object(
  {
    advanced: Type.Optional(
      Type.Object(
        {
          mesh: Type.Optional(mesh.contract.schema),
          crust: Type.Optional(crust.contract.schema),
          "plate-graph": Type.Optional(plateGraph.contract.schema),
          tectonics: Type.Optional(tectonics.contract.schema),
          projection: Type.Optional(projection.contract.schema),
        },
        {
          additionalProperties: false,
          description:
            "Advanced Foundation step config baseline. Knobs apply last as deterministic transforms over this baseline.",
        }
      )
    ),
  },
  { additionalProperties: false }
);

type FoundationStageConfig = Static<typeof publicSchema>;

export default createStage({
  id: "foundation",
  knobsSchema,
  public: publicSchema,
  compile: ({ config }: { config: FoundationStageConfig }) => config.advanced ?? {},
  steps: [mesh, crust, plateGraph, tectonics, projection],
} as const);

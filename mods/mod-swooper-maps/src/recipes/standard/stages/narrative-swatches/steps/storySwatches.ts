import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import {
  ClimateConfigSchema,
  FoundationDirectionalityConfigSchema,
} from "@mapgen/config";
import { publishClimateFieldArtifact } from "../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { getOrogenyCache } from "@mapgen/domain/narrative/orogeny/index.js";
import { storyTagClimateSwatches } from "@mapgen/domain/narrative/swatches.js";

const StorySwatchesStepConfigSchema = Type.Object(
  {
    climate: ClimateConfigSchema,
    foundation: Type.Object(
      {
        dynamics: Type.Object(
          {
            directionality: FoundationDirectionalityConfigSchema,
          },
          { additionalProperties: false, default: {} }
        ),
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { climate: {}, foundation: {} } }
);

type StorySwatchesStepConfig = Static<typeof StorySwatchesStepConfigSchema>;

export default createStep({
  id: "storySwatches",
  phase: "hydrology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.climateField,
    M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
  schema: StorySwatchesStepConfigSchema,
  run: (context: ExtendedMapContext, config: StorySwatchesStepConfig) => {
    storyTagClimateSwatches(context, {
      orogenyCache: getOrogenyCache(context),
      climate: config.climate,
      directionality: config.foundation?.dynamics?.directionality,
    });
    publishClimateFieldArtifact(context);
  },
} as const);

import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema, type FoundationDirectionalityConfig } from "@mapgen/config";
import { publishClimateFieldArtifact } from "../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { getOrogenyCache } from "@mapgen/domain/narrative/orogeny/index.js";
import { storyTagClimateSwatches } from "@mapgen/domain/narrative/swatches.js";

const StorySwatchesStepConfigSchema = Type.Object(
  {
    climate: ClimateConfigSchema,
  },
  { additionalProperties: false, default: { climate: {} } }
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
    const swatchesConfig = config.climate?.swatches as { enabled?: boolean } | undefined;
    if (!swatchesConfig || swatchesConfig.enabled === false) {
      publishClimateFieldArtifact(context);
      return;
    }

    const directionality = context.settings.directionality as FoundationDirectionalityConfig;
    if (!directionality) {
      throw new Error("storySwatches requires settings.directionality.");
    }
    storyTagClimateSwatches(context, {
      orogenyCache: getOrogenyCache(context),
      climate: config.climate,
      directionality,
    });
    publishClimateFieldArtifact(context);
  },
} as const);

import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { type FoundationDirectionalityConfig } from "@mapgen/domain/config";
import { publishClimateFieldArtifact } from "../../../artifacts.js";
import { getOrogenyCache } from "@mapgen/domain/narrative/orogeny/index.js";
import { storyTagClimateSwatches } from "@mapgen/domain/narrative/swatches.js";
import { StorySwatchesStepContract } from "./storySwatches.contract.js";

type StorySwatchesStepConfig = Static<typeof StorySwatchesStepContract.schema>;

export default createStep(StorySwatchesStepContract, {
  run: (context: ExtendedMapContext, config: StorySwatchesStepConfig) => {
    const swatchesConfig = config.climate?.swatches as { enabled?: boolean } | undefined;
    if (!swatchesConfig || swatchesConfig.enabled === false) {
      publishClimateFieldArtifact(context);
      return;
    }

    const directionality = context.settings.directionality as FoundationDirectionalityConfig;
    if (!directionality) {
      throw new Error("story-swatches requires settings.directionality.");
    }
    storyTagClimateSwatches(context, {
      orogenyCache: getOrogenyCache(context),
      climate: config.climate,
      directionality,
    });
    publishClimateFieldArtifact(context);
  },
});

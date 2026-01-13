import { createStep } from "@swooper/mapgen-core/authoring";
import { getOrogenyCache } from "@mapgen/domain/narrative/orogeny/index.js";
import { storyTagClimateSwatches } from "@mapgen/domain/narrative/swatches.js";
import StorySwatchesStepContract from "./storySwatches.contract.js";

export default createStep(StorySwatchesStepContract, {
  run: (context, config, _ops, deps) => {
    const swatchesConfig = config.climate?.swatches as { enabled?: boolean } | undefined;
    if (!swatchesConfig || swatchesConfig.enabled === false) {
      return;
    }

    void deps.artifacts.overlays.read(context);
    storyTagClimateSwatches(context, {
      orogenyCache: getOrogenyCache(context),
      climate: config.climate,
    });
  },
});

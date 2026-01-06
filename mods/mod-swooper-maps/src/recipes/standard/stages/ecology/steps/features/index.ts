import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import type { ResolvedFeaturesPlacementConfig } from "@mapgen/domain/ecology";
import { FeaturesStepContract } from "./contract.js";
import {
  buildFeaturesPlacementInput,
  buildReefEmbellishmentsInput,
  buildVegetationEmbellishmentsInput,
} from "./inputs.js";
import { applyFeaturePlacements, reifyFeatureField } from "./apply.js";
import { resolveFeatureKeyLookups } from "./feature-keys.js";

type FeaturesStepConfig = Static<typeof FeaturesStepContract.schema>;

export default createStep(FeaturesStepContract, {
  resolveConfig: (config, settings) => {
    return {
      featuresPlacement: ecology.ops.planFeaturePlacements.resolveConfig(
        config.featuresPlacement,
        settings
      ),
      reefEmbellishments: ecology.ops.planReefEmbellishments.resolveConfig(
        config.reefEmbellishments,
        settings
      ),
      vegetationEmbellishments: ecology.ops.planVegetationEmbellishments.resolveConfig(
        config.vegetationEmbellishments,
        settings
      ),
    };
  },
  run: (context: ExtendedMapContext, config: FeaturesStepConfig) => {
    const featureLookups = resolveFeatureKeyLookups(context.adapter);

    const placementInput = buildFeaturesPlacementInput(
      context,
      config.featuresPlacement.config as ResolvedFeaturesPlacementConfig,
      featureLookups
    );
    const placementResult = ecology.ops.planFeaturePlacements.runValidated(
      placementInput,
      config.featuresPlacement
    );

    if (placementResult.placements.length > 0) {
      applyFeaturePlacements(context, placementResult.placements, featureLookups);
    }

    const reefInput = buildReefEmbellishmentsInput(context, featureLookups);
    const reefResult = ecology.ops.planReefEmbellishments.runValidated(
      reefInput,
      config.reefEmbellishments
    );

    if (reefResult.placements.length > 0) {
      applyFeaturePlacements(context, reefResult.placements, featureLookups);
    }

    const vegetationInput = buildVegetationEmbellishmentsInput(context, featureLookups);
    const vegetationResult = ecology.ops.planVegetationEmbellishments.runValidated(
      vegetationInput,
      config.vegetationEmbellishments
    );

    if (vegetationResult.placements.length > 0) {
      applyFeaturePlacements(context, vegetationResult.placements, featureLookups);
    }

    reifyFeatureField(context);
    context.adapter.validateAndFixTerrain();
    syncHeightfield(context);
    context.adapter.recalculateAreas();
  },
});

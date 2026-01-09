import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { FeaturesStepContract } from "./contract.js";
import {
  buildAquaticFeaturePlacementsInput,
  buildIceFeaturePlacementsInput,
  buildReefEmbellishmentsInput,
  buildVegetatedFeaturePlacementsInput,
  buildVegetationEmbellishmentsInput,
  buildWetFeaturePlacementsInput,
} from "./inputs.js";
import { applyFeaturePlacements, reifyFeatureField } from "./apply.js";
import { resolveFeatureKeyLookups } from "./feature-keys.js";

type FeaturesStepConfig = Static<typeof FeaturesStepContract.schema>;

export default createStep(FeaturesStepContract, {
  normalize: (config, ctx) => {
    return {
      featuresPlacement: {
        vegetated: ecology.ops.planVegetatedFeaturePlacements.normalize(
          config.featuresPlacement.vegetated,
          ctx
        ),
        wet: ecology.ops.planWetFeaturePlacements.normalize(
          config.featuresPlacement.wet,
          ctx
        ),
        aquatic: ecology.ops.planAquaticFeaturePlacements.normalize(
          config.featuresPlacement.aquatic,
          ctx
        ),
        ice: ecology.ops.planIceFeaturePlacements.normalize(
          config.featuresPlacement.ice,
          ctx
        ),
      },
      reefEmbellishments: ecology.ops.planReefEmbellishments.normalize(
        config.reefEmbellishments,
        ctx
      ),
      vegetationEmbellishments: ecology.ops.planVegetationEmbellishments.normalize(
        config.vegetationEmbellishments,
        ctx
      ),
    };
  },
  run: (context: ExtendedMapContext, config: FeaturesStepConfig) => {
    const featureLookups = resolveFeatureKeyLookups(context.adapter);

    const iceInput = buildIceFeaturePlacementsInput(context, featureLookups);
    const iceResult = ecology.ops.planIceFeaturePlacements.runValidated(
      iceInput,
      config.featuresPlacement.ice
    );
    if (iceResult.placements.length > 0) {
      applyFeaturePlacements(context, iceResult.placements, featureLookups);
    }

    const aquaticInput = buildAquaticFeaturePlacementsInput(context, featureLookups);
    const aquaticResult = ecology.ops.planAquaticFeaturePlacements.runValidated(
      aquaticInput,
      config.featuresPlacement.aquatic
    );
    if (aquaticResult.placements.length > 0) {
      applyFeaturePlacements(context, aquaticResult.placements, featureLookups);
    }

    const wetInput = buildWetFeaturePlacementsInput(
      context,
      config.featuresPlacement.wet.config,
      featureLookups
    );
    const wetResult = ecology.ops.planWetFeaturePlacements.runValidated(
      wetInput,
      config.featuresPlacement.wet
    );
    if (wetResult.placements.length > 0) {
      applyFeaturePlacements(context, wetResult.placements, featureLookups);
    }

    const vegetatedInput = buildVegetatedFeaturePlacementsInput(context, featureLookups);
    const vegetatedResult = ecology.ops.planVegetatedFeaturePlacements.runValidated(
      vegetatedInput,
      config.featuresPlacement.vegetated
    );
    if (vegetatedResult.placements.length > 0) {
      applyFeaturePlacements(context, vegetatedResult.placements, featureLookups);
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

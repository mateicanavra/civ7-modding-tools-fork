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
  resolveConfig: (config, settings) => {
    return {
      featuresPlacement: {
        vegetated: ecology.ops.planVegetatedFeaturePlacements.resolveConfig(
          config.featuresPlacement.vegetated,
          settings
        ),
        wet: ecology.ops.planWetFeaturePlacements.resolveConfig(
          config.featuresPlacement.wet,
          settings
        ),
        aquatic: ecology.ops.planAquaticFeaturePlacements.resolveConfig(
          config.featuresPlacement.aquatic,
          settings
        ),
        ice: ecology.ops.planIceFeaturePlacements.resolveConfig(
          config.featuresPlacement.ice,
          settings
        ),
      },
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

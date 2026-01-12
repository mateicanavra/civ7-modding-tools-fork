import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import FeaturesStepContract from "./contract.js";
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

export default createStep(FeaturesStepContract, {
  run: (context: ExtendedMapContext, config, ops) => {
    const featureLookups = resolveFeatureKeyLookups(context.adapter);

    const iceInput = buildIceFeaturePlacementsInput(context, featureLookups);
    const iceResult = ops.iceFeaturePlacements.run(iceInput, config.iceFeaturePlacements);
    if (iceResult.placements.length > 0) {
      applyFeaturePlacements(context, iceResult.placements, featureLookups);
    }

    const aquaticInput = buildAquaticFeaturePlacementsInput(context, featureLookups);
    const aquaticResult = ops.aquaticFeaturePlacements.run(
      aquaticInput,
      config.aquaticFeaturePlacements
    );
    if (aquaticResult.placements.length > 0) {
      applyFeaturePlacements(context, aquaticResult.placements, featureLookups);
    }

    const wetInput = buildWetFeaturePlacementsInput(
      context,
      config.wetFeaturePlacements.config,
      featureLookups
    );
    const wetResult = ops.wetFeaturePlacements.run(wetInput, config.wetFeaturePlacements);
    if (wetResult.placements.length > 0) {
      applyFeaturePlacements(context, wetResult.placements, featureLookups);
    }

    const vegetatedInput = buildVegetatedFeaturePlacementsInput(context, featureLookups);
    const vegetatedResult = ops.vegetatedFeaturePlacements.run(
      vegetatedInput,
      config.vegetatedFeaturePlacements
    );
    if (vegetatedResult.placements.length > 0) {
      applyFeaturePlacements(context, vegetatedResult.placements, featureLookups);
    }

    const reefInput = buildReefEmbellishmentsInput(context, featureLookups);
    const reefResult = ops.reefEmbellishments.run(reefInput, config.reefEmbellishments);

    if (reefResult.placements.length > 0) {
      applyFeaturePlacements(context, reefResult.placements, featureLookups);
    }

    const vegetationInput = buildVegetationEmbellishmentsInput(context, featureLookups);
    const vegetationResult = ops.vegetationEmbellishments.run(
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

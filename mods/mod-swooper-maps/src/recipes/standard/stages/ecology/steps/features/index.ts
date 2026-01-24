import { syncHeightfield } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
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
  run: (context, config, ops, deps) => {
    const featureLookups = resolveFeatureKeyLookups(context.adapter);
    const artifacts = {
      heightfield: deps.artifacts.heightfield.read(context),
      climateField: deps.artifacts.climateField.read(context),
      plates: deps.artifacts.foundationPlates.read(context),
      classification: deps.artifacts.biomeClassification.read(context),
    };

    const iceInput = buildIceFeaturePlacementsInput(context, featureLookups, artifacts);
    const iceResult = ops.iceFeaturePlacements(iceInput, config.iceFeaturePlacements);
    if (iceResult.placements.length > 0) {
      applyFeaturePlacements(context, iceResult.placements, featureLookups);
    }

    const aquaticInput = buildAquaticFeaturePlacementsInput(context, featureLookups, artifacts);
    const aquaticResult = ops.aquaticFeaturePlacements(
      aquaticInput,
      config.aquaticFeaturePlacements
    );
    if (aquaticResult.placements.length > 0) {
      applyFeaturePlacements(context, aquaticResult.placements, featureLookups);
    }

    const wetInput = buildWetFeaturePlacementsInput(
      context,
      config.wetFeaturePlacements.config,
      featureLookups,
      artifacts
    );
    const wetResult = ops.wetFeaturePlacements(wetInput, config.wetFeaturePlacements);
    if (wetResult.placements.length > 0) {
      applyFeaturePlacements(context, wetResult.placements, featureLookups);
    }

    const vegetatedInput = buildVegetatedFeaturePlacementsInput(
      context,
      featureLookups,
      artifacts
    );
    const vegetatedResult = ops.vegetatedFeaturePlacements(
      vegetatedInput,
      config.vegetatedFeaturePlacements
    );
    if (vegetatedResult.placements.length > 0) {
      applyFeaturePlacements(context, vegetatedResult.placements, featureLookups);
    }

    const reefInput = buildReefEmbellishmentsInput(context, featureLookups, artifacts);
    const reefResult = ops.reefEmbellishments(reefInput, config.reefEmbellishments);

    if (reefResult.placements.length > 0) {
      applyFeaturePlacements(context, reefResult.placements, featureLookups);
    }

    const vegetationInput = buildVegetationEmbellishmentsInput(
      context,
      featureLookups,
      artifacts
    );
    const vegetationResult = ops.vegetationEmbellishments(
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

import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import { type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
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

type FeaturesStepConfig = Static<typeof FeaturesStepContract.schema>;

const opContracts = {
  planVegetatedFeaturePlacements: ecology.contracts.planVegetatedFeaturePlacements,
  planWetFeaturePlacements: ecology.contracts.planWetFeaturePlacements,
  planAquaticFeaturePlacements: ecology.contracts.planAquaticFeaturePlacements,
  planIceFeaturePlacements: ecology.contracts.planIceFeaturePlacements,
  planReefEmbellishments: ecology.contracts.planReefEmbellishments,
  planVegetationEmbellishments: ecology.contracts.planVegetationEmbellishments,
} as const;

const { compile, runtime } = ecology.ops.bind(opContracts);

export default createStep(FeaturesStepContract, {
  normalize: (config, ctx) => {
    return {
      featuresPlacement: {
        vegetated: compile.planVegetatedFeaturePlacements.normalize(
          config.featuresPlacement.vegetated,
          ctx
        ),
        wet: compile.planWetFeaturePlacements.normalize(
          config.featuresPlacement.wet,
          ctx
        ),
        aquatic: compile.planAquaticFeaturePlacements.normalize(
          config.featuresPlacement.aquatic,
          ctx
        ),
        ice: compile.planIceFeaturePlacements.normalize(
          config.featuresPlacement.ice,
          ctx
        ),
      },
      reefEmbellishments: compile.planReefEmbellishments.normalize(
        config.reefEmbellishments,
        ctx
      ),
      vegetationEmbellishments: compile.planVegetationEmbellishments.normalize(
        config.vegetationEmbellishments,
        ctx
      ),
    };
  },
  run: (context: ExtendedMapContext, config: FeaturesStepConfig) => {
    const featureLookups = resolveFeatureKeyLookups(context.adapter);

    const iceInput = buildIceFeaturePlacementsInput(context, featureLookups);
    const iceResult = runtime.planIceFeaturePlacements.run(
      iceInput,
      config.featuresPlacement.ice
    );
    if (iceResult.placements.length > 0) {
      applyFeaturePlacements(context, iceResult.placements, featureLookups);
    }

    const aquaticInput = buildAquaticFeaturePlacementsInput(context, featureLookups);
    const aquaticResult = runtime.planAquaticFeaturePlacements.run(
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
    const wetResult = runtime.planWetFeaturePlacements.run(
      wetInput,
      config.featuresPlacement.wet
    );
    if (wetResult.placements.length > 0) {
      applyFeaturePlacements(context, wetResult.placements, featureLookups);
    }

    const vegetatedInput = buildVegetatedFeaturePlacementsInput(context, featureLookups);
    const vegetatedResult = runtime.planVegetatedFeaturePlacements.run(
      vegetatedInput,
      config.featuresPlacement.vegetated
    );
    if (vegetatedResult.placements.length > 0) {
      applyFeaturePlacements(context, vegetatedResult.placements, featureLookups);
    }

    const reefInput = buildReefEmbellishmentsInput(context, featureLookups);
    const reefResult = runtime.planReefEmbellishments.run(
      reefInput,
      config.reefEmbellishments
    );

    if (reefResult.placements.length > 0) {
      applyFeaturePlacements(context, reefResult.placements, featureLookups);
    }

    const vegetationInput = buildVegetationEmbellishmentsInput(context, featureLookups);
    const vegetationResult = runtime.planVegetationEmbellishments.run(
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

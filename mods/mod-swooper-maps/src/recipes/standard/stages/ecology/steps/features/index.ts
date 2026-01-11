import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import { bindCompileOps, bindRuntimeOps, type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import * as ecologyContracts from "@mapgen/domain/ecology/contracts";
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

const opContracts = {
  planVegetatedFeaturePlacements: ecologyContracts.PlanVegetatedFeaturePlacementsContract,
  planWetFeaturePlacements: ecologyContracts.PlanWetFeaturePlacementsContract,
  planAquaticFeaturePlacements: ecologyContracts.PlanAquaticFeaturePlacementsContract,
  planIceFeaturePlacements: ecologyContracts.PlanIceFeaturePlacementsContract,
  planReefEmbellishments: ecologyContracts.PlanReefEmbellishmentsContract,
  planVegetationEmbellishments: ecologyContracts.PlanVegetationEmbellishmentsContract,
} as const;

const compileOps = bindCompileOps(opContracts, ecology.compileOpsById);
const runtimeOps = bindRuntimeOps(opContracts, ecology.runtimeOpsById);

export default createStep(FeaturesStepContract, {
  normalize: (config, ctx) => {
    return {
      featuresPlacement: {
        vegetated: compileOps.planVegetatedFeaturePlacements.normalize(
          config.featuresPlacement.vegetated,
          ctx
        ),
        wet: compileOps.planWetFeaturePlacements.normalize(
          config.featuresPlacement.wet,
          ctx
        ),
        aquatic: compileOps.planAquaticFeaturePlacements.normalize(
          config.featuresPlacement.aquatic,
          ctx
        ),
        ice: compileOps.planIceFeaturePlacements.normalize(
          config.featuresPlacement.ice,
          ctx
        ),
      },
      reefEmbellishments: compileOps.planReefEmbellishments.normalize(
        config.reefEmbellishments,
        ctx
      ),
      vegetationEmbellishments: compileOps.planVegetationEmbellishments.normalize(
        config.vegetationEmbellishments,
        ctx
      ),
    };
  },
  run: (context: ExtendedMapContext, config: FeaturesStepConfig) => {
    const featureLookups = resolveFeatureKeyLookups(context.adapter);

    const iceInput = buildIceFeaturePlacementsInput(context, featureLookups);
    const iceResult = runtimeOps.planIceFeaturePlacements.run(
      iceInput,
      config.featuresPlacement.ice
    );
    if (iceResult.placements.length > 0) {
      applyFeaturePlacements(context, iceResult.placements, featureLookups);
    }

    const aquaticInput = buildAquaticFeaturePlacementsInput(context, featureLookups);
    const aquaticResult = runtimeOps.planAquaticFeaturePlacements.run(
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
    const wetResult = runtimeOps.planWetFeaturePlacements.run(
      wetInput,
      config.featuresPlacement.wet
    );
    if (wetResult.placements.length > 0) {
      applyFeaturePlacements(context, wetResult.placements, featureLookups);
    }

    const vegetatedInput = buildVegetatedFeaturePlacementsInput(context, featureLookups);
    const vegetatedResult = runtimeOps.planVegetatedFeaturePlacements.run(
      vegetatedInput,
      config.featuresPlacement.vegetated
    );
    if (vegetatedResult.placements.length > 0) {
      applyFeaturePlacements(context, vegetatedResult.placements, featureLookups);
    }

    const reefInput = buildReefEmbellishmentsInput(context, featureLookups);
    const reefResult = runtimeOps.planReefEmbellishments.run(
      reefInput,
      config.reefEmbellishments
    );

    if (reefResult.placements.length > 0) {
      applyFeaturePlacements(context, reefResult.placements, featureLookups);
    }

    const vegetationInput = buildVegetationEmbellishmentsInput(context, featureLookups);
    const vegetationResult = runtimeOps.planVegetationEmbellishments.run(
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

import { createStep } from "@swooper/mapgen-core/authoring";
import type { FeatureKey } from "@mapgen/domain/ecology";
import { syncHeightfield } from "@swooper/mapgen-core";
import FeaturesApplyStepContract from "./contract.js";
import { applyFeaturePlacements, reifyFeatureField } from "../features/apply.js";
import { resolveFeatureKeyLookups } from "../features/feature-keys.js";

export default createStep(FeaturesApplyStepContract, {
  run: (context, config, ops, deps) => {
    const intents = deps.artifacts.featureIntents.read(context);

    const merged = ops.apply(
      {
        vegetation: intents.vegetation,
        wetlands: intents.wetlands,
        reefs: intents.reefs,
        ice: intents.ice,
      },
      config.apply
    );

    const lookups = resolveFeatureKeyLookups(context.adapter);
    const filteredPlacements = merged.placements.filter(
      (placement): placement is { x: number; y: number; feature: FeatureKey; weight?: number } =>
        placement.feature in lookups.byKey
    );
    const size = context.dimensions.width * context.dimensions.height;
    if (!context.fields.featureType || context.fields.featureType.length !== size) {
      context.fields.featureType = new Int16Array(size);
    }
    const applied = applyFeaturePlacements(context, filteredPlacements, lookups);
    if (applied > 0) {
      reifyFeatureField(context);
      context.adapter.validateAndFixTerrain();
      syncHeightfield(context);
      context.adapter.recalculateAreas();
    }
  },
});

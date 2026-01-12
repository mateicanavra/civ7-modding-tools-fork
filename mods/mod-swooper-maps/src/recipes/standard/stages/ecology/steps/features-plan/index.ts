import { createStep, type Static } from "@swooper/mapgen-core/authoring";
import {
  biomeClassificationArtifact,
  featureIntentsArtifact,
  heightfieldArtifact,
  pedologyArtifact,
} from "../../../../artifacts.js";
import FeaturesPlanStepContract from "./contract.js";
type FeaturesPlanConfig = Static<typeof FeaturesPlanStepContract.schema>;

export default createStep(FeaturesPlanStepContract, {
  run: (context, config: FeaturesPlanConfig, ops) => {
    const classification = biomeClassificationArtifact.get(context);
    const pedology = pedologyArtifact.get(context);
    const heightfield = heightfieldArtifact.get(context);

    const { width, height } = context.dimensions;
    const vegetationPlan = ops.vegetation(
      {
        width,
        height,
        biomeIndex: classification.biomeIndex,
        vegetationDensity: classification.vegetationDensity,
        effectiveMoisture: classification.effectiveMoisture,
        surfaceTemperature: classification.surfaceTemperature,
        fertility: pedology.fertility,
        landMask: heightfield.landMask,
      },
      config.vegetation
    );

    const wetlandsPlan = ops.wetlands(
      {
        width,
        height,
        landMask: heightfield.landMask,
        effectiveMoisture: classification.effectiveMoisture,
        surfaceTemperature: classification.surfaceTemperature,
        fertility: pedology.fertility,
        elevation: heightfield.elevation,
      },
      config.wetlands
    );

    const reefsPlan = ops.reefs(
      {
        width,
        height,
        landMask: heightfield.landMask,
        surfaceTemperature: classification.surfaceTemperature,
      },
      config.reefs
    );

    const icePlan = ops.ice(
      {
        width,
        height,
        landMask: heightfield.landMask,
        surfaceTemperature: classification.surfaceTemperature,
        elevation: heightfield.elevation,
      },
      config.ice
    );

    featureIntentsArtifact.set(context, {
      vegetation: vegetationPlan.placements,
      wetlands: wetlandsPlan.placements,
      reefs: reefsPlan.placements,
      ice: icePlan.placements,
    });
  },
});

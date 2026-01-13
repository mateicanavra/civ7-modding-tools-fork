import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { ecologyArtifacts } from "../../artifacts.js";
import { validateFeatureIntentsArtifact } from "../../artifact-validation.js";
import FeaturesPlanStepContract from "./contract.js";

export default createStep(FeaturesPlanStepContract, {
  artifacts: implementArtifacts([ecologyArtifacts.featureIntents], {
    featureIntents: {
      validate: (value, context) => validateFeatureIntentsArtifact(value, context.dimensions),
    },
  }),
  run: (context, config, ops, deps) => {
    const classification = deps.artifacts.biomeClassification.read(context);
    const pedology = deps.artifacts.pedology.read(context);
    const heightfield = deps.artifacts.heightfield.read(context);

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

    deps.artifacts.featureIntents.publish(context, {
      vegetation: vegetationPlan.placements,
      wetlands: wetlandsPlan.placements,
      reefs: reefsPlan.placements,
      ice: icePlan.placements,
    });
  },
});

import { createStep } from "@mapgen/authoring/steps";
import { type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import {
  biomeClassificationArtifact,
  featureIntentsArtifact,
  heightfieldArtifact,
  pedologyArtifact,
} from "../../../../artifacts.js";
import { FeaturesPlanStepContract } from "./contract.js";

type FeaturesPlanConfig = Static<typeof FeaturesPlanStepContract.schema>;

const opContracts = {
  planVegetation: ecology.contracts.planVegetation,
  planWetlands: ecology.contracts.planWetlands,
  planReefs: ecology.contracts.planReefs,
  planIce: ecology.contracts.planIce,
} as const;

const { compile, runtime } = ecology.ops.bind(opContracts);

export default createStep(FeaturesPlanStepContract, {
  normalize: (config, ctx) => ({
    vegetation: compile.planVegetation.normalize(config.vegetation, ctx),
    wetlands: compile.planWetlands.normalize(config.wetlands, ctx),
    reefs: compile.planReefs.normalize(config.reefs, ctx),
    ice: compile.planIce.normalize(config.ice, ctx),
  }),
  run: (context, config: FeaturesPlanConfig) => {
    const classification = biomeClassificationArtifact.get(context);
    const pedology = pedologyArtifact.get(context);
    const heightfield = heightfieldArtifact.get(context);

    const { width, height } = context.dimensions;
    const vegetationPlan = runtime.planVegetation.run(
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

    const wetlandsPlan = runtime.planWetlands.run(
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

    const reefsPlan = runtime.planReefs.run(
      {
        width,
        height,
        landMask: heightfield.landMask,
        surfaceTemperature: classification.surfaceTemperature,
      },
      config.reefs
    );

    const icePlan = runtime.planIce.run(
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

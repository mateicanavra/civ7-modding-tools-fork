import { createStep } from "@mapgen/authoring/steps";
import { bindCompileOps, bindRuntimeOps, type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import * as ecologyContracts from "@mapgen/domain/ecology/contracts";
import {
  biomeClassificationArtifact,
  featureIntentsArtifact,
  heightfieldArtifact,
  pedologyArtifact,
} from "../../../../artifacts.js";
import { FeaturesPlanStepContract } from "./contract.js";

type FeaturesPlanConfig = Static<typeof FeaturesPlanStepContract.schema>;

const opContracts = {
  planVegetation: ecologyContracts.PlanVegetationContract,
  planWetlands: ecologyContracts.PlanWetlandsContract,
  planReefs: ecologyContracts.PlanReefsContract,
  planIce: ecologyContracts.PlanIceContract,
} as const;

const compileOps = bindCompileOps(opContracts, ecology.compileOpsById);
const runtimeOps = bindRuntimeOps(opContracts, ecology.runtimeOpsById);

export default createStep(FeaturesPlanStepContract, {
  normalize: (config, ctx) => ({
    vegetation: compileOps.planVegetation.normalize(config.vegetation, ctx),
    wetlands: compileOps.planWetlands.normalize(config.wetlands, ctx),
    reefs: compileOps.planReefs.normalize(config.reefs, ctx),
    ice: compileOps.planIce.normalize(config.ice, ctx),
  }),
  run: (context, config: FeaturesPlanConfig) => {
    const classification = biomeClassificationArtifact.get(context);
    const pedology = pedologyArtifact.get(context);
    const heightfield = heightfieldArtifact.get(context);

    const { width, height } = context.dimensions;
    const vegetationPlan = runtimeOps.planVegetation.run(
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

    const wetlandsPlan = runtimeOps.planWetlands.run(
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

    const reefsPlan = runtimeOps.planReefs.run(
      {
        width,
        height,
        landMask: heightfield.landMask,
        surfaceTemperature: classification.surfaceTemperature,
      },
      config.reefs
    );

    const icePlan = runtimeOps.planIce.run(
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

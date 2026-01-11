import { createStep } from "@mapgen/authoring/steps";
import { bindCompileOps, bindRuntimeOps, type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import * as ecologyContracts from "@mapgen/domain/ecology/contracts";
import {
  getPublishedClimateField,
  heightfieldArtifact,
  pedologyArtifact,
  resourceBasinsArtifact,
} from "../../../../artifacts.js";
import { ResourceBasinsStepContract } from "./contract.js";

type ResourceBasinsStepConfig = Static<typeof ResourceBasinsStepContract.schema>;

const opContracts = {
  planResourceBasins: ecologyContracts.ResourcePlanBasinsContract,
  scoreResourceBasins: ecologyContracts.ResourceScoreBalanceContract,
} as const;

const compileOps = bindCompileOps(opContracts, ecology.compileOpsById);
const runtimeOps = bindRuntimeOps(opContracts, ecology.runtimeOpsById);

export default createStep(ResourceBasinsStepContract, {
  normalize: (config, ctx) => ({
    plan: compileOps.planResourceBasins.normalize(config.plan, ctx),
    score: compileOps.scoreResourceBasins.normalize(config.score, ctx),
  }),
  run: (context, config: ResourceBasinsStepConfig) => {
    const { width, height } = context.dimensions;
    const pedology = pedologyArtifact.get(context);
    const heightfield = heightfieldArtifact.get(context);
    const climate = getPublishedClimateField(context);

    const planned = runtimeOps.planResourceBasins.run(
      {
        width,
        height,
        landMask: heightfield.landMask,
        fertility: pedology.fertility,
        soilType: pedology.soilType,
        rainfall: climate.rainfall,
        humidity: climate.humidity,
      },
      config.plan
    );

    const balanced = runtimeOps.scoreResourceBasins.run(planned, config.score);

    resourceBasinsArtifact.set(context, balanced);
  },
});

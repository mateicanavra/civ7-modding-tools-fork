import { createStep } from "@mapgen/authoring/steps";
import { type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import {
  getPublishedClimateField,
  heightfieldArtifact,
  pedologyArtifact,
  resourceBasinsArtifact,
} from "../../../../artifacts.js";
import { ResourceBasinsStepContract } from "./contract.js";

type ResourceBasinsStepConfig = Static<typeof ResourceBasinsStepContract.schema>;

const opContracts = {
  planResourceBasins: ecology.contracts.planResourceBasins,
  scoreResourceBasins: ecology.contracts.scoreResourceBasins,
} as const;

const { compile, runtime } = ecology.ops.bind(opContracts);

export default createStep(ResourceBasinsStepContract, {
  normalize: (config, ctx) => ({
    plan: compile.planResourceBasins.normalize(config.plan, ctx),
    score: compile.scoreResourceBasins.normalize(config.score, ctx),
  }),
  run: (context, config: ResourceBasinsStepConfig) => {
    const { width, height } = context.dimensions;
    const pedology = pedologyArtifact.get(context);
    const heightfield = heightfieldArtifact.get(context);
    const climate = getPublishedClimateField(context);

    const planned = runtime.planResourceBasins.run(
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

    const balanced = runtime.scoreResourceBasins.run(planned, config.score);

    resourceBasinsArtifact.set(context, balanced);
  },
});

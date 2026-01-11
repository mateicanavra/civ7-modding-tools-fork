import { createStep } from "@mapgen/authoring/steps";
import { bindCompileOps, bindRuntimeOps, type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import * as ecologyContracts from "@mapgen/domain/ecology/contracts";
import { getPublishedClimateField, heightfieldArtifact, pedologyArtifact } from "../../../../artifacts.js";
import { PedologyStepContract } from "./contract.js";

type PedologyStepConfig = Static<typeof PedologyStepContract.schema>;

const opContracts = {
  classifyPedology: ecologyContracts.PedologyClassifyContract,
} as const;

const compileOps = bindCompileOps(opContracts, ecology.compileOpsById);
const runtimeOps = bindRuntimeOps(opContracts, ecology.runtimeOpsById);

export default createStep(PedologyStepContract, {
  normalize: (config, ctx) => ({
    classify: compileOps.classifyPedology.normalize(config.classify, ctx),
  }),
  run: (context, config: PedologyStepConfig) => {
    const climateField = getPublishedClimateField(context);
    const heightfield = heightfieldArtifact.get(context);
    const { width, height } = context.dimensions;

    const result = runtimeOps.classifyPedology.run(
      {
        width,
        height,
        landMask: heightfield.landMask,
        elevation: heightfield.elevation,
        rainfall: climateField.rainfall,
        humidity: climateField.humidity,
      },
      config.classify
    );

    pedologyArtifact.set(context, {
      width,
      height,
      ...result,
    });
  },
});

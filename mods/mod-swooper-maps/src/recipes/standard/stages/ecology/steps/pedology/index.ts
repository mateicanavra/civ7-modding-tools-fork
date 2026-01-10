import { createStep } from "@mapgen/authoring/steps";
import { type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { getPublishedClimateField, heightfieldArtifact, pedologyArtifact } from "../../../../artifacts.js";
import { PedologyStepContract } from "./contract.js";

type PedologyStepConfig = Static<typeof PedologyStepContract.schema>;

const opContracts = {
  classifyPedology: ecology.contracts.classifyPedology,
} as const;

const { compile, runtime } = ecology.ops.bind(opContracts);

export default createStep(PedologyStepContract, {
  normalize: (config, ctx) => ({
    classify: compile.classifyPedology.normalize(config.classify, ctx),
  }),
  run: (context, config: PedologyStepConfig) => {
    const climateField = getPublishedClimateField(context);
    const heightfield = heightfieldArtifact.get(context);
    const { width, height } = context.dimensions;

    const result = runtime.classifyPedology.run(
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

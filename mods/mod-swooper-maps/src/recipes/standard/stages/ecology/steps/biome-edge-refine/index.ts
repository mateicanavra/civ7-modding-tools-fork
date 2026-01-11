import { createStep } from "@mapgen/authoring/steps";
import { type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { biomeClassificationArtifact, heightfieldArtifact } from "../../../../artifacts.js";
import { BiomeEdgeRefineStepContract } from "./contract.js";

type BiomeEdgeRefineConfig = Static<typeof BiomeEdgeRefineStepContract.schema>;

const opContracts = {
  refineBiomeEdges: ecology.contracts.refineBiomeEdges,
} as const;

const { compile, runtime } = ecology.ops.bind(opContracts);

export default createStep(BiomeEdgeRefineStepContract, {
  normalize: (config, ctx) => ({
    refine: compile.refineBiomeEdges.normalize(config.refine, ctx),
  }),
  run: (context, config: BiomeEdgeRefineConfig) => {
    const classification = biomeClassificationArtifact.get(context);

    const { width, height } = context.dimensions;
    const heightfield = heightfieldArtifact.get(context);

    const refined = runtime.refineBiomeEdges.run(
      {
        width,
        height,
        biomeIndex: classification.biomeIndex,
        landMask: heightfield.landMask,
      },
      config.refine
    );

    biomeClassificationArtifact.set(context, {
      ...classification,
      biomeIndex: refined.biomeIndex,
    });
  },
});

import { createStep } from "@mapgen/authoring/steps";
import { bindCompileOps, bindRuntimeOps, type Static } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import * as ecologyContracts from "@mapgen/domain/ecology/contracts";
import { biomeClassificationArtifact, heightfieldArtifact } from "../../../../artifacts.js";
import { BiomeEdgeRefineStepContract } from "./contract.js";

type BiomeEdgeRefineConfig = Static<typeof BiomeEdgeRefineStepContract.schema>;

const opContracts = {
  refineBiomeEdges: ecologyContracts.RefineBiomeEdgesContract,
} as const;

const compileOps = bindCompileOps(opContracts, ecology.compileOpsById);
const runtimeOps = bindRuntimeOps(opContracts, ecology.runtimeOpsById);

export default createStep(BiomeEdgeRefineStepContract, {
  normalize: (config, ctx) => ({
    refine: compileOps.refineBiomeEdges.normalize(config.refine, ctx),
  }),
  run: (context, config: BiomeEdgeRefineConfig) => {
    const classification = biomeClassificationArtifact.get(context);

    const { width, height } = context.dimensions;
    const heightfield = heightfieldArtifact.get(context);

    const refined = runtimeOps.refineBiomeEdges.run(
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

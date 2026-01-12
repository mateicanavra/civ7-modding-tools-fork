import { createStep } from "@mapgen/authoring/steps";
import { type Static } from "@swooper/mapgen-core/authoring";
import { biomeClassificationArtifact, heightfieldArtifact } from "../../../../artifacts.js";
import BiomeEdgeRefineStepContract from "./contract.js";
type BiomeEdgeRefineConfig = Static<typeof BiomeEdgeRefineStepContract.schema>;

export default createStep(BiomeEdgeRefineStepContract, {
  run: (context, config: BiomeEdgeRefineConfig, ops) => {
    const classification = biomeClassificationArtifact.get(context);

    const { width, height } = context.dimensions;
    const heightfield = heightfieldArtifact.get(context);

    const refined = ops.refine.run(
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

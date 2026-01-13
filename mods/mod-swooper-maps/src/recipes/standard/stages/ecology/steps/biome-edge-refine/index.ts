import { createStep } from "@swooper/mapgen-core/authoring";
import type { BiomeClassificationArtifact } from "../../artifacts.js";
import BiomeEdgeRefineStepContract from "./contract.js";

export default createStep(BiomeEdgeRefineStepContract, {
  run: (context, config, ops, deps) => {
    const classification = deps.artifacts.biomeClassification.read(context);

    const { width, height } = context.dimensions;
    const heightfield = deps.artifacts.heightfield.read(context);

    const refined = ops.refine(
      {
        width,
        height,
        biomeIndex: classification.biomeIndex,
        landMask: heightfield.landMask,
      },
      config.refine
    );

    // Biome classification is refined in-place after the initial publish.
    const mutable = classification as BiomeClassificationArtifact;
    mutable.biomeIndex.set(refined.biomeIndex);
  },
});

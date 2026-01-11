import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const BiomeEdgeRefineStepContract = defineStepContract({
  id: "biome-edge-refine",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1],
  schema: Type.Object(
    {
      refine: ecology.ops.refineBiomeEdges.config,
    },
    { additionalProperties: false }
  ),
});

export default BiomeEdgeRefineStepContract;

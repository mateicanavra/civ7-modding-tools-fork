import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const BiomeEdgeRefineStepContract = defineStep({
  id: "biome-edge-refine",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1],
  ops: {
    refine: ecology.ops.refineBiomeEdges,
  },
  schema: Type.Object(
    {},
    {
      description: "Configuration for refining biome edges after classification.",
    }
  ),
});

export default BiomeEdgeRefineStepContract;

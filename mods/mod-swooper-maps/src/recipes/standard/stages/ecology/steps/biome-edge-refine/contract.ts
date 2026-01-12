import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecologyContracts from "@mapgen/domain/ecology/contracts";
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
    refine: ecologyContracts.refineBiomeEdges,
  },
  schema: Type.Object({}),
});

export default BiomeEdgeRefineStepContract;

import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";
import { ecologyArtifacts } from "../../artifacts.js";
import { hydrologyPreArtifacts } from "../../../hydrology-pre/artifacts.js";

const BiomeEdgeRefineStepContract = defineStep({
  id: "biome-edge-refine",
  phase: "ecology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [ecologyArtifacts.biomeClassification, hydrologyPreArtifacts.heightfield],
  },
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

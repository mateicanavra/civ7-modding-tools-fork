import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";

import { ecologyArtifacts } from "../../artifacts.js";
import { hydrologyClimateBaselineArtifacts } from "../../../hydrology-climate-baseline/artifacts.js";
import { hydrologyClimateRefineArtifacts } from "../../../hydrology-climate-refine/artifacts.js";
import { hydrologyHydrographyArtifacts } from "../../../hydrology-hydrography/artifacts.js";
import { morphologyArtifacts } from "../../../morphology-pre/artifacts.js";

const BiomesStepContract = defineStep({
  id: "biomes",
  phase: "ecology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      hydrologyClimateBaselineArtifacts.climateField,
      hydrologyClimateRefineArtifacts.cryosphere,
      morphologyArtifacts.topography,
      hydrologyHydrographyArtifacts.hydrography,
    ],
    provides: [ecologyArtifacts.biomeClassification],
  },
  ops: {
    classify: ecology.ops.classifyBiomes,
  },
  schema: Type.Object(
    {
    },
    {
      description:
        "Biome classification configuration.",
    }
  ),
});

export default BiomesStepContract;

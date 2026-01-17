import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology";
import { ecologyArtifacts } from "../../artifacts.js";
import { hydrologyClimateBaselineArtifacts } from "../../../hydrology-climate-baseline/artifacts.js";

const PedologyStepContract = defineStep({
  id: "pedology",
  phase: "ecology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [hydrologyClimateBaselineArtifacts.heightfield, hydrologyClimateBaselineArtifacts.climateField],
    provides: [ecologyArtifacts.pedology],
  },
  ops: {
    classify: ecology.ops.classifyPedology,
  },
  schema: Type.Object(
    {},
    {
      description: "Configuration for classifying soils and fertility in the pedology step.",
    }
  ),
});

export default PedologyStepContract;

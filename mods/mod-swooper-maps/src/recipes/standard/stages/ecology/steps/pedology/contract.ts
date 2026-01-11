import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecologyContracts from "@mapgen/domain/ecology/contracts";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const PedologyStepContract = defineStep({
  id: "pedology",
  phase: "ecology",
  requires: [M3_DEPENDENCY_TAGS.artifact.heightfield, M3_DEPENDENCY_TAGS.artifact.climateField],
  provides: [M3_DEPENDENCY_TAGS.artifact.pedologyV1],
  ops: {
    classify: ecologyContracts.classifyPedology,
  },
  schema: Type.Object({}),
});

export default PedologyStepContract;

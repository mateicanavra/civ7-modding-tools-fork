import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { hydrologyPreArtifacts } from "../artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const LakesStepContract = defineStep({
  id: "lakes",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [morphologyArtifacts.topography],
    provides: [hydrologyPreArtifacts.heightfield],
  },
  schema: Type.Object({}),
});

export default LakesStepContract;

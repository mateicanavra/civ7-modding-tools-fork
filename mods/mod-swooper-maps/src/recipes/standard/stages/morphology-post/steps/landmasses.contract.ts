import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const LandmassesStepContract = defineStep({
  id: "landmasses",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    provides: [morphologyArtifacts.landmasses],
  },
  schema: Type.Object({}, { additionalProperties: false }),
});

export default LandmassesStepContract;

import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { foundationArtifacts } from "../../foundation/artifacts.js";
import { morphologyArtifacts } from "../artifacts.js";

/**
 * Seeds morphology buffers from foundation plates (substrate + base topography).
 */
const LandmassPlatesStepContract = defineStep({
  id: "landmass-plates",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [foundationArtifacts.plates, foundationArtifacts.crustTiles],
    provides: [morphologyArtifacts.topography, morphologyArtifacts.substrate],
  },
  ops: {
    substrate: morphology.ops.computeSubstrate,
    baseTopography: morphology.ops.computeBaseTopography,
    seaLevel: morphology.ops.computeSeaLevel,
    landmask: morphology.ops.computeLandmask,
  },
  schema: Type.Object({}),
});

export default LandmassPlatesStepContract;

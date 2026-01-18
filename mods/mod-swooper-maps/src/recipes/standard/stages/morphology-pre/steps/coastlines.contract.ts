import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { morphologyArtifacts } from "../artifacts.js";

/**
 * Applies engine-facing coastline expansion after land/sea definition.
 */
const CoastlinesStepContract = defineStep({
  id: "coastlines",
  phase: "morphology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [morphologyArtifacts.topography],
    provides: [morphologyArtifacts.coastlinesExpanded],
  },
  schema: Type.Object({}),
});

export default CoastlinesStepContract;

import { Type, defineStep } from "@swooper/mapgen-core/authoring";

/**
 * Applies engine-facing coastline expansion after land/sea definition.
 */
const CoastlinesStepContract = defineStep({
  id: "coastlines",
  phase: "morphology",
  requires: [],
  provides: [],
  schema: Type.Object({}),
});

export default CoastlinesStepContract;

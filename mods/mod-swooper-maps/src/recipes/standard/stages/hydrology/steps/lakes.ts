import { Type } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";
import { syncHeightfield, type ExtendedMapContext } from "@swooper/mapgen-core";
import { publishHeightfieldArtifact } from "../../../artifacts.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const EmptySchema = Type.Object({}, { additionalProperties: false, default: {} });

export default createStep({
  id: "lakes",
  phase: "hydrology",
  requires: [M4_EFFECT_TAGS.engine.landmassApplied],
  provides: [M3_DEPENDENCY_TAGS.artifact.heightfield],
  schema: EmptySchema,
  run: (context: ExtendedMapContext) => {
    const runtime = getStandardRuntime(context);
    const { width, height } = context.dimensions;
    const iTilesPerLake = Math.max(10, (runtime.mapInfo.LakeGenerationFrequency ?? 5) * 2);
    context.adapter.generateLakes(width, height, iTilesPerLake);
    syncHeightfield(context);
    publishHeightfieldArtifact(context);
  },
} as const);

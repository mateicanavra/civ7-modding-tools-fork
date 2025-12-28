import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { CoastlinesConfigSchema, CorridorsConfigSchema } from "@mapgen/config";
import { addRuggedCoasts } from "@mapgen/domain/morphology/coastlines/index.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const RuggedCoastsStepConfigSchema = Type.Object(
  {
    coastlines: CoastlinesConfigSchema,
    corridors: CorridorsConfigSchema,
  },
  { additionalProperties: false, default: { coastlines: {}, corridors: {} } }
);

type RuggedCoastsStepConfig = Static<typeof RuggedCoastsStepConfigSchema>;

export default createStep({
  id: "ruggedCoasts",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
  ],
  provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  schema: RuggedCoastsStepConfigSchema,
  run: (context: ExtendedMapContext, config: RuggedCoastsStepConfig) => {
    const { width, height } = context.dimensions;
    addRuggedCoasts(width, height, context, config);
  },
} as const);

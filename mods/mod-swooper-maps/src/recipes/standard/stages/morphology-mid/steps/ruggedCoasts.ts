import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema, NarrativeConfigSchema } from "@mapgen/domain/config";
import { addRuggedCoasts } from "@mapgen/domain/morphology/coastlines/index.js";
import {
  getPublishedNarrativeCorridors,
  getPublishedNarrativeMotifsMargins,
} from "../../../artifacts.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const RuggedCoastsStepConfigSchema = Type.Object(
  {
    coastlines: MorphologyConfigSchema.properties.coastlines,
    corridors: NarrativeConfigSchema.properties.corridors,
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
    const margins = getPublishedNarrativeMotifsMargins(context);
    if (!margins) {
      throw new Error("[Morphology] Missing artifact:narrative.motifs.margins@v1.");
    }
    const corridors = getPublishedNarrativeCorridors(context);
    addRuggedCoasts(width, height, context, config, { margins, corridors });
  },
} as const);

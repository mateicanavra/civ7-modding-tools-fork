import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { OrogenyTunablesSchema } from "@mapgen/config";
import { storyTagOrogenyBelts } from "@mapgen/domain/narrative/orogeny/index.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StoryOrogenyStepConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        orogeny: OrogenyTunablesSchema,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { story: {} } }
);

type StoryOrogenyStepConfig = Static<typeof StoryOrogenyStepConfigSchema>;

export default createStep({
  id: "storyOrogeny",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
    M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
  ],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsOrogenyV1,
  ],
  schema: StoryOrogenyStepConfigSchema,
  run: (context: ExtendedMapContext, config: StoryOrogenyStepConfig) => {
    storyTagOrogenyBelts(context, config.story);
  },
} as const);

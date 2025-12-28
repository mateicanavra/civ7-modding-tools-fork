import { Type, type Static } from "typebox";
import { DEV, devWarn, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import {
  FoundationDirectionalityConfigSchema,
  RiftTunablesSchema,
} from "@swooper/mapgen-core/config";
import { storyTagRiftValleys } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StoryRiftsStepConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        rift: RiftTunablesSchema,
      },
      { additionalProperties: false, default: {} }
    ),
    foundation: Type.Object(
      {
        dynamics: Type.Object(
          {
            directionality: FoundationDirectionalityConfigSchema,
          },
          { additionalProperties: false, default: {} }
        ),
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { story: {}, foundation: {} } }
);

type StoryRiftsStepConfig = Static<typeof StoryRiftsStepConfigSchema>;

export default createStep({
  id: "storyRifts",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
  ],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
  ],
  schema: StoryRiftsStepConfigSchema,
  run: (context: ExtendedMapContext, config: StoryRiftsStepConfig) => {
    const runtime = getStandardRuntime(context);
    console.log(`${runtime.logPrefix} Imprinting rift valleys...`);
    const summary = storyTagRiftValleys(context, {
      story: config.story,
      foundation: config.foundation,
    });
    if (DEV.ENABLED && summary.lineTiles === 0) {
      devWarn("[smoke] storyRifts enabled but no rift tiles were emitted");
    }
  },
} as const);

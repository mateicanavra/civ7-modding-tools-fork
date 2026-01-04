import { Type, type Static } from "typebox";
import { devWarn, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";
import { storyTagRiftValleys } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StoryRiftsStepConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        rift: NarrativeConfigSchema.properties.story.properties.rift,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { story: {} } }
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
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "story.rifts.start",
        message: `${runtime.logPrefix} Imprinting rift valleys...`,
      }));
    }
    const result = storyTagRiftValleys(context, {
      story: config.story,
    });
    context.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
      result.motifs
    );
    if (result.summary.lineTiles === 0) {
      devWarn(context.trace, "[smoke] storyRifts enabled but no rift tiles were emitted");
    }
  },
} as const);

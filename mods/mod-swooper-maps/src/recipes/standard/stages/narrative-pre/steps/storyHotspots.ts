import { Type, type Static } from "typebox";
import { devWarn, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { HotspotTunablesSchema } from "@mapgen/config";
import { storyTagHotspotTrails } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StoryHotspotsStepConfigSchema = Type.Object(
  {
    story: Type.Object(
      {
        hotspot: HotspotTunablesSchema,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { story: {} } }
);

type StoryHotspotsStepConfig = Static<typeof StoryHotspotsStepConfigSchema>;

export default createStep({
  id: "storyHotspots",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
  ],
  schema: StoryHotspotsStepConfigSchema,
  run: (context: ExtendedMapContext, config: StoryHotspotsStepConfig) => {
    const runtime = getStandardRuntime(context);
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "story.hotspots.start",
        message: `${runtime.logPrefix} Imprinting hotspot trails...`,
      }));
    }
    const summary = storyTagHotspotTrails(context, config.story?.hotspot ?? {});
    if (summary.points === 0) {
      devWarn(context.trace, "[smoke] storyHotspots enabled but no hotspot points were emitted");
    }
  },
} as const);

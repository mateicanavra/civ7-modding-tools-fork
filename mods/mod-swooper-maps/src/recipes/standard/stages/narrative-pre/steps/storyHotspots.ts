import { devWarn, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { storyTagHotspotTrails } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { StoryHotspotsStepContract } from "./storyHotspots.contract.js";

type StoryHotspotsStepConfig = Static<typeof StoryHotspotsStepContract.schema>;

export default createStep(StoryHotspotsStepContract, {
  run: (context: ExtendedMapContext, config: StoryHotspotsStepConfig) => {
    const runtime = getStandardRuntime(context);
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "story.hotspots.start",
        message: `${runtime.logPrefix} Imprinting hotspot trails...`,
      }));
    }
    const result = storyTagHotspotTrails(context, config.story.hotspot);
    context.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
      result.motifs
    );
    if (result.summary.points === 0) {
      devWarn(context.trace, "[smoke] story-hotspots enabled but no hotspot points were emitted");
    }
  },
});

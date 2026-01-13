import { devWarn } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { storyTagHotspotTrails } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { narrativePreArtifacts } from "../artifacts.js";
import StoryHotspotsStepContract from "./storyHotspots.contract.js";

export default createStep(StoryHotspotsStepContract, {
  artifacts: implementArtifacts([narrativePreArtifacts.motifsHotspots], {
    motifsHotspots: {},
  }),
  run: (context, config, _ops, deps) => {
    void deps.artifacts.overlays.read(context);
    const runtime = getStandardRuntime(context);
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "story.hotspots.start",
        message: `${runtime.logPrefix} Imprinting hotspot trails...`,
      }));
    }
    const result = storyTagHotspotTrails(context, config.story.hotspot);
    deps.artifacts.motifsHotspots.publish(context, result.motifs);
    if (result.summary.points === 0) {
      devWarn(context.trace, "[smoke] story-hotspots enabled but no hotspot points were emitted");
    }
  },
});

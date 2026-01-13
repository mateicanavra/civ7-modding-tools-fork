import { devWarn } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { storyTagRiftValleys } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import StoryRiftsStepContract from "./storyRifts.contract.js";

export default createStep(StoryRiftsStepContract, {
  run: (context, config, _ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    void deps.artifacts.overlays.read(context);
    const runtime = getStandardRuntime(context);
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "story.rifts.start",
        message: `${runtime.logPrefix} Imprinting rift valleys...`,
      }));
    }
    const result = storyTagRiftValleys(context, { story: config.story }, plates);
    if (result.summary.lineTiles === 0) {
      devWarn(context.trace, "[smoke] story-rifts enabled but no rift tiles were emitted");
    }
  },
});

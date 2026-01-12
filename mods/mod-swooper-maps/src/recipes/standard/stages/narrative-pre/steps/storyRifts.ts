import { devWarn, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep, type Static } from "@swooper/mapgen-core/authoring";
import { storyTagRiftValleys } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { narrativeMotifsRiftsArtifact } from "../../../artifacts.js";
import StoryRiftsStepContract from "./storyRifts.contract.js";
type StoryRiftsStepConfig = Static<typeof StoryRiftsStepContract.schema>;

export default createStep(StoryRiftsStepContract, {
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
    narrativeMotifsRiftsArtifact.set(context, result.motifs);
    if (result.summary.lineTiles === 0) {
      devWarn(context.trace, "[smoke] story-rifts enabled but no rift tiles were emitted");
    }
  },
});

import { devWarn } from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { storyTagContinentalMargins } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { narrativePreArtifacts } from "../artifacts.js";
import StorySeedStepContract from "./storySeed.contract.js";

export default createStep(StorySeedStepContract, {
  artifacts: implementArtifacts(
    [narrativePreArtifacts.overlays, narrativePreArtifacts.motifsMargins],
    {
      overlays: {},
      motifsMargins: {},
    }
  ),
  run: (context, config, _ops, deps) => {
    deps.artifacts.overlays.publish(context, context.overlays);
    const runtime = getStandardRuntime(context);
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "story.seed.start",
        message: `${runtime.logPrefix} Imprinting continental margins (active/passive)...`,
      }));
    }
    const result = storyTagContinentalMargins(context, config.margins);
    deps.artifacts.motifsMargins.publish(context, result.motifs);

    const activeCount = result.snapshot.active?.length ?? 0;
    const passiveCount = result.snapshot.passive?.length ?? 0;
    if (activeCount + passiveCount === 0) {
      devWarn(context.trace, "[smoke] story-seed enabled but margins overlay is empty");
    }
  },
});

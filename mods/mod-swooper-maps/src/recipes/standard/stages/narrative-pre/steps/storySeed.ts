import { devWarn, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { storyTagContinentalMargins } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { StorySeedStepContract } from "./storySeed.contract.js";

type StorySeedStepConfig = Static<typeof StorySeedStepContract.schema>;

export default createStep(StorySeedStepContract, {
  run: (context: ExtendedMapContext, config: StorySeedStepConfig) => {
    const runtime = getStandardRuntime(context);
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "story.seed.start",
        message: `${runtime.logPrefix} Imprinting continental margins (active/passive)...`,
      }));
    }
    const result = storyTagContinentalMargins(context, config.margins);
    context.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
      result.motifs
    );

    const activeCount = result.snapshot.active?.length ?? 0;
    const passiveCount = result.snapshot.passive?.length ?? 0;
    if (activeCount + passiveCount === 0) {
      devWarn(context.trace, "[smoke] storySeed enabled but margins overlay is empty");
    }
  },
});

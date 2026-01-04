import { Type, type Static } from "typebox";
import { devWarn, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";
import { storyTagContinentalMargins } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StorySeedStepConfigSchema = Type.Object(
  {
    margins: NarrativeConfigSchema.properties.margins,
  },
  { additionalProperties: false, default: { margins: {} } }
);

type StorySeedStepConfig = Static<typeof StorySeedStepConfigSchema>;

export default createStep({
  id: "storySeed",
  phase: "morphology",
  requires: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.storyOverlays,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
  ],
  schema: StorySeedStepConfigSchema,
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
} as const);

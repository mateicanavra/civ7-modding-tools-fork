import { Type, type Static } from "typebox";
import { DEV, devWarn, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { ContinentalMarginsConfigSchema } from "@swooper/mapgen-core/config";
import { storyTagContinentalMargins } from "@mapgen/domain/narrative/tagging/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const StorySeedStepConfigSchema = Type.Object(
  {
    margins: ContinentalMarginsConfigSchema,
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
    console.log(`${runtime.logPrefix} Imprinting continental margins (active/passive)...`);
    const margins = storyTagContinentalMargins(context, config.margins);

    if (DEV.ENABLED) {
      const activeCount = margins.active?.length ?? 0;
      const passiveCount = margins.passive?.length ?? 0;
      if (activeCount + passiveCount === 0) {
        devWarn("[smoke] storySeed enabled but margins overlay is empty");
      }
    }
  },
} as const);

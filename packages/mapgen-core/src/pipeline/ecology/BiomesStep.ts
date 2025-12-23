import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { designateEnhancedBiomes } from "@mapgen/domain/ecology/biomes/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { BiomeConfigSchema, CorridorsConfigSchema } from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
import {
  STORY_OVERLAY_KEYS,
  getStoryOverlay,
  hydrateCorridorsStoryTags,
  hydrateRiftsStoryTags,
} from "@mapgen/domain/narrative/overlays/index.js";
import { getStoryTags } from "@mapgen/domain/narrative/tags/index.js";

export interface BiomesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  afterRun?: (context: ExtendedMapContext) => void;
}

const BiomesStepConfigSchema = Type.Object(
  {
    biomes: BiomeConfigSchema,
    corridors: CorridorsConfigSchema,
  },
  { additionalProperties: false, default: { biomes: {}, corridors: {} } }
);

export function createBiomesStep(options: BiomesStepOptions): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "biomes",
    phase: M3_STANDARD_STAGE_PHASE.biomes,
    requires: options.requires,
    provides: options.provides,
    configSchema: BiomesStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        const storyTags = getStoryTags(context);
        hydrateCorridorsStoryTags(getStoryOverlay(context, STORY_OVERLAY_KEYS.CORRIDORS), storyTags);
        hydrateRiftsStoryTags(getStoryOverlay(context, STORY_OVERLAY_KEYS.RIFTS), storyTags);

        const { width, height } = context.dimensions;
        designateEnhancedBiomes(width, height, context);
        options.afterRun?.(context);
      });
    },
  };
}

import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import {
  HotspotTunablesSchema,
  IslandsConfigSchema,
  SeaCorridorPolicySchema,
} from "@mapgen/config/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
import { addIslandChains } from "@mapgen/domain/morphology/islands/index.js";

export interface IslandsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const IslandsStepConfigSchema = Type.Object(
  {
    islands: IslandsConfigSchema,
    story: Type.Object(
      {
        hotspot: HotspotTunablesSchema,
      },
      { additionalProperties: false, default: {} }
    ),
    corridors: Type.Object(
      {
        sea: SeaCorridorPolicySchema,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { islands: {}, story: {}, corridors: {} } }
);

export function createIslandsStep(options: IslandsStepOptions): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "islands",
    phase: M3_STANDARD_STAGE_PHASE.islands,
    requires: options.requires,
    provides: options.provides,
    configSchema: IslandsStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        const { width, height } = context.dimensions;
        addIslandChains(width, height, context);
      });
    },
  };
}

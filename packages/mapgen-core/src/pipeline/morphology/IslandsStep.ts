import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import {
  HotspotTunablesSchema,
  IslandsConfigSchema,
  SeaCorridorPolicySchema,
} from "@mapgen/config/index.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
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

type IslandsStepConfig = Static<typeof IslandsStepConfigSchema>;

export function createIslandsStep(options: IslandsStepOptions): MapGenStep<ExtendedMapContext, IslandsStepConfig> {
  return {
    id: "islands",
    phase: M3_STANDARD_STAGE_PHASE.islands,
    requires: options.requires,
    provides: options.provides,
    configSchema: IslandsStepConfigSchema,
    run: (context, config) => {
      const { width, height } = context.dimensions;
      addIslandChains(width, height, context, config);
    },
  };
}

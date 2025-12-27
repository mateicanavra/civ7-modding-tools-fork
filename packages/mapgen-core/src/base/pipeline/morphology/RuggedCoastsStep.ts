import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { CoastlinesConfigSchema, CorridorsConfigSchema } from "@mapgen/config/index.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import { addRuggedCoasts } from "@mapgen/domain/morphology/coastlines/index.js";

export interface RuggedCoastsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const RuggedCoastsStepConfigSchema = Type.Object(
  {
    coastlines: CoastlinesConfigSchema,
    corridors: CorridorsConfigSchema,
  },
  { additionalProperties: false, default: { coastlines: {}, corridors: {} } }
);

type RuggedCoastsStepConfig = Static<typeof RuggedCoastsStepConfigSchema>;

export function createRuggedCoastsStep(
  options: RuggedCoastsStepOptions
): MapGenStep<ExtendedMapContext, RuggedCoastsStepConfig> {
  return {
    id: "ruggedCoasts",
    phase: M3_STANDARD_STAGE_PHASE.ruggedCoasts,
    requires: options.requires,
    provides: options.provides,
    configSchema: RuggedCoastsStepConfigSchema,
    run: (context, config) => {
      const { width, height } = context.dimensions;
      addRuggedCoasts(width, height, context, config);
    },
  };
}

import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { CoastlinesConfigSchema, CorridorsConfigSchema } from "@mapgen/config/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
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

export function createRuggedCoastsStep(
  options: RuggedCoastsStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "ruggedCoasts",
    phase: M3_STANDARD_STAGE_PHASE.ruggedCoasts,
    requires: options.requires,
    provides: options.provides,
    configSchema: RuggedCoastsStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        const { width, height } = context.dimensions;
        addRuggedCoasts(width, height, context);
      });
    },
  };
}

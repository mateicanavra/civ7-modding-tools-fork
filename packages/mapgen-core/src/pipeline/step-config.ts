import { Type } from "typebox";
import type { MapConfig } from "@mapgen/bootstrap/types.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

export type StepConfigView = Partial<MapConfig>;

export const EmptyStepConfigSchema = Type.Object(
  {},
  { additionalProperties: false, default: {} }
);

export function withStepConfig<TContext extends ExtendedMapContext, TResult>(
  context: TContext,
  config: StepConfigView,
  run: () => TResult
): TResult {
  const previous = context.config;
  context.config = config as MapConfig;
  try {
    return run();
  } finally {
    context.config = previous;
  }
}

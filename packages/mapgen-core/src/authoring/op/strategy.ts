import type { Static, TSchema } from "typebox";

import type { RunSettings } from "@mapgen/engine/execution-plan.js";

type NoInfer<T> = [T][T extends any ? 0 : never];

export type OpStrategy<ConfigSchema extends TSchema, Input, Output> = Readonly<{
  config: ConfigSchema;
  resolveConfig?: (
    config: Static<NoInfer<ConfigSchema>>,
    settings: RunSettings
  ) => Static<NoInfer<ConfigSchema>>;
  run: (input: Input, config: Static<NoInfer<ConfigSchema>>) => Output;
}>;

export function createStrategy<ConfigSchema extends TSchema, Input, Output>(
  strategy: OpStrategy<ConfigSchema, Input, Output>
): OpStrategy<ConfigSchema, Input, Output> {
  return strategy;
}

type StrategyConfigSchemaOf<T> = T extends { config: infer C extends TSchema } ? C : never;

export type StrategySelection<
  Strategies extends Record<string, { config: TSchema }>,
> = {
  [K in keyof Strategies & string]: Readonly<{
    strategy: K;
    config: Static<StrategyConfigSchemaOf<Strategies[K]>>;
  }>;
}[keyof Strategies & string];

import type { Static, TSchema } from "typebox";

export type OpStrategy<ConfigSchema extends TSchema, Input, Output> = Readonly<{
  config: ConfigSchema;
  run: (input: Input, config: Static<ConfigSchema>) => Output;
}>;

export function createStrategy<ConfigSchema extends TSchema, Input, Output>(
  strategy: OpStrategy<ConfigSchema, Input, Output>
): OpStrategy<ConfigSchema, Input, Output> {
  return strategy;
}

type StrategyConfigSchemaOf<T> = T extends { config: infer C extends TSchema } ? C : never;

export type StrategySelection<
  Strategies extends Record<string, { config: TSchema }>,
  DefaultStrategy extends (keyof Strategies & string) | undefined,
> = {
  [K in keyof Strategies & string]: K extends DefaultStrategy
    ? Readonly<{ strategy?: K; config: Static<StrategyConfigSchemaOf<Strategies[K]>> }>
    : Readonly<{ strategy: K; config: Static<StrategyConfigSchemaOf<Strategies[K]>> }>;
}[keyof Strategies & string];

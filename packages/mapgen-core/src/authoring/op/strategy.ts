import type { Static, TSchema } from "typebox";

import type { NormalizeContext } from "@mapgen/engine/index.js";
import type { OpContract } from "./contract.js";

type NoInfer<T> = [T][T extends any ? 0 : never];

export type OpStrategy<ConfigSchema extends TSchema, Input, Output> = Readonly<{
  config: ConfigSchema;
  normalize?: (
    config: Static<NoInfer<ConfigSchema>>,
    ctx: NormalizeContext
  ) => Static<NoInfer<ConfigSchema>>;
  run: (input: Input, config: Static<NoInfer<ConfigSchema>>) => Output;
}>;

export type StrategyImpl<ConfigSchema extends TSchema, Input, Output> = Readonly<{
  normalize?: (
    config: Static<NoInfer<ConfigSchema>>,
    ctx: NormalizeContext
  ) => Static<NoInfer<ConfigSchema>>;
  run: (input: Input, config: Static<NoInfer<ConfigSchema>>) => Output;
}>;

export type StrategyImplFor<
  C extends OpContract<any, any, any, any, any>,
  Id extends keyof C["strategies"] & string,
> = StrategyImpl<
  C["strategies"][Id],
  Static<C["input"]>,
  Static<C["output"]>
>;

export type StrategyImplMapFor<C extends OpContract<any, any, any, any, any>> = Readonly<{
  [K in keyof C["strategies"] & string]: StrategyImplFor<C, K>;
}>;

export function createStrategy<
  const C extends OpContract<any, any, any, any, any>,
  const Id extends keyof C["strategies"] & string,
>(contract: C, id: Id, impl: StrategyImplFor<C, Id>): StrategyImplFor<C, Id> {
  void contract;
  void id;
  return impl;
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

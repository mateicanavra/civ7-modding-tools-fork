import type { TSchema } from "typebox";

import type { DomainOpKind } from "./types.js";

export type StrategyConfigSchemas = Readonly<Record<string, TSchema>>;

export type OpContract<
  Kind extends DomainOpKind,
  Id extends string,
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies extends StrategyConfigSchemas & { default: TSchema },
> = Readonly<{
  kind: Kind;
  id: Id;
  input: InputSchema;
  output: OutputSchema;
  strategies: Strategies;
}>;

export function defineOpContract<
  const Kind extends DomainOpKind,
  const Id extends string,
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  const Strategies extends StrategyConfigSchemas & { default: TSchema },
>(def: OpContract<Kind, Id, InputSchema, OutputSchema, Strategies>): typeof def {
  return def;
}

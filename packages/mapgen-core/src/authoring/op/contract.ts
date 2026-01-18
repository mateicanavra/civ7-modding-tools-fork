import type { Static, TSchema, TUnsafe } from "typebox";

import { applySchemaConventions } from "../schema.js";

import type { DomainOpKind, OpTypeBag } from "./types.js";
import { buildOpEnvelopeSchema } from "./envelope.js";

export type StrategyConfigSchemas = Readonly<Record<string, TSchema>>;

type EnsureSchemaValues<T> = {
  readonly [K in keyof T]: T[K] extends TSchema ? T[K] : never;
};

export type OpContractCore<
  Kind extends DomainOpKind,
  Id extends string,
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  // IMPORTANT: avoid constraining strategies to Record<string, TSchema> here.
  // Doing so tends to widen `keyof strategies` to `string`, which destroys authoring DX.
  Strategies extends Readonly<{ default: TSchema }>,
> = Readonly<{
  kind: Kind;
  id: Id;
  input: InputSchema;
  output: OutputSchema;
  strategies: EnsureSchemaValues<Strategies>;
}>;

export type OpContract<
  Kind extends DomainOpKind,
  Id extends string,
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies extends Readonly<{ default: TSchema }>,
> = OpContractCore<Kind, Id, InputSchema, OutputSchema, Strategies> &
  Readonly<{
    config: TUnsafe<
      OpTypeBag<InputSchema, OutputSchema, EnsureSchemaValues<Strategies>>["envelope"]
    >;
    defaultConfig: Readonly<
      OpTypeBag<InputSchema, OutputSchema, EnsureSchemaValues<Strategies>>["envelope"]
    >;
  }>;

export function defineOp<
  const Kind extends DomainOpKind,
  const Id extends string,
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  const Strategies extends Readonly<{ default: TSchema }>,
>(def: OpContractCore<Kind, Id, InputSchema, OutputSchema, Strategies>) {
  applySchemaConventions(def.input, `op:${def.id}.input`);
  applySchemaConventions(def.output, `op:${def.id}.output`);
  for (const [strategyId, schema] of Object.entries(def.strategies)) {
    applySchemaConventions(schema, `op:${def.id}.strategies.${strategyId}`);
  }

  const { schema: configSchema, defaultConfig } = buildOpEnvelopeSchema(def.id, def.strategies);
  applySchemaConventions(configSchema, `op:${def.id}.config`);

  return {
    ...def,
    config: configSchema as unknown as TUnsafe<OpTypeBag<typeof def.input, typeof def.output, typeof def.strategies>["envelope"]>,
    defaultConfig: defaultConfig as unknown as OpContract<
      Kind,
      Id,
      InputSchema,
      OutputSchema,
      Strategies
    >["defaultConfig"],
  } as const;
}

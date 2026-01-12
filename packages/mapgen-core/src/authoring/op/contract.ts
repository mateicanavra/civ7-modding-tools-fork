import type { Static, TSchema } from "typebox";

import { applySchemaConventions } from "../schema.js";

import type { DomainOpKind } from "./types.js";
import { buildOpEnvelopeSchema } from "./envelope.js";

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
  config: TSchema;
  defaultConfig: Readonly<{ strategy: "default"; config: Static<Strategies["default"]> }>;
}>;

export function defineOp<
  const Kind extends DomainOpKind,
  const Id extends string,
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  const Strategies extends StrategyConfigSchemas & { default: TSchema },
>(def: Omit<OpContract<Kind, Id, InputSchema, OutputSchema, Strategies>, "config" | "defaultConfig">) {
  applySchemaConventions(def.input, `op:${def.id}.input`);
  applySchemaConventions(def.output, `op:${def.id}.output`);
  for (const [strategyId, schema] of Object.entries(def.strategies)) {
    applySchemaConventions(schema, `op:${def.id}.strategies.${strategyId}`);
  }

  const { schema: configSchema, defaultConfig } = buildOpEnvelopeSchema(def.id, def.strategies);
  applySchemaConventions(configSchema, `op:${def.id}.config`);

  return {
    ...def,
    config: configSchema,
    defaultConfig: defaultConfig as OpContract<Kind, Id, InputSchema, OutputSchema, Strategies>["defaultConfig"],
  } as const;
}

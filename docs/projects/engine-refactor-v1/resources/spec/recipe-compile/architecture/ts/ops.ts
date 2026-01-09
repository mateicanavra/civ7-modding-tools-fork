import { Type, type Static, type TSchema, type TUnsafe } from "typebox";
import { Value } from "typebox/value";

import type { Env, NormalizeCtx } from "./env";

export type DomainOpKind = "plan" | "compute" | "score" | "select";

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

export type OpContractAny = OpContract<any, any, any, any, any>;

export function defineOpContract<
  const Kind extends DomainOpKind,
  const Id extends string,
  const InputSchema extends TSchema,
  const OutputSchema extends TSchema,
  const Strategies extends StrategyConfigSchemas & { default: TSchema },
>(def: OpContract<Kind, Id, InputSchema, OutputSchema, Strategies>): typeof def {
  return def;
}

export function buildDefaultConfigValue(schema: TSchema): unknown {
  const defaulted = Value.Default(schema, {});
  const converted = Value.Convert(schema, defaulted);
  return Value.Clean(schema, converted);
}

export type OpEnvelopeBuildResult = Readonly<{
  schema: TSchema;
  defaultConfig: Readonly<{ strategy: "default"; config: Record<string, unknown> }>;
  strategyIds: readonly string[];
}>;

export function buildOpEnvelopeSchema(
  contractId: string,
  strategySchemas: StrategyConfigSchemas & { default: TSchema }
): OpEnvelopeBuildResult {
  if (!Object.prototype.hasOwnProperty.call(strategySchemas, "default")) {
    throw new Error(`op(${contractId}) missing required "default" strategy schema`);
  }

  const strategyIds = Object.keys(strategySchemas);
  if (strategyIds.length === 0) {
    throw new Error(`op(${contractId}) received empty strategies`);
  }

  const defaultInnerConfig = buildDefaultConfigValue(strategySchemas.default) as Record<
    string,
    unknown
  >;
  const defaultConfig = { strategy: "default", config: defaultInnerConfig } as const;

  const cases = strategyIds.map((id) =>
    Type.Object(
      {
        strategy: Type.Literal(id),
        config: strategySchemas[id]!,
      },
      { additionalProperties: false }
    )
  );

  const schema = Type.Union(cases as any, { default: defaultConfig });
  return { schema, defaultConfig, strategyIds };
}

export type OpRef = Readonly<{
  id: string;
  config: TSchema;
}>;

export function opRef<const C extends OpContractAny>(contract: C): OpRef {
  const { schema } = buildOpEnvelopeSchema(contract.id, contract.strategies);
  return { id: contract.id, config: schema };
}

export type StrategySelection<Strategies extends Record<string, { config: TSchema }>> = {
  [K in keyof Strategies & string]: Readonly<{
    strategy: K;
    config: Static<Strategies[K]["config"]>;
  }>;
}[keyof Strategies & string];

export type OpConfigSchema<Strategies extends Record<string, { config: TSchema }>> = TUnsafe<
  StrategySelection<Strategies>
>;

export type ValidationError = Readonly<{ path: string; message: string }>;
export type OpValidateOptions = Readonly<{ abortEarly?: boolean }>;
export type OpRunValidatedOptions = OpValidateOptions;

export type DomainOp<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies extends Record<string, { config: TSchema }>,
  Knobs = unknown,
> = Readonly<{
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;
  config: OpConfigSchema<Strategies>;
  defaultConfig: StrategySelection<Strategies>;
  strategies: Strategies;
  normalize?: (
    config: StrategySelection<Strategies>,
    ctx: NormalizeCtx<Env, Knobs>
  ) => StrategySelection<Strategies>;
  run: (input: Static<InputSchema>, config: StrategySelection<Strategies>) => Static<OutputSchema>;
  validate: (
    input: Static<InputSchema>,
    config: StrategySelection<Strategies>,
    options?: OpValidateOptions
  ) => { ok: boolean; errors: ValidationError[] };
  runValidated: (
    input: Static<InputSchema>,
    config: StrategySelection<Strategies>,
    options?: OpRunValidatedOptions
  ) => Static<OutputSchema>;
}>;

type DomainOpAny = DomainOp<TSchema, TSchema, Record<string, { config: TSchema }>>;

// Compile-visible op surface (includes normalize/defaultConfig/strategies access via DomainOp shape).
export type DomainOpCompileAny = DomainOpAny & Readonly<{ id: string; kind: string }>;

// Runtime-visible op surface (structurally stripped; cannot normalize).
export type DomainOpRuntimeAny = Pick<
  DomainOpCompileAny,
  "id" | "kind" | "run" | "validate" | "runValidated"
>;

export function runtimeOp(op: DomainOpCompileAny): DomainOpRuntimeAny {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
    validate: op.validate,
    runValidated: op.runValidated,
  };
}

export function bindCompileOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Readonly<Record<string, DomainOpCompileAny>>
): { [K in keyof Decl]: DomainOpCompileAny } {
  const out: any = {};
  for (const k of Object.keys(decl)) {
    const id = (decl as any)[k].id;
    const op = registryById[id];
    if (!op) throw new Error(`bindCompileOps: missing op id "${id}" for key "${k}"`);
    out[k] = op;
  }
  return out;
}

export function bindRuntimeOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Readonly<Record<string, DomainOpCompileAny>>
): { [K in keyof Decl]: DomainOpRuntimeAny } {
  const out: any = {};
  for (const k of Object.keys(decl)) {
    const id = (decl as any)[k].id;
    const op = registryById[id];
    if (!op) throw new Error(`bindRuntimeOps: missing op id "${id}" for key "${k}"`);
    out[k] = runtimeOp(op);
  }
  return out;
}


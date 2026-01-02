import { Type, type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

/**
 * Strict operation kind taxonomy for domain operation modules.
 *
 * Kinds are semantic and should remain trustworthy over time (i.e., avoid using `compute` as a
 * catch-all). Runtime enforcement is not required, but tooling/lint and code review may rely on
 * these meanings for consistency and observability.
 *
 * Boundary intent:
 * - Ops are pure domain contracts: `run(input, config) -> output`.
 * - Op inputs/outputs should be plain values (POJOs + POJO-ish runtime values such as typed arrays),
 *   not runtime/engine “views” (e.g., adapters or callback readbacks).
 * - Steps own runtime binding (adapter reads, engine writes, buffer mutation, artifact publication).
 *
 * Export discipline:
 * - Only export ops that are intended to be step-callable domain contracts.
 * - Internal phases can still be modeled as ops when useful, without being exported from the domain.
 */
export type DomainOpKind = "plan" | "compute" | "score" | "select";

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

type StrategySelection<
  Strategies extends Record<string, { config: TSchema }>,
  DefaultStrategy extends (keyof Strategies & string) | undefined,
> = {
  [K in keyof Strategies & string]: K extends DefaultStrategy
    ? Readonly<{ strategy?: K; config: Static<StrategyConfigSchemaOf<Strategies[K]>> }>
    : Readonly<{ strategy: K; config: Static<StrategyConfigSchemaOf<Strategies[K]>> }>;
}[keyof Strategies & string];

export type DomainOp<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  ConfigSchema extends TSchema,
  Strategies extends Record<string, { config: TSchema }> | undefined = undefined,
  DefaultStrategy extends (keyof NonNullable<Strategies> & string) | undefined = undefined,
> = Readonly<{
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;
  config: ConfigSchema;
  defaultConfig: Strategies extends Record<string, { config: TSchema }>
    ? StrategySelection<NonNullable<Strategies>, DefaultStrategy>
    : Static<ConfigSchema>;
  strategies?: Strategies;
  defaultStrategy?: DefaultStrategy;
  run: (
    input: Static<InputSchema>,
    config: Strategies extends Record<string, { config: TSchema }>
      ? StrategySelection<Strategies, DefaultStrategy>
      : Static<ConfigSchema>
  ) => Static<OutputSchema>;
}>;

type OpDefinitionBase<InputSchema extends TSchema, OutputSchema extends TSchema> = Readonly<{
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;
}>;

function buildDefaultConfigValue(schema: TSchema): unknown {
  const defaulted = Value.Default(schema, {});
  const converted = Value.Convert(schema, defaulted);
  return Value.Clean(schema, converted);
}

export function createOp<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  ConfigSchema extends TSchema,
>(op: OpDefinitionBase<InputSchema, OutputSchema> &
  Readonly<{
    config: ConfigSchema;
    run: (input: Static<InputSchema>, config: Static<ConfigSchema>) => Static<OutputSchema>;
  }>): DomainOp<InputSchema, OutputSchema, ConfigSchema>;

export function createOp<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies extends Record<string, OpStrategy<TSchema, Static<InputSchema>, Static<OutputSchema>>>,
  DefaultStrategy extends (keyof Strategies & string) | undefined = undefined,
>(
  op: OpDefinitionBase<InputSchema, OutputSchema> &
    Readonly<{
      strategies: Strategies;
      defaultStrategy?: DefaultStrategy;
    }>
): DomainOp<InputSchema, OutputSchema, TSchema, Strategies, DefaultStrategy>;

export function createOp(op: any): any {
  if (op.strategies) {
    const strategies = op.strategies as Record<string, OpStrategy<TSchema, unknown, unknown>>;
    const defaultStrategy = op.defaultStrategy as string | undefined;

    const ids = Object.keys(strategies);
    if (ids.length === 0) {
      throw new Error(`createOp(${op.id}) received empty strategies`);
    }

    const defaultStrategyId = defaultStrategy ?? ids[0]!;
    const defaultInnerConfig = buildDefaultConfigValue(strategies[defaultStrategyId]!.config) as Record<
      string,
      unknown
    >;

    const defaultConfig =
      defaultStrategy != null
        ? { config: defaultInnerConfig }
        : { strategy: defaultStrategyId, config: defaultInnerConfig };

    const configCases = ids.map((id) =>
      Type.Object(
        {
          strategy:
            defaultStrategy && id === defaultStrategy
              ? Type.Optional(Type.Literal(id, { default: id }))
              : Type.Literal(id),
          config: strategies[id]!.config,
        },
        { additionalProperties: false }
      )
    );

    const config = Type.Union(configCases as any, {
      additionalProperties: false,
      default: defaultConfig,
    });

    return {
      kind: op.kind,
      id: op.id,
      input: op.input,
      output: op.output,
      strategies: op.strategies,
      defaultStrategy: op.defaultStrategy,
      config,
      defaultConfig,
      run: (input: any, cfg: any) => {
        const selectedId: string =
          (cfg && typeof cfg.strategy === "string" ? cfg.strategy : defaultStrategy) ?? ids[0]!;
        const selected = strategies[selectedId];
        if (!selected) throw new Error(`createOp(${op.id}) unknown strategy "${selectedId}"`);
        return selected.run(input, cfg?.config ?? {});
      },
    };
  }

  const defaultConfig = buildDefaultConfigValue(op.config ?? Type.Object({}, { default: {} }));
  return { ...op, defaultConfig };
}

import { Type, type Static, type TSchema } from "typebox";

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

    const config = Type.Union(configCases as any, { additionalProperties: false });

    return {
      kind: op.kind,
      id: op.id,
      input: op.input,
      output: op.output,
      strategies: op.strategies,
      defaultStrategy: op.defaultStrategy,
      config,
      run: (input: any, cfg: any) => {
        const selectedId: string =
          (cfg && typeof cfg.strategy === "string" ? cfg.strategy : defaultStrategy) ?? ids[0]!;
        const selected = strategies[selectedId];
        if (!selected) throw new Error(`createOp(${op.id}) unknown strategy "${selectedId}"`);
        return selected.run(input, cfg?.config ?? {});
      },
    };
  }

  return op;
}


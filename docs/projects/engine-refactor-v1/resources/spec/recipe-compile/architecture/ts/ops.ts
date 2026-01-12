import type { Static, TSchema, TUnsafe } from "typebox";

export type NormalizeContext<TEnv = unknown, TKnobs = unknown> = Readonly<{
  env: TEnv;
  knobs: TKnobs;
}>;

export type DomainOpKind = "plan" | "compute" | "score" | "select";

export type StrategySelection<
  Strategies extends Record<string, { config: TSchema }>,
> = {
  [K in keyof Strategies & string]: Readonly<{
    strategy: K;
    config: Static<Strategies[K]["config"]>;
  }>;
}[keyof Strategies & string];

export type OpConfigSchema<
  Strategies extends Record<string, { config: TSchema }>,
> = TUnsafe<StrategySelection<Strategies>>;

export type DomainOp<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies extends Record<string, { config: TSchema }>,
  Id extends string = string,
> = Readonly<{
  kind: DomainOpKind;
  id: Id;
  input: InputSchema;
  output: OutputSchema;
  /**
   * Strategy envelope schema: `{ strategy, config }`.
   * Steps typically reuse this in step config schemas.
   */
  config: OpConfigSchema<Strategies>;
  /**
   * Default strategy envelope (always uses the `"default"` strategy).
   */
  defaultConfig: StrategySelection<Strategies>;
  strategies: Readonly<{
    [K in keyof Strategies & string]: Readonly<{
      config: Strategies[K]["config"];
      normalize?: (
        config: Static<Strategies[K]["config"]>,
        ctx: NormalizeContext
      ) => Static<Strategies[K]["config"]>;
      run: (
        input: Static<InputSchema>,
        config: Static<Strategies[K]["config"]>
      ) => Static<OutputSchema>;
    }>;
  }>;
  /**
   * Compile-time config canonicalization hook (strategy-dispatch).
   */
  normalize: (
    envelope: StrategySelection<Strategies>,
    ctx: NormalizeContext
  ) => StrategySelection<Strategies>;
  /**
   * Runtime execution (strategy-dispatch).
   */
  run: (input: Static<InputSchema>, envelope: StrategySelection<Strategies>) => Static<OutputSchema>;
}>;

export type DomainOpCompileAny = DomainOp<TSchema, TSchema, Record<string, { config: TSchema }>>;

export type DomainOpRuntime<Op extends DomainOpCompileAny> = Readonly<{
  id: Op["id"];
  kind: Op["kind"];
  run: Op["run"];
}>;

export type DomainOpRuntimeAny = DomainOpRuntime<DomainOpCompileAny>;

export function runtimeOp<Op extends DomainOpCompileAny>(op: Op): DomainOpRuntime<Op> {
  return { id: op.id, kind: op.kind, run: op.run } as DomainOpRuntime<Op>;
}


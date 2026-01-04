import { Type, type Static, type TSchema } from "typebox";

import type { CustomValidateFn } from "../validation.js";
import type { AnyDomainOpSchema, SchemaInput, SchemaConfig, SchemaOutput } from "./schema.js";
import type { OpStrategy, StrategySelection } from "./strategy.js";
import type { DomainOpKind, DomainOp } from "./types.js";
import type { OpDefinitionResolveConfigHook } from "./resolve.js";
import { buildDefaultConfigValue } from "./defaults.js";
import { attachValidationSurface } from "./validation-surface.js";

type OpDefinitionBase<InputSchema extends TSchema, OutputSchema extends TSchema> = Readonly<{
  kind: DomainOpKind;
  id: string;
  input: InputSchema;
  output: OutputSchema;
}>;

type OpDefinitionValidationHook<InputSchema extends TSchema, ConfigSchema> = Readonly<{
  /**
   * Optional domain-/operation-specific validation hook.
   *
   * This is not called by consumers directly; it is wired into `op.validate(...)` and
   * `op.runValidated(...)` automatically.
   */
  customValidate?: CustomValidateFn<Static<InputSchema>, ConfigSchema>;
}>;

export function createOp<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  ConfigSchema extends TSchema,
>(op: OpDefinitionBase<InputSchema, OutputSchema> &
  Readonly<{
    config: ConfigSchema;
    run: (input: Static<InputSchema>, config: Static<ConfigSchema>) => Static<OutputSchema>;
  }> &
  OpDefinitionValidationHook<InputSchema, Static<ConfigSchema>> &
  OpDefinitionResolveConfigHook<Static<ConfigSchema>>): DomainOp<
  InputSchema,
  OutputSchema,
  ConfigSchema
>;

export function createOp<const Schema extends AnyDomainOpSchema>(op: Readonly<{
  kind: DomainOpKind;
  id: string;
  schema: Schema;
  input?: never;
  config?: never;
  output?: never;
  run: (
    input: Static<SchemaInput<Schema>>,
    config: Static<SchemaConfig<Schema>>
  ) => Static<SchemaOutput<Schema>>;
}> &
  OpDefinitionValidationHook<SchemaInput<Schema>, Static<SchemaConfig<Schema>>> &
  OpDefinitionResolveConfigHook<Static<SchemaConfig<Schema>>>): DomainOp<
  SchemaInput<Schema>,
  SchemaOutput<Schema>,
  SchemaConfig<Schema>
>;

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
    }> &
    OpDefinitionValidationHook<
      InputSchema,
      StrategySelection<Strategies, DefaultStrategy>
    > &
    OpDefinitionResolveConfigHook<StrategySelection<Strategies, DefaultStrategy>>
): DomainOp<InputSchema, OutputSchema, TSchema, Strategies, DefaultStrategy>;

export function createOp(op: any): any {
  const customValidate = op.customValidate as CustomValidateFn<unknown, unknown> | undefined;

  if (op.schema) {
    if (op.strategies) {
      throw new Error(
        `createOp(${op.id}) does not support { schema } when using strategies; pass input/output explicitly`
      );
    }

    const schema = op.schema as AnyDomainOpSchema;
    const { schema: _schema, ...rest } = op as Record<string, unknown>;

    op = {
      ...rest,
      input: schema.properties.input,
      config: schema.properties.config,
      output: schema.properties.output,
    };
  }

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

    const domainOp = {
      kind: op.kind,
      id: op.id,
      input: op.input,
      output: op.output,
      strategies: op.strategies,
      defaultStrategy: op.defaultStrategy,
      resolveConfig: op.resolveConfig,
      config,
      defaultConfig,
      run: (input: any, cfg: any) => {
        const selectedId: string =
          (cfg && typeof cfg.strategy === "string" ? cfg.strategy : defaultStrategy) ?? ids[0]!;
        const selected = strategies[selectedId];
        if (!selected) throw new Error(`createOp(${op.id}) unknown strategy "${selectedId}"`);
        return selected.run(input, cfg?.config ?? {});
      },
    } as const;

    return attachValidationSurface(domainOp, customValidate);
  }

  const defaultConfig = buildDefaultConfigValue(op.config ?? Type.Object({}, { default: {} }));
  const { customValidate: _customValidate, schema: _schema, ...rest } = op as Record<string, unknown>;
  const domainOp = { ...(rest as any), defaultConfig } as const;
  return attachValidationSurface(domainOp, customValidate);
}

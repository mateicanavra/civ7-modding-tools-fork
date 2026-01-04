import { Type, type Static, type TSchema } from "typebox";

import type { RunSettings } from "@mapgen/engine/execution-plan.js";
import type { CustomValidateFn } from "../validation.js";
import type { OpStrategy, StrategySelection } from "./strategy.js";
import type { DomainOpKind, DomainOp, OpConfigSchema } from "./types.js";
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

type StrategyShape<InputSchema extends TSchema, OutputSchema extends TSchema> = Readonly<{
  config: TSchema;
  resolveConfig?: (config: any, settings: RunSettings) => any;
  run: (input: Static<InputSchema>, config: any) => Static<OutputSchema>;
}>;

type StrategyRecord<InputSchema extends TSchema, OutputSchema extends TSchema> = Readonly<
  Record<string, StrategyShape<InputSchema, OutputSchema>>
>;

type StrategyDefaults<InputSchema extends TSchema, OutputSchema extends TSchema> = Readonly<
  Record<"default", StrategyShape<InputSchema, OutputSchema>>
>;

type EnforceStrategies<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies,
> = Strategies extends StrategyRecord<InputSchema, OutputSchema> ? Strategies : never;

export function createOp<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  const Strategies,
>(op: OpDefinitionBase<InputSchema, OutputSchema> &
  Readonly<{
    strategies: EnforceStrategies<InputSchema, OutputSchema, Strategies> &
      StrategyDefaults<InputSchema, OutputSchema>;
  }> &
  OpDefinitionValidationHook<
    InputSchema,
    StrategySelection<EnforceStrategies<InputSchema, OutputSchema, Strategies>>
  >): DomainOp<
  InputSchema,
  OutputSchema,
  EnforceStrategies<InputSchema, OutputSchema, Strategies>
>;

export function createOp(op: any): any {
  const customValidate = op.customValidate as CustomValidateFn<unknown, unknown> | undefined;
  const strategies = op.strategies as Record<string, OpStrategy<TSchema, unknown, unknown>> | undefined;

  if (!strategies) {
    throw new Error(`createOp(${op.id ?? "unknown"}) requires strategies`);
  }

  if (!Object.prototype.hasOwnProperty.call(strategies, "default")) {
    throw new Error(`createOp(${op.id}) missing required "default" strategy`);
  }

  const ids = Object.keys(strategies);
  if (ids.length === 0) {
    throw new Error(`createOp(${op.id}) received empty strategies`);
  }

  const defaultInnerConfig = buildDefaultConfigValue(strategies.default.config) as Record<
    string,
    unknown
  >;
  const defaultConfig = { strategy: "default", config: defaultInnerConfig };

  const configCases = ids.map((id) =>
    Type.Object(
      {
        strategy: Type.Literal(id),
        config: strategies[id]!.config,
      },
      { additionalProperties: false }
    )
  );

  const config = Type.Union(configCases as any, {
    default: defaultConfig,
  }) as unknown as OpConfigSchema<typeof strategies>;

  const resolveConfig = (cfg: StrategySelection<typeof strategies>, settings: RunSettings) => {
    if (!cfg || typeof cfg.strategy !== "string") {
      throw new Error(`createOp(${op.id}) resolveConfig requires a strategy`);
    }
    const selected = strategies[cfg.strategy];
    if (!selected) {
      throw new Error(`createOp(${op.id}) unknown strategy "${cfg.strategy}"`);
    }
    if (!selected.resolveConfig) {
      return cfg;
    }
    return {
      strategy: cfg.strategy,
      config: selected.resolveConfig(cfg.config, settings),
    };
  };

  const domainOp = {
    kind: op.kind,
    id: op.id,
    input: op.input,
    output: op.output,
    strategies: op.strategies,
    config,
    defaultConfig,
    resolveConfig,
    run: (input: any, cfg: any) => {
      if (!cfg || typeof cfg.strategy !== "string") {
        throw new Error(`createOp(${op.id}) requires config.strategy`);
      }
      const selected = strategies[cfg.strategy];
      if (!selected) throw new Error(`createOp(${op.id}) unknown strategy "${cfg.strategy}"`);
      return selected.run(input, cfg.config);
    },
  } as const;

  return attachValidationSurface(domainOp, customValidate);
}

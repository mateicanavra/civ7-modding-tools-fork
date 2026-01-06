import { Type, type Static, type TSchema } from "typebox";

import type { RunSettings } from "@mapgen/engine/execution-plan.js";
import type { CustomValidateFn } from "../validation.js";
import type {
  OpStrategy,
  StrategyImplMapFor,
  StrategySelection,
} from "./strategy.js";
import type { DomainOp, OpConfigSchema } from "./types.js";
import type { OpContract } from "./contract.js";
import { buildDefaultConfigValue } from "./defaults.js";
import { attachValidationSurface } from "./validation-surface.js";

type RuntimeStrategiesForContract<C extends OpContract<any, any, any, any, any>> = Readonly<{
  [K in keyof C["strategies"] & string]: OpStrategy<
    C["strategies"][K],
    Static<C["input"]>,
    Static<C["output"]>
  >;
}>;

type StrategySelectionForContract<C extends OpContract<any, any, any, any, any>> =
  StrategySelection<RuntimeStrategiesForContract<C>>;

type OpImpl<C extends OpContract<any, any, any, any, any>> = Readonly<{
  strategies: StrategyImplMapFor<C>;
  customValidate?: CustomValidateFn<Static<C["input"]>, StrategySelectionForContract<C>>;
}>;

export function createOp<const C extends OpContract<any, any, any, any, any>>(
  contract: C,
  impl: OpImpl<C>
): DomainOp<C["input"], C["output"], RuntimeStrategiesForContract<C>>;

export function createOp(contract: any, impl: any): any {
  const strategySchemas = contract?.strategies as Record<string, TSchema> | undefined;
  const strategyImpls = impl?.strategies as
    | Record<string, { resolveConfig?: Function; run?: Function }>
    | undefined;

  if (!strategySchemas) {
    throw new Error(`createOp(${contract?.id ?? "unknown"}) requires a contract`);
  }

  if (!strategyImpls) {
    throw new Error(`createOp(${contract?.id ?? "unknown"}) requires strategies`);
  }

  if (!Object.prototype.hasOwnProperty.call(strategySchemas, "default")) {
    throw new Error(`createOp(${contract?.id}) missing required "default" strategy`);
  }

  const ids = Object.keys(strategySchemas);
  if (ids.length === 0) {
    throw new Error(`createOp(${contract?.id}) received empty strategies`);
  }

  const runtimeStrategies: Record<string, OpStrategy<TSchema, unknown, unknown>> = {};
  for (const id of ids) {
    const implStrategy = strategyImpls[id];
    if (!implStrategy) {
      throw new Error(`createOp(${contract?.id}) missing strategy "${id}"`);
    }
    runtimeStrategies[id] = {
      config: strategySchemas[id]!,
      resolveConfig: implStrategy.resolveConfig as any,
      run: implStrategy.run as any,
    };
  }

  for (const id of Object.keys(strategyImpls)) {
    if (!Object.prototype.hasOwnProperty.call(strategySchemas, id)) {
      throw new Error(`createOp(${contract?.id}) has unknown strategy "${id}"`);
    }
  }

  const defaultInnerConfig = buildDefaultConfigValue(strategySchemas.default) as Record<
    string,
    unknown
  >;
  const defaultConfig = { strategy: "default", config: defaultInnerConfig };

  const configCases = ids.map((id) =>
    Type.Object(
      {
        strategy: Type.Literal(id),
        config: strategySchemas[id]!,
      },
      { additionalProperties: false }
    )
  );

  const config = Type.Union(configCases as any, {
    default: defaultConfig,
  }) as unknown as OpConfigSchema<typeof runtimeStrategies>;

  const resolveConfig = (cfg: StrategySelection<typeof runtimeStrategies>, settings: RunSettings) => {
    if (!cfg || typeof cfg.strategy !== "string") {
      throw new Error(`createOp(${contract?.id}) resolveConfig requires a strategy`);
    }
    const selected = runtimeStrategies[cfg.strategy];
    if (!selected) {
      throw new Error(`createOp(${contract?.id}) unknown strategy "${cfg.strategy}"`);
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
    kind: contract.kind,
    id: contract.id,
    input: contract.input,
    output: contract.output,
    strategies: runtimeStrategies,
    config,
    defaultConfig,
    resolveConfig,
    run: (input: any, cfg: any) => {
      if (!cfg || typeof cfg.strategy !== "string") {
        throw new Error(`createOp(${contract?.id}) requires config.strategy`);
      }
      const selected = runtimeStrategies[cfg.strategy];
      if (!selected) {
        throw new Error(`createOp(${contract?.id}) unknown strategy "${cfg.strategy}"`);
      }
      return selected.run(input, cfg.config);
    },
  } as const;

  return attachValidationSurface(domainOp, impl.customValidate);
}

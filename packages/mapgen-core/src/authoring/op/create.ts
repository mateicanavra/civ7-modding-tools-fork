import type { Static, TSchema } from "typebox";

import type { NormalizeContext } from "@mapgen/engine/index.js";
import type { CustomValidateFn } from "../validation.js";
import type {
  OpStrategy,
  StrategyImplMapFor,
  StrategySelection,
} from "./strategy.js";
import type { DomainOp, OpConfigSchema } from "./types.js";
import type { OpContract } from "./contract.js";
import { buildOpEnvelopeSchema } from "./envelope.js";
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
): DomainOp<C["input"], C["output"], RuntimeStrategiesForContract<C>, C["id"]>;

export function createOp(contract: any, impl: any): any {
  const rawStrategySchemas = contract?.strategies as Record<string, TSchema> | undefined;
  const strategyImpls = impl?.strategies as
    | Record<string, { normalize?: Function; run?: Function }>
    | undefined;

  if (!rawStrategySchemas) {
    throw new Error(`createOp(${contract?.id ?? "unknown"}) requires a contract`);
  }

  if (!strategyImpls) {
    throw new Error(`createOp(${contract?.id ?? "unknown"}) requires strategies`);
  }

  if (!Object.prototype.hasOwnProperty.call(rawStrategySchemas, "default")) {
    throw new Error(`createOp(${contract?.id}) missing required "default" strategy schema`);
  }

  const strategySchemas = rawStrategySchemas as typeof rawStrategySchemas & { default: TSchema };

  const { schema: configSchema, defaultConfig, strategyIds } = buildOpEnvelopeSchema(
    contract.id,
    strategySchemas
  );

  const runtimeStrategies: Record<string, OpStrategy<TSchema, unknown, unknown>> = {};
  for (const id of strategyIds) {
    const implStrategy = strategyImpls[id];
    if (!implStrategy) {
      throw new Error(`createOp(${contract?.id}) missing strategy "${id}"`);
    }
    runtimeStrategies[id] = {
      config: strategySchemas[id]!,
      normalize: implStrategy.normalize as any,
      run: implStrategy.run as any,
    };
  }

  for (const id of Object.keys(strategyImpls)) {
    if (!Object.prototype.hasOwnProperty.call(strategySchemas, id)) {
      throw new Error(`createOp(${contract?.id}) has unknown strategy "${id}"`);
    }
  }

  const config = configSchema as unknown as OpConfigSchema<typeof runtimeStrategies>;

  const normalize = (cfg: StrategySelection<typeof runtimeStrategies>, ctx: NormalizeContext) => {
    if (!cfg || typeof cfg.strategy !== "string") {
      throw new Error(`createOp(${contract?.id}) normalize requires a strategy`);
    }
    const selected = runtimeStrategies[cfg.strategy];
    if (!selected) {
      throw new Error(`createOp(${contract?.id}) unknown strategy "${cfg.strategy}"`);
    }
    if (!selected.normalize) {
      return cfg;
    }
    return {
      strategy: cfg.strategy,
      config: selected.normalize(cfg.config, ctx),
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
    normalize,
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

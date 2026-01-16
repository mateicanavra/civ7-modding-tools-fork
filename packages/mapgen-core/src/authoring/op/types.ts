import type { Static, TSchema, TUnsafe } from "typebox";

import type { NormalizeContext } from "@mapgen/engine/index.js";
import type { StrategySelection } from "./strategy.js";

// Allow ops with specific input/config types to flow through generic registries.
type BivariantCallback<Args extends unknown[], Return> = {
  bivarianceHack(...args: Args): Return;
}["bivarianceHack"];

type StrategiesLike = Readonly<Record<string, TSchema>>;

export type OpContractLike = Readonly<{
  input: TSchema;
  output: TSchema;
  strategies: StrategiesLike;
}>;

export type OpStrategyId<TStrategies extends StrategiesLike> = keyof TStrategies & string;

export type OpTypeBag<
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  Strategies extends StrategiesLike,
> = Readonly<{
  input: Static<InputSchema>;
  output: Static<OutputSchema>;
  strategyId: OpStrategyId<Strategies>;
  config: Readonly<{
    [K in OpStrategyId<Strategies>]: Static<Strategies[K]>;
  }>;
  envelope: {
    [K in OpStrategyId<Strategies>]: Readonly<{
      strategy: K;
      config: Static<Strategies[K]>;
    }>;
  }[OpStrategyId<Strategies>];
}>;

export type OpTypeBagOf<TContract extends OpContractLike> = OpTypeBag<
  TContract["input"],
  TContract["output"],
  TContract["strategies"]
>;

export type OpConfigSchema<Strategies extends Record<string, { config: TSchema }>> = TUnsafe<
  StrategySelection<Strategies>
>;

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
  config: OpConfigSchema<Strategies>;
  defaultConfig: StrategySelection<Strategies>;
  strategies: Strategies;
  run: BivariantCallback<
    [Static<InputSchema>, StrategySelection<Strategies>],
    Static<OutputSchema>
  >;
  /**
   * Compile-time config normalization hook (called by the compiler).
   * This is never invoked at runtime; default behavior returns the input envelope unchanged.
   */
  normalize: BivariantCallback<
    [StrategySelection<Strategies>, NormalizeContext],
    StrategySelection<Strategies>
  >;
}>;

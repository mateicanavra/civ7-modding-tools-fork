import type { Static, TSchema, TUnsafe } from "typebox";

import type { NormalizeContext } from "@mapgen/engine/index.js";
import type { ValidationError, OpRunValidatedOptions, OpValidateOptions } from "../validation.js";
import type { StrategySelection } from "./strategy.js";

// Allow ops with specific input/config types to flow through generic registries.
type BivariantCallback<Args extends unknown[], Return> = {
  bivarianceHack(...args: Args): Return;
}["bivarianceHack"];

export type OpContractLike = Readonly<{
  input: TSchema;
  output: TSchema;
  strategies: Readonly<Record<string, TSchema>>;
}>;

export type OpStrategyId<TContract extends OpContractLike> =
  keyof TContract["strategies"] & string;

export type OpTypeBag<TContract extends OpContractLike> = Readonly<{
  input: Static<TContract["input"]>;
  output: Static<TContract["output"]>;
  strategyId: OpStrategyId<TContract>;
  config: Readonly<{
    [K in OpStrategyId<TContract>]: Static<TContract["strategies"][K]>;
  }>;
  envelope: {
    [K in OpStrategyId<TContract>]: Readonly<{
      strategy: K;
      config: Static<TContract["strategies"][K]>;
    }>;
  }[OpStrategyId<TContract>];
}>;

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
  validate: BivariantCallback<
    [Static<InputSchema>, StrategySelection<Strategies>, OpValidateOptions?],
    { ok: boolean; errors: ValidationError[] }
  >;
  runValidated: BivariantCallback<
    [Static<InputSchema>, StrategySelection<Strategies>, OpRunValidatedOptions?],
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

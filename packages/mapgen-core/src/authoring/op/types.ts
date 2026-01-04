import type { Static, TSchema } from "typebox";

import type { RunSettings } from "@mapgen/engine/execution-plan.js";
import type { ValidationError, OpRunValidatedOptions, OpValidateOptions } from "../validation.js";
import type { StrategySelection } from "./strategy.js";

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
  validate: (
    input: Static<InputSchema>,
    config: Strategies extends Record<string, { config: TSchema }>
      ? StrategySelection<Strategies, DefaultStrategy>
      : Static<ConfigSchema>,
    options?: OpValidateOptions
  ) => { ok: boolean; errors: ValidationError[] };
  runValidated: (
    input: Static<InputSchema>,
    config: Strategies extends Record<string, { config: TSchema }>
      ? StrategySelection<Strategies, DefaultStrategy>
      : Static<ConfigSchema>,
    options?: OpRunValidatedOptions
  ) => Static<OutputSchema>;
  /**
   * Optional compile-time config normalization hook (called by step resolvers).
   * This is never invoked at runtime.
   */
  resolveConfig?: (
    config: Strategies extends Record<string, { config: TSchema }>
      ? StrategySelection<Strategies, DefaultStrategy>
      : Static<ConfigSchema>,
    settings: RunSettings
  ) => Strategies extends Record<string, { config: TSchema }>
    ? StrategySelection<Strategies, DefaultStrategy>
    : Static<ConfigSchema>;
}>;

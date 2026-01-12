import type { Static, TSchema } from "typebox";

import type { NormalizeContext } from "./ops";

export type DependencyTag = string;
export type GenerationPhase =
  | "setup"
  | "foundation"
  | "morphology"
  | "hydrology"
  | "ecology"
  | "placement";

export type StepContract<Schema extends TSchema, Id extends string> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema: Schema;
}>;

const STEP_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function defineStep<const Schema extends TSchema, const Id extends string>(
  def: StepContract<Schema, Id>
): typeof def {
  if (!STEP_ID_RE.test(def.id)) {
    throw new Error(`step id "${def.id}" must be kebab-case (e.g. "plot-vegetation")`);
  }
  return def;
}

type StepConfigOf<C extends StepContract<any, any>> = Static<C["schema"]>;

export type StepModule<TContext, C extends StepContract<any, any>> = Readonly<{
  contract: C;
  /**
   * Compile-time only normalization hook (value-only; shape-preserving).
   */
  normalize?: (config: StepConfigOf<C>, ctx: NormalizeContext) => StepConfigOf<C>;
  /**
   * Runtime handler.
   */
  run: (context: TContext, config: StepConfigOf<C>) => void | Promise<void>;
}>;

type StepImpl<TContext, C extends StepContract<any, any>> = Readonly<{
  normalize?: StepModule<TContext, C>["normalize"];
  run: StepModule<TContext, C>["run"];
}>;

export function createStep<const C extends StepContract<any, any>, TContext = unknown>(
  contract: C,
  impl: StepImpl<TContext, C>
): StepModule<TContext, C> {
  if (!contract?.schema) {
    const label = contract?.id ? `step "${contract.id}"` : "step";
    throw new Error(`createStep requires an explicit schema for ${label}`);
  }
  return { contract, ...impl };
}


import type { Static, TSchema } from "typebox";

import { applySchemaConventions } from "../schema.js";
import type { DependencyTag, GenerationPhase, NormalizeContext } from "@mapgen/engine/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

export type StepContract<Schema extends TSchema, Id extends string> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema: Schema;
}>;

const STEP_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function defineStepContract<const Schema extends TSchema, const Id extends string>(
  def: StepContract<Schema, Id>
): typeof def {
  if (!STEP_ID_RE.test(def.id)) {
    throw new Error(`step id "${def.id}" must be kebab-case (e.g. "plot-vegetation")`);
  }
  applySchemaConventions(def.schema, `step:${def.id}.schema`);
  return def;
}

export type Step<TContext = ExtendedMapContext, TConfig = unknown> = {
  readonly contract: StepContract<TSchema, string>;
  normalize?: (config: TConfig, ctx: NormalizeContext) => TConfig;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
};

export type StepModule<TContext = ExtendedMapContext, TConfig = unknown> = Step<TContext, TConfig>;

type StepConfigOf<C extends StepContract<any, any>> = Static<C["schema"]>;

type StepImpl<TContext, TConfig> = Readonly<{
  normalize?: (config: TConfig, ctx: NormalizeContext) => TConfig;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
}>;

export function createStep<
  const C extends StepContract<any, any>,
  TContext = unknown,
>(
  contract: C,
  impl: StepImpl<TContext, StepConfigOf<C>>
): StepModule<TContext, StepConfigOf<C>> {
  if (!contract?.schema) {
    const label = contract?.id ? `step "${contract.id}"` : "step";
    throw new Error(`createStep requires an explicit schema for ${label}`);
  }
  return {
    contract,
    ...impl,
  };
}

export type CreateStepFor<TContext> = <const C extends StepContract<any, any>>(
  contract: C,
  impl: StepImpl<TContext, StepConfigOf<C>>
) => StepModule<TContext, StepConfigOf<C>>;

export function createStepFor<TContext>(): CreateStepFor<TContext> {
  return (contract, impl) => createStep(contract, impl);
}

export type StepModuleAny = StepModule<any, any>;

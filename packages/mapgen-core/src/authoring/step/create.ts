import type { Static } from "typebox";

import type { NormalizeContext } from "@mapgen/engine/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepContract } from "./contract.js";
import type { StepRuntimeOps } from "./ops.js";
import type { StepDeps, StepModule, StepProvidedArtifactsRuntime } from "../types.js";

type StepConfigOf<C extends StepContract<any, any, any, any>> = Static<C["schema"]>;
type StepOpsOf<C extends StepContract<any, any, any, any>> = StepRuntimeOps<NonNullable<C["ops"]>>;

type StepArtifactsRuntime<
  C extends StepContract<any, any, any, any>,
  TContext extends ExtendedMapContext,
> = StepProvidedArtifactsRuntime<TContext, ArtifactsOf<C>>;

type ArtifactsOf<C extends StepContract<any, any, any, any>> =
  C extends StepContract<any, any, any, infer A> ? A : undefined;

type StepImpl<TContext, TConfig, TOps, TArtifacts, TDeps> = Readonly<{
  artifacts?: TArtifacts;
  normalize?: (config: TConfig, ctx: NormalizeContext) => TConfig;
  run: (context: TContext, config: TConfig, ops: TOps, deps: TDeps) => void | Promise<void>;
}>;

export function createStep<
  const C extends StepContract<any, any, any, any>,
  TContext extends ExtendedMapContext = ExtendedMapContext,
>(
  contract: C,
  impl: StepImpl<
    TContext,
    StepConfigOf<C>,
    StepOpsOf<C>,
    StepArtifactsRuntime<C, TContext>,
    StepDeps<TContext, ArtifactsOf<C>>
  >
): StepModule<TContext, C> {
  if (!contract?.schema) {
    const label = contract?.id ? `step "${contract.id}"` : "step";
    throw new Error(`createStep requires an explicit schema for ${label}`);
  }
  return {
    contract,
    ...impl,
  } as unknown as StepModule<TContext, C>;
}

export type CreateStepFor<TContext extends ExtendedMapContext> = <
  const C extends StepContract<any, any, any, any>,
>(
  contract: C,
  impl: StepImpl<
    TContext,
    StepConfigOf<C>,
    StepOpsOf<C>,
    StepArtifactsRuntime<C, TContext>,
    StepDeps<TContext, ArtifactsOf<C>>
  >
) => StepModule<TContext, C>;

export function createStepFor<TContext extends ExtendedMapContext>(): CreateStepFor<TContext> {
  return (contract, impl) => createStep(contract, impl);
}

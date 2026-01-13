import type { Static } from "typebox";

import type { NormalizeContext } from "@mapgen/engine/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepContract } from "./contract.js";
import type { StepRuntimeOps } from "./ops.js";
import type { StepModule, StepProvidedArtifactsRuntime } from "../types.js";

type StepConfigOf<C extends StepContract<any, any, any>> = Static<C["schema"]>;
type StepOpsOf<C extends StepContract<any, any, any>> = StepRuntimeOps<NonNullable<C["ops"]>>;

type StepArtifactsRuntime<C extends StepContract<any, any, any>, TContext> =
  StepProvidedArtifactsRuntime<TContext, C["artifacts"]>;

type StepImpl<TContext, TConfig, TOps, TArtifacts> = Readonly<{
  artifacts?: TArtifacts;
  normalize?: (config: TConfig, ctx: NormalizeContext) => TConfig;
  run: (context: TContext, config: TConfig, ops: TOps) => void | Promise<void>;
}>;

export function createStep<
  const C extends StepContract<any, any, any>,
  TContext = ExtendedMapContext,
>(
  contract: C,
  impl: StepImpl<TContext, StepConfigOf<C>, StepOpsOf<C>, StepArtifactsRuntime<C, TContext>>
): StepModule<TContext, StepConfigOf<C>, StepOpsOf<C>, C["artifacts"]> {
  if (!contract?.schema) {
    const label = contract?.id ? `step "${contract.id}"` : "step";
    throw new Error(`createStep requires an explicit schema for ${label}`);
  }
  return {
    contract,
    ...impl,
  };
}

export type CreateStepFor<TContext> = <const C extends StepContract<any, any, any>>(
  contract: C,
  impl: StepImpl<TContext, StepConfigOf<C>, StepOpsOf<C>, StepArtifactsRuntime<C, TContext>>
) => StepModule<TContext, StepConfigOf<C>, StepOpsOf<C>, C["artifacts"]>;

export function createStepFor<TContext>(): CreateStepFor<TContext> {
  return (contract, impl) => createStep(contract, impl);
}

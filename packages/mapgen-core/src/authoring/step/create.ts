import type { Static } from "typebox";

import type { NormalizeContext } from "@mapgen/engine/index.js";
import type { StepContract } from "./contract.js";
import type { StepRuntimeOps } from "./ops.js";
import type { StepModule } from "../types.js";

type StepConfigOf<C extends StepContract<any, any, any>> = Static<C["schema"]>;
type StepOpsOf<C extends StepContract<any, any, any>> = StepRuntimeOps<C["ops"]>;

type StepImpl<TContext, TConfig, TOps> = Readonly<{
  normalize?: (config: TConfig, ctx: NormalizeContext) => TConfig;
  run: (context: TContext, config: TConfig, ops: TOps) => void | Promise<void>;
}>;

export function createStep<
  const C extends StepContract<any, any, any>,
  TContext = unknown,
>(
  contract: C,
  impl: StepImpl<TContext, StepConfigOf<C>, StepOpsOf<C>>
): StepModule<TContext, StepConfigOf<C>, StepOpsOf<C>> {
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
  impl: StepImpl<TContext, StepConfigOf<C>, StepOpsOf<C>>
) => StepModule<TContext, StepConfigOf<C>, StepOpsOf<C>>;

export function createStepFor<TContext>(): CreateStepFor<TContext> {
  return (contract, impl) => createStep(contract, impl);
}

import type { Static } from "typebox";

import type { RunSettings } from "@mapgen/engine/index.js";
import type { StepContract } from "./contract.js";
import type { StepModule } from "../types.js";

type StepConfigOf<C extends StepContract<any, any>> = Static<C["schema"]>;

type StepImpl<TContext, TConfig> = Readonly<{
  resolveConfig?: (config: TConfig, settings: RunSettings) => TConfig;
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

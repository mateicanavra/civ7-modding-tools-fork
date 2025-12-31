import type { RecipeV1 } from "@mapgen/engine/execution-plan.js";
import type { StepRegistry } from "@mapgen/engine/StepRegistry.js";

export interface PipelineModV1<TContext, TConfig = unknown, TRuntime = unknown> {
  readonly id: string;
  readonly recipes?: Readonly<Record<string, RecipeV1>>;
  register: (registry: StepRegistry<TContext>, config: TConfig, runtime: TRuntime) => void;
}


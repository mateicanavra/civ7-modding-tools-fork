import type { TSchema } from "typebox";
import type { RunSettings } from "@mapgen/engine/execution-plan.js";
import type { TraceScope } from "@mapgen/trace/index.js";

export interface EngineContext {
  trace: TraceScope;
}

export type GenerationPhase =
  | "setup"
  | "foundation"
  | "morphology"
  | "hydrology"
  | "ecology"
  | "placement";

export type DependencyTag = string;

export interface MapGenStep<TContext = EngineContext, TConfig = unknown> {
  id: string;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  configSchema?: TSchema;
  resolveConfig?: (config: TConfig, settings: RunSettings) => TConfig;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
}

export interface PipelineStepResult {
  stepId: string;
  success: boolean;
  durationMs?: number;
  error?: string;
}

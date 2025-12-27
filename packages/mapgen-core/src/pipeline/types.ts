import type { TSchema } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

export type GenerationPhase =
  | "setup"
  | "foundation"
  | "morphology"
  | "hydrology"
  | "ecology"
  | "placement";

export type DependencyTag = string;

export interface MapGenStep<TContext = ExtendedMapContext, TConfig = unknown> {
  id: string;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  configSchema?: TSchema;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
}

export interface PipelineStepResult {
  stepId: string;
  success: boolean;
  durationMs?: number;
  error?: string;
}

import type { TSchema } from "typebox";

import type {
  DependencyTag,
  ExecutionPlan,
  GenerationPhase,
  RecipeV1,
  RunRequest,
  RunSettings,
} from "@mapgen/engine/index.js";
import type { DependencyTagDefinition } from "@mapgen/engine/tags.js";
import type { TraceSession } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

// Bivariant callback keeps heterogeneous step configs assignable in Stage without widening to any.
type StepRunner<TContext, TConfig> = {
  bivarianceHack: (context: TContext, config: TConfig) => void | Promise<void>;
}["bivarianceHack"];

export type Step<TContext = ExtendedMapContext, TConfig = unknown> = {
  readonly id: string;
  readonly phase: GenerationPhase;
  readonly requires: readonly DependencyTag[];
  readonly provides: readonly DependencyTag[];
  readonly schema: TSchema;
  readonly instanceId?: string;
  run: StepRunner<TContext, TConfig>;
};

export type Stage<TContext = ExtendedMapContext> = {
  readonly id: string;
  readonly steps: readonly Step<TContext, unknown>[];
};

export type RecipeConfig = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

type UnionToIntersection<T> = (T extends unknown ? (x: T) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

type StepConfigById<
  TStage extends Stage<any>,
  TStepId extends string,
> = Extract<TStage["steps"][number], { id: TStepId }> extends Step<any, infer TConfig>
  ? TConfig
  : unknown;

export type RecipeConfigOf<TStages extends readonly Stage<any>[]> = UnionToIntersection<
  TStages[number] extends infer TStage
    ? TStage extends Stage<any>
      ? Readonly<
          Record<
            TStage["id"],
            Readonly<{
              [K in TStage["steps"][number]["id"]]: StepConfigById<TStage, K>;
            }>
          >
        >
      : never
    : never
>;

export type RecipeDefinition<TContext = ExtendedMapContext> = Readonly<{
  id: string;
  namespace?: string;
  tagDefinitions: readonly DependencyTagDefinition<TContext>[];
  stages: readonly Stage<TContext>[];
}>;

export type RecipeModule<TContext = ExtendedMapContext> = {
  readonly id: string;
  readonly recipe: RecipeV1;
  instantiate: (config?: RecipeConfig | null) => RecipeV1;
  runRequest: (settings: RunSettings, config?: RecipeConfig | null) => RunRequest;
  compile: (settings: RunSettings, config?: RecipeConfig | null) => ExecutionPlan;
  run: (
    context: TContext,
    settings: RunSettings,
    config?: RecipeConfig | null,
    options?: { trace?: TraceSession | null; log?: (message: string) => void }
  ) => void;
};

export type StepModule<TContext = ExtendedMapContext, TConfig = unknown> = Step<TContext, TConfig>;
export type StageModule<TContext = ExtendedMapContext> = Stage<TContext>;

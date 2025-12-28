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

export type Step<TContext = ExtendedMapContext, TConfig = any> = Readonly<{
  id: string;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema: TSchema;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
  instanceId?: string;
}>;

export type Stage<TContext = ExtendedMapContext> = Readonly<{
  id: string;
  steps: readonly Step<TContext, any>[];
}>;

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

export type StepModule<TContext = ExtendedMapContext, TConfig = any> = Step<TContext, TConfig>;
export type StageModule<TContext = ExtendedMapContext> = Stage<TContext>;

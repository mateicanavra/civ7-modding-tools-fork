import type { TSchema } from "typebox";

import type {
  DependencyTag,
  ExecutionPlan,
  GenerationPhase,
  RecipeV2,
  RunRequest,
  RunSettings,
} from "@mapgen/engine/index.js";
import type { DependencyTagDefinition } from "@mapgen/engine/tags.js";
import type { TraceSession, TraceSink } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

export type Step<TContext = ExtendedMapContext, TConfig = unknown> = {
  readonly id: string;
  readonly phase: GenerationPhase;
  readonly requires: readonly DependencyTag[];
  readonly provides: readonly DependencyTag[];
  readonly schema: TSchema;
  resolveConfig?: (config: TConfig, settings: RunSettings) => TConfig;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
};

export type Stage<
  TContext = ExtendedMapContext,
  TSteps extends readonly Step<TContext, any>[] = readonly Step<TContext, any>[],
> = {
  readonly id: string;
  readonly steps: TSteps;
};

export type RecipeConfig = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

type UnionToIntersection<T> = (T extends unknown ? (x: T) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

type StepConfigById<
  TStage extends Stage<any, readonly Step<any, any>[]>,
  TStepId extends string,
> = Extract<TStage["steps"][number], { id: TStepId }> extends Step<any, infer TConfig>
  ? TConfig
  : unknown;

export type RecipeConfigOf<TStages extends readonly Stage<any, readonly Step<any, any>[]>[]> =
  UnionToIntersection<
  TStages[number] extends infer TStage
    ? TStage extends Stage<any, readonly Step<any, any>[]>
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

export type RecipeDefinition<
  TContext = ExtendedMapContext,
  TStages extends readonly Stage<TContext, readonly Step<TContext, any>[]>[] = readonly Stage<
    TContext,
    readonly Step<TContext, any>[]
  >[],
> = Readonly<{
  id: string;
  namespace?: string;
  tagDefinitions: readonly DependencyTagDefinition<TContext>[];
  stages: TStages;
}>;

export type RecipeModule<TContext = ExtendedMapContext, TConfig = RecipeConfig | null> = {
  readonly id: string;
  readonly recipe: RecipeV2;
  instantiate: (config?: TConfig) => RecipeV2;
  runRequest: (settings: RunSettings, config?: TConfig) => RunRequest;
  compile: (settings: RunSettings, config?: TConfig) => ExecutionPlan;
  run: (
    context: TContext,
    settings: RunSettings,
    config?: TConfig,
    options?: {
      trace?: TraceSession | null;
      traceSink?: TraceSink | null;
      log?: (message: string) => void;
    }
  ) => void;
};

export type StepModule<TContext = ExtendedMapContext, TConfig = unknown> = Step<TContext, TConfig>;
export type StageModule<
  TContext = ExtendedMapContext,
  TSteps extends readonly Step<TContext, any>[] = readonly Step<TContext, any>[],
> = Stage<TContext, TSteps>;

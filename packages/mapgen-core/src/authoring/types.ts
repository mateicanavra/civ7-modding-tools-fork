import type { Static, TObject, TSchema } from "typebox";

import type {
  DependencyTag,
  ExecutionPlan,
  GenerationPhase,
  NormalizeContext,
  RecipeV2,
  RunRequest,
  RunSettings,
} from "@mapgen/engine/index.js";
import type { DependencyTagDefinition } from "@mapgen/engine/tags.js";
import type { TraceSession, TraceSink } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepContract } from "./step/contract.js";

export type Step<TContext = ExtendedMapContext, TConfig = unknown> = {
  readonly contract: StepContract<TSchema, string>;
  normalize?: (config: TConfig, ctx: NormalizeContext) => TConfig;
  run: (context: TContext, config: TConfig) => void | Promise<void>;
};

export const RESERVED_STAGE_KEY = "knobs" as const;
export type ReservedStageKey = typeof RESERVED_STAGE_KEY;

type StepsArray<TContext> = readonly Step<TContext, any>[];
type StepIdOf<TSteps extends StepsArray<any>> = TSteps[number]["contract"]["id"] & string;
type NonReservedStepIdOf<TSteps extends StepsArray<any>> = Exclude<StepIdOf<TSteps>, ReservedStageKey>;

type StepConfigInputById<
  TSteps extends StepsArray<any>,
  TStepId extends StepIdOf<TSteps>,
> = Extract<TSteps[number], { contract: { id: TStepId } }> extends Step<any, infer TConfig>
  ? TConfig
  : unknown;

export type StageToInternalResult<StepId extends string, Knobs> = Readonly<{
  knobs: Knobs;
  rawSteps: Partial<Record<StepId, unknown>>;
}>;

export type StageCompileFn<PublicSchema extends TObject, StepId extends string, Knobs> = (args: {
  env: unknown;
  knobs: Knobs;
  config: Static<PublicSchema>;
}) => Partial<Record<StepId, unknown>>;

export type StageDef<
  Id extends string,
  TContext,
  KnobsSchema extends TObject,
  Knobs = Static<KnobsSchema>,
  TSteps extends StepsArray<TContext> = StepsArray<TContext>,
  PublicSchema extends TObject | undefined = undefined,
> = Readonly<{
  id: Id;
  steps: TSteps;
  knobsSchema: KnobsSchema;
  public?: PublicSchema;
  compile?: PublicSchema extends TObject
    ? StageCompileFn<PublicSchema, NonReservedStepIdOf<TSteps>, Knobs>
    : undefined;
}>;

export type StageContract<
  Id extends string,
  TContext,
  KnobsSchema extends TObject,
  Knobs = Static<KnobsSchema>,
  TSteps extends StepsArray<TContext> = StepsArray<TContext>,
  PublicSchema extends TObject | undefined = undefined,
> = StageDef<Id, TContext, KnobsSchema, Knobs, TSteps, PublicSchema> &
  Readonly<{
    surfaceSchema: TObject;
    toInternal: (args: { env: unknown; stageConfig: unknown }) => StageToInternalResult<
      NonReservedStepIdOf<TSteps>,
      Knobs
    >;
  }>;

export type StageContractAny = StageContract<string, any, any, any, any, any>;

export type Stage<
  TContext = ExtendedMapContext,
  TSteps extends StepsArray<TContext> = StepsArray<TContext>,
  KnobsSchema extends TObject = TObject,
  PublicSchema extends TObject | undefined = undefined,
> = StageContract<string, TContext, KnobsSchema, Static<KnobsSchema>, TSteps, PublicSchema>;

export type RecipeConfig = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

type UnionToIntersection<T> = (T extends unknown ? (x: T) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

type StepConfigById<
  TStage extends Stage<any, readonly Step<any, any>[]>,
  TStepId extends string,
> = Extract<TStage["steps"][number], { contract: { id: TStepId } }> extends Step<any, infer TConfig>
  ? TConfig
  : unknown;

export type StageConfigInputOf<TStage extends Stage<any, readonly Step<any, any>[]>> =
  Readonly<{ knobs?: Partial<Static<TStage["knobsSchema"]>> }> &
    (TStage["public"] extends TObject
      ? Static<TStage["public"]>
      : Partial<{
          [K in NonReservedStepIdOf<TStage["steps"]>]: StepConfigInputById<TStage["steps"], K>;
        }>);

export type RecipeConfigOf<TStages extends readonly Stage<any, readonly Step<any, any>[]>[]> =
  UnionToIntersection<
    TStages[number] extends infer TStage
      ? TStage extends Stage<any, readonly Step<any, any>[]>
        ? Readonly<
          Record<
            TStage["id"],
            Readonly<{
              [K in TStage["steps"][number]["contract"]["id"]]: StepConfigById<TStage, K>;
            }>
          >
        >
      : never
    : never
>;

export type RecipeConfigInputOf<TStages extends readonly Stage<any, readonly Step<any, any>[]>[]> =
  UnionToIntersection<
    TStages[number] extends infer TStage
      ? TStage extends Stage<any, readonly Step<any, any>[]>
        ? Readonly<Partial<Record<TStage["id"], StageConfigInputOf<TStage>>>>
        : never
      : never
  >;

export type CompiledRecipeConfigOf<
  TStages extends readonly Stage<any, readonly Step<any, any>[]>[],
> = RecipeConfigOf<TStages>;

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

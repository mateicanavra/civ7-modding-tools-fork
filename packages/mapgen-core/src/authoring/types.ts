import type { Static, TObject, TSchema } from "typebox";

import type {
  DependencyTag,
  ExecutionPlan,
  GenerationPhase,
  NormalizeContext,
  RecipeV2,
  RunRequest,
  Env,
} from "@mapgen/engine/index.js";
import type { DependencyTagDefinition } from "@mapgen/engine/tags.js";
import type { TraceSession, TraceSink } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { CompileOpsById } from "../compiler/recipe-compile.js";
import type { DomainOpRuntimeAny, OpsById } from "./bindings.js";
import type { ArtifactContract } from "./artifact/contract.js";
import type { ProvidedArtifactRuntime, RequiredArtifactRuntime } from "./artifact/runtime.js";
import type { StepArtifactsDecl, StepArtifactsDeclAny, StepContract } from "./step/contract.js";

type ArtifactsByName<T extends readonly ArtifactContract[]> = {
  [Name in T[number]["name"] & string]: Extract<T[number], { name: Name }>;
};

type ArtifactNameOf<T extends readonly ArtifactContract[]> = Extract<keyof ArtifactsByName<T>, string>;

type ArtifactByName<T extends readonly ArtifactContract[], K extends string> = Extract<
  T[number],
  { name: K }
>;

export type StepProvidedArtifactsRuntime<
  TContext extends ExtendedMapContext,
  TArtifacts extends StepArtifactsDeclAny | undefined,
> = TArtifacts extends StepArtifactsDecl<any, infer Provides>
  ? Provides extends readonly ArtifactContract[]
    ? {
        [K in ArtifactNameOf<Provides>]: ProvidedArtifactRuntime<ArtifactByName<Provides, K>, TContext>;
      }
    : {}
  : {};

type ArtifactListOrEmpty<T> = T extends readonly ArtifactContract[] ? T : readonly [];

type StepArtifactsSurface<
  TContext extends ExtendedMapContext,
  TArtifacts extends StepArtifactsDeclAny | undefined,
> =
  TArtifacts extends StepArtifactsDecl<infer Requires, infer Provides>
    ? {
        [K in ArtifactNameOf<ArtifactListOrEmpty<Requires>>]: RequiredArtifactRuntime<
          ArtifactByName<ArtifactListOrEmpty<Requires>, K>,
          TContext
        >;
      } & {
        [K in ArtifactNameOf<ArtifactListOrEmpty<Provides>>]: ProvidedArtifactRuntime<
          ArtifactByName<ArtifactListOrEmpty<Provides>, K>,
          TContext
        >;
      }
    : {};

export type StepDeps<
  TContext extends ExtendedMapContext,
  TArtifacts extends StepArtifactsDeclAny | undefined,
> = Readonly<{
  /**
   * Canonical dependency surface for artifacts.
   *
   * Buffer artifacts are a temporary exception: they are published once and then
   * mutated in-place via ctx.buffers without re-publishing.
   * TODO(architecture): redesign buffers as a distinct dependency kind (not artifacts).
   */
  artifacts: StepArtifactsSurface<TContext, TArtifacts>;
  fields: unknown;
  effects: unknown;
}>;

export type Step<
  TContext extends ExtendedMapContext = ExtendedMapContext,
  TConfig = unknown,
  TOps = unknown,
  TArtifacts extends StepArtifactsDeclAny | undefined = StepArtifactsDeclAny | undefined,
> = {
  readonly contract: StepContract<TObject, string, any, TArtifacts>;
  artifacts?: StepProvidedArtifactsRuntime<TContext, TArtifacts>;
  normalize?: (config: TConfig, ctx: NormalizeContext) => TConfig;
  run: (context: TContext, config: TConfig, ops: TOps, deps: StepDeps<TContext, TArtifacts>) => void | Promise<void>;
};

export const RESERVED_STAGE_KEY = "knobs" as const;
export type ReservedStageKey = typeof RESERVED_STAGE_KEY;

type StepsArray<TContext extends ExtendedMapContext> = readonly Step<TContext, any>[];
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
  TContext extends ExtendedMapContext,
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
  TContext extends ExtendedMapContext,
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

export type StageContractAny = StageContract<string, ExtendedMapContext, any, any, any, any>;

export type Stage<
  TContext extends ExtendedMapContext = ExtendedMapContext,
  TSteps extends StepsArray<TContext> = StepsArray<TContext>,
  KnobsSchema extends TObject = TObject,
  PublicSchema extends TObject | undefined = TObject | undefined,
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
  TContext extends ExtendedMapContext = ExtendedMapContext,
  TStages extends readonly Stage<TContext, readonly Step<TContext, any>[]>[] = readonly Stage<
    TContext,
    readonly Step<TContext, any>[]
  >[],
> = Readonly<{
  id: string;
  namespace?: string;
  tagDefinitions: readonly DependencyTagDefinition<TContext>[];
  stages: TStages;
  compileOpsById: CompileOpsById;
  runtimeOpsById?: OpsById<DomainOpRuntimeAny>;
}>;

export type RecipeModule<
  TContext extends ExtendedMapContext = ExtendedMapContext,
  TConfigInput = RecipeConfigInputOf<any> | null,
  TConfigCompiled = RecipeConfig,
> = {
  readonly id: string;
  readonly recipe: RecipeV2;
  instantiate: (config: TConfigCompiled) => RecipeV2;
  compileConfig: (env: Env, config?: TConfigInput) => TConfigCompiled;
  runRequest: (env: Env, config: TConfigCompiled) => RunRequest;
  compile: (env: Env, config?: TConfigInput) => ExecutionPlan;
  run: (
    context: TContext,
    env: Env,
    config?: TConfigInput,
    options?: {
      trace?: TraceSession | null;
      traceSink?: TraceSink | null;
      log?: (message: string) => void;
    }
  ) => void;
};

export type StepModule<
  TContext extends ExtendedMapContext = ExtendedMapContext,
  TConfig = unknown,
  TOps = unknown,
  TArtifacts extends StepArtifactsDeclAny | undefined = StepArtifactsDeclAny | undefined,
> = Step<TContext, TConfig, TOps, TArtifacts>;
export type StageModule<
  TContext extends ExtendedMapContext = ExtendedMapContext,
  TSteps extends readonly Step<TContext, any>[] = readonly Step<TContext, any>[],
> = Stage<TContext, TSteps>;

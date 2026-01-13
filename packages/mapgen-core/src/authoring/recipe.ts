import {
  compileExecutionPlan,
  createTraceSessionFromPlan,
  PipelineExecutor,
  StepRegistry,
  TagRegistry,
  type DependencyTagDefinition,
  type ExecutionPlan,
  type MapGenStep,
  type RecipeV2,
  type RunRequest,
  type Env,
} from "@mapgen/engine/index.js";

import { createConsoleTraceSink } from "@mapgen/trace/index.js";
import type { TraceSession, TraceSink } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { bindRuntimeOps, runtimeOp, type DomainOpRuntimeAny } from "./bindings.js";
import { compileRecipeConfig } from "../compiler/recipe-compile.js";
import type { ArtifactContract, ArtifactReadValueOf } from "./artifact/contract.js";
import {
  ArtifactMissingError,
  type ProvidedArtifactRuntime,
  type RequiredArtifactRuntime,
} from "./artifact/runtime.js";
import type {
  CompiledRecipeConfigOf,
  RecipeConfig,
  RecipeConfigInputOf,
  RecipeDefinition,
  RecipeModule,
  Stage,
  Step,
  StepDeps,
} from "./types.js";

type AnyStage<TContext> = Stage<TContext, readonly Step<TContext, any, any, any>[]>;

type StepOccurrence<TContext> = {
  stageId: string;
  stepId: string;
  step: MapGenStep<TContext, unknown>;
};

function assertTagDefinitions(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error("createRecipe requires tagDefinitions (may be an empty array)");
  }
}

function inferTagKind(id: string): DependencyTagDefinition<unknown>["kind"] {
  if (id.startsWith("artifact:")) return "artifact";
  if (id.startsWith("field:")) return "field";
  if (id.startsWith("effect:")) return "effect";
  throw new Error(`Invalid dependency tag "${id}" (expected artifact:/field:/effect:)`);
}

function computeFullStepId(input: {
  namespace?: string;
  recipeId: string;
  stageId: string;
  stepId: string;
}): string {
  const base = input.namespace ? `${input.namespace}.${input.recipeId}` : input.recipeId;
  return `${base}.${input.stageId}.${input.stepId}`;
}

function createRequiredArtifactRuntime<
  TContext extends ExtendedMapContext,
  C extends ArtifactContract,
>(contract: C, consumerStepId: string): RequiredArtifactRuntime<C, TContext> {
  return {
    contract,
    read: (context: TContext) => {
      if (!context.artifacts.has(contract.id)) {
        throw new ArtifactMissingError({
          artifactId: contract.id,
          artifactName: contract.name,
          consumerStepId,
        });
      }
      return context.artifacts.get(contract.id) as ArtifactReadValueOf<C>;
    },
    tryRead: (context: TContext) => {
      if (!context.artifacts.has(contract.id)) return null;
      return context.artifacts.get(contract.id) as ArtifactReadValueOf<C>;
    },
  };
}

function resolveProvidedArtifactRuntime<TContext extends ExtendedMapContext>(
  authored: Step<TContext, any, any, any>,
  contract: ArtifactContract,
  fullStepId: string,
  recipeId: string
): ProvidedArtifactRuntime<any, TContext> {
  const runtime = authored.artifacts?.[contract.name as keyof typeof authored.artifacts];
  if (!runtime) {
    throw new Error(
      `[recipe:${recipeId}] step "${fullStepId}" missing artifact runtime for "${contract.name}"`
    );
  }
  return runtime as unknown as ProvidedArtifactRuntime<any, TContext>;
}

function buildArtifactDeps<TContext extends ExtendedMapContext>(
  authored: Step<TContext, any, any, any>,
  fullStepId: string,
  recipeId: string
): StepDeps<TContext, any>["artifacts"] {
  const artifacts = authored.contract.artifacts;
  if (!artifacts) return {} as StepDeps<TContext, any>["artifacts"];

  const out: Record<string, RequiredArtifactRuntime<any, TContext> | ProvidedArtifactRuntime<any, TContext>> =
    {};

  for (const contract of artifacts.requires ?? []) {
    out[contract.name] = createRequiredArtifactRuntime(contract, fullStepId);
  }

  for (const contract of artifacts.provides ?? []) {
    out[contract.name] = resolveProvidedArtifactRuntime(authored, contract, fullStepId, recipeId);
  }

  return out as StepDeps<TContext, typeof artifacts>["artifacts"];
}

function buildStepDeps<TContext extends ExtendedMapContext>(
  authored: Step<TContext, any, any, any>,
  fullStepId: string,
  recipeId: string
): StepDeps<TContext, typeof authored.contract.artifacts> {
  return {
    artifacts: buildArtifactDeps(authored, fullStepId, recipeId),
    fields: {},
    effects: {},
  } as StepDeps<TContext, typeof authored.contract.artifacts>;
}

function collectArtifactTagDefinitions<TContext extends ExtendedMapContext>(input: {
  namespace?: string;
  recipeId: string;
  stages: readonly AnyStage<TContext>[];
}): DependencyTagDefinition<TContext>[] {
  const defs = new Map<string, DependencyTagDefinition<TContext>>();
  const providers = new Map<string, string>();

  for (const stage of input.stages) {
    for (const authored of stage.steps) {
      const stepId = authored.contract.id;
      const fullId = computeFullStepId({
        namespace: input.namespace,
        recipeId: input.recipeId,
        stageId: stage.id,
        stepId,
      });

      for (const tag of authored.contract.provides) {
        if (!tag.startsWith("artifact:")) continue;
        const existing = providers.get(tag);
        if (existing) {
          throw new Error(
            `[recipe:${input.recipeId}] artifact "${tag}" provided by multiple steps: ${existing}, ${fullId}`
          );
        }
        providers.set(tag, fullId);
      }

      for (const contract of authored.contract.artifacts?.provides ?? []) {
        const existing = providers.get(contract.id);
        if (existing) {
          throw new Error(
            `[recipe:${input.recipeId}] artifact "${contract.id}" provided by multiple steps: ${existing}, ${fullId}`
          );
        }
        const runtime = resolveProvidedArtifactRuntime(authored, contract, fullId, input.recipeId);
        defs.set(contract.id, {
          id: contract.id,
          kind: "artifact",
          satisfies: runtime.satisfies,
        });
        providers.set(contract.id, fullId);
      }
    }
  }

  return Array.from(defs.values());
}

function finalizeOccurrences<TContext extends ExtendedMapContext>(input: {
  namespace?: string;
  recipeId: string;
  stages: readonly AnyStage<TContext>[];
  runtimeOpsById: Readonly<Record<string, DomainOpRuntimeAny>>;
}): StepOccurrence<TContext>[] {
  const out: StepOccurrence<TContext>[] = [];

  for (const stage of input.stages) {
    for (const authored of stage.steps) {
      const stepId = authored.contract.id;
      const fullId = computeFullStepId({
        namespace: input.namespace,
        recipeId: input.recipeId,
        stageId: stage.id,
        stepId,
      });
      const deps = buildStepDeps(authored, fullId, input.recipeId);

      const ops = authored.contract.ops
        ? bindRuntimeOps(authored.contract.ops as any, input.runtimeOpsById as any)
        : {};

      out.push({
        stageId: stage.id,
        stepId,
        step: {
          id: fullId,
          phase: authored.contract.phase,
          requires: authored.contract.requires,
          provides: authored.contract.provides,
          configSchema: authored.contract.schema,
          normalize: authored.normalize as
            | MapGenStep<TContext, unknown>["normalize"]
            | undefined,
          run: ((context: TContext, config: unknown) => {
            return (authored.run as any)(context, config, ops, deps);
          }) as unknown as MapGenStep<TContext, unknown>["run"],
        },
      });
    }
  }

  return out;
}

function collectTagDefinitions<TContext>(
  occurrences: readonly StepOccurrence<TContext>[],
  explicit: readonly DependencyTagDefinition<TContext>[],
  artifactTagDefinitions: readonly DependencyTagDefinition<TContext>[]
): DependencyTagDefinition<TContext>[] {
  const defs = new Map<string, DependencyTagDefinition<TContext>>();

  const tagIds = new Set<string>();
  for (const occ of occurrences) {
    for (const tag of occ.step.requires) tagIds.add(tag);
    for (const tag of occ.step.provides) tagIds.add(tag);
  }
  for (const id of tagIds) {
    defs.set(id, { id, kind: inferTagKind(id) } as DependencyTagDefinition<TContext>);
  }

  for (const def of artifactTagDefinitions) {
    defs.set(def.id, def);
  }

  for (const def of explicit) {
    defs.set(def.id, def);
  }

  return Array.from(defs.values());
}

function buildRegistry<TContext extends ExtendedMapContext>(
  occurrences: readonly StepOccurrence<TContext>[],
  tagDefinitions: readonly DependencyTagDefinition<TContext>[],
  artifactTagDefinitions: readonly DependencyTagDefinition<TContext>[]
): StepRegistry<TContext> {
  const tags = new TagRegistry<TContext>();
  tags.registerTags(collectTagDefinitions(occurrences, tagDefinitions, artifactTagDefinitions));

  const registry = new StepRegistry<TContext>({ tags });
  for (const occ of occurrences) registry.register(occ.step);
  return registry;
}

function toStructuralRecipeV2<TContext>(
  id: string,
  occurrences: readonly StepOccurrence<TContext>[]
): RecipeV2 {
  return {
    schemaVersion: 2,
    id,
    steps: occurrences.map((occ) => ({
      id: occ.step.id,
    })),
  };
}

export function createRecipe<
  TContext extends ExtendedMapContext,
  const TStages extends readonly AnyStage<TContext>[],
>(
  input: RecipeDefinition<TContext, TStages>
): RecipeModule<
  TContext,
  RecipeConfigInputOf<TStages> | null,
  CompiledRecipeConfigOf<TStages>
> {
  assertTagDefinitions(input.tagDefinitions);

  const runtimeOpsById =
    input.runtimeOpsById ??
    (Object.fromEntries(
      Object.entries(input.compileOpsById).map(([id, op]) => [id, runtimeOp(op)])
    ) as Readonly<Record<string, DomainOpRuntimeAny>>);

  const occurrences = finalizeOccurrences({
    namespace: input.namespace,
    recipeId: input.id,
    stages: input.stages,
    runtimeOpsById,
  });
  const artifactTagDefinitions = collectArtifactTagDefinitions({
    namespace: input.namespace,
    recipeId: input.id,
    stages: input.stages,
  });
  const registry = buildRegistry(occurrences, input.tagDefinitions, artifactTagDefinitions);
  const recipe = toStructuralRecipeV2(input.id, occurrences);

  function assertCompiledConfig(
    config: CompiledRecipeConfigOf<TStages> | null | undefined
  ): asserts config is CompiledRecipeConfigOf<TStages> {
    if (!config) {
      throw new Error(`[recipe:${input.id}] compiled config required (use recipe.compileConfig(...))`);
    }

    const cfg = config as RecipeConfig;
    for (const stage of input.stages) {
      const stageConfig = cfg[stage.id];
      if (!stageConfig || typeof stageConfig !== "object") {
        throw new Error(
          `[recipe:${input.id}] missing compiled config for stage "${stage.id}" (use recipe.compileConfig(...))`
        );
      }
      for (const step of stage.steps) {
        const stepId = step.contract.id;
        if (!(stepId in stageConfig)) {
          throw new Error(
            `[recipe:${input.id}] missing compiled config for step "${stage.id}.${stepId}" (use recipe.compileConfig(...))`
          );
        }
      }
    }
  }

  function instantiate(config: CompiledRecipeConfigOf<TStages>): RecipeV2 {
    assertCompiledConfig(config);
    const cfg = config as RecipeConfig;
    return {
      ...recipe,
      steps: occurrences.map((occ) => ({
        id: occ.step.id,
        config: cfg
          ? (cfg[occ.stageId]?.[occ.stepId] as Record<string, unknown> | undefined)
          : undefined,
      })),
    };
  }

  function compileConfig(
    env: Env,
    config?: RecipeConfigInputOf<TStages> | null
  ): CompiledRecipeConfigOf<TStages> {
    return compileRecipeConfig({
      env,
      recipe: { stages: input.stages },
      config: config as RecipeConfigInputOf<any> | null | undefined,
      compileOpsById: input.compileOpsById,
    }) as CompiledRecipeConfigOf<TStages>;
  }

  function runRequest(env: Env, config: CompiledRecipeConfigOf<TStages>): RunRequest {
    return { recipe: instantiate(config), env };
  }

  function compile(env: Env, config?: RecipeConfigInputOf<TStages> | null): ExecutionPlan {
    const compiled = compileConfig(env, config);
    return compileExecutionPlan(runRequest(env, compiled), registry);
  }

  function run(
    context: TContext,
    env: Env,
    config?: RecipeConfigInputOf<TStages> | null,
    options: { trace?: TraceSession | null; traceSink?: TraceSink | null; log?: (message: string) => void } = {}
  ): void {
    const plan = compile(env, config);
    context.env = plan.env;
    const traceSession =
      options.trace !== undefined
        ? options.trace
        : createTraceSessionFromPlan(
            plan,
            options.traceSink !== undefined ? options.traceSink : createConsoleTraceSink()
          );
    const executor = new PipelineExecutor(registry, {
      log: options.log,
      logPrefix: `[recipe:${input.id}]`,
    });
    executor.executePlan(context, plan, { trace: traceSession ?? null });
  }

  return { id: input.id, recipe, instantiate, compileConfig, runRequest, compile, run };
}

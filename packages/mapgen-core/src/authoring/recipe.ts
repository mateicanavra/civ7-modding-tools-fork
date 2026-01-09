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
  type RunSettings,
} from "@mapgen/engine/index.js";

import { createConsoleTraceSink } from "@mapgen/trace/index.js";
import type { TraceSession, TraceSink } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type {
  RecipeConfig,
  RecipeConfigInputOf,
  RecipeDefinition,
  RecipeModule,
  Stage,
  Step,
} from "./types.js";

type AnyStage<TContext> = Stage<TContext, readonly Step<TContext, any>[]>;

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

function finalizeOccurrences<TContext extends ExtendedMapContext>(input: {
  namespace?: string;
  recipeId: string;
  stages: readonly AnyStage<TContext>[];
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

      out.push({
        stageId: stage.id,
        stepId,
        step: {
          id: fullId,
          phase: authored.contract.phase,
          requires: authored.contract.requires,
          provides: authored.contract.provides,
          configSchema: authored.contract.schema,
          resolveConfig: authored.resolveConfig as
            | MapGenStep<TContext, unknown>["resolveConfig"]
            | undefined,
          run: authored.run as unknown as MapGenStep<TContext, unknown>["run"],
        },
      });
    }
  }

  return out;
}

function collectTagDefinitions<TContext>(
  occurrences: readonly StepOccurrence<TContext>[],
  explicit: readonly DependencyTagDefinition<TContext>[]
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

  for (const def of explicit) {
    defs.set(def.id, def);
  }

  return Array.from(defs.values());
}

function buildRegistry<TContext extends ExtendedMapContext>(
  occurrences: readonly StepOccurrence<TContext>[],
  tagDefinitions: readonly DependencyTagDefinition<TContext>[]
): StepRegistry<TContext> {
  const tags = new TagRegistry<TContext>();
  tags.registerTags(collectTagDefinitions(occurrences, tagDefinitions));

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
): RecipeModule<TContext, RecipeConfigInputOf<TStages> | null> {
  assertTagDefinitions(input.tagDefinitions);

  const occurrences = finalizeOccurrences({
    namespace: input.namespace,
    recipeId: input.id,
    stages: input.stages,
  });
  const registry = buildRegistry(occurrences, input.tagDefinitions);
  const recipe = toStructuralRecipeV2(input.id, occurrences);

  function instantiate(config?: RecipeConfigInputOf<TStages> | null): RecipeV2 {
    const cfg = (config ?? null) as RecipeConfig | null;
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

  function runRequest(settings: RunSettings, config?: RecipeConfigInputOf<TStages> | null): RunRequest {
    return { recipe: instantiate(config), settings };
  }

  function compile(settings: RunSettings, config?: RecipeConfigInputOf<TStages> | null): ExecutionPlan {
    return compileExecutionPlan(runRequest(settings, config), registry);
  }

  function run(
    context: TContext,
    settings: RunSettings,
    config?: RecipeConfigInputOf<TStages> | null,
    options: { trace?: TraceSession | null; traceSink?: TraceSink | null; log?: (message: string) => void } = {}
  ): void {
    const plan = compile(settings, config);
    context.settings = plan.settings;
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

  return { id: input.id, recipe, instantiate, runRequest, compile, run };
}

import {
  compileExecutionPlan,
  PipelineExecutor,
  StepRegistry,
  TagRegistry,
  type DependencyTagDefinition,
  type ExecutionPlan,
  type MapGenStep,
  type RecipeV1,
  type RunRequest,
  type RunSettings,
} from "@mapgen/engine/index.js";

import type { TraceSession } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { RecipeConfig, RecipeDefinition, RecipeModule, Stage, Step } from "./types.js";

type StepOccurrence<TContext> = {
  stageId: string;
  stepId: string;
  step: MapGenStep<TContext, unknown>;
  instanceId?: string;
};

function assertTagDefinitions(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error("createRecipe requires tagDefinitions (may be an empty array)");
  }
}

function assertUniqueInstanceIds<TContext>(stages: readonly Stage<TContext>[]): void {
  const seen = new Set<string>();
  for (const stage of stages) {
    for (const step of stage.steps) {
      if (!step.instanceId) continue;
      if (seen.has(step.instanceId)) {
        throw new Error(`createRecipe requires unique instanceId values (dup: "${step.instanceId}")`);
      }
      seen.add(step.instanceId);
    }
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
  stages: readonly Stage<TContext>[];
}): StepOccurrence<TContext>[] {
  const out: StepOccurrence<TContext>[] = [];

  for (const stage of input.stages) {
    for (const authored of stage.steps) {
      const stepId = authored.id;
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
          phase: authored.phase,
          requires: authored.requires,
          provides: authored.provides,
          configSchema: authored.schema,
          run: authored.run as unknown as MapGenStep<TContext, unknown>["run"],
        },
        instanceId: authored.instanceId,
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

function toStructuralRecipeV1(id: string, occurrences: readonly StepOccurrence<unknown>[]): RecipeV1 {
  return {
    schemaVersion: 1,
    id,
    steps: occurrences.map((occ) => ({
      id: occ.step.id,
      instanceId: occ.instanceId,
    })),
  };
}

export function createRecipe<TContext extends ExtendedMapContext>(
  input: RecipeDefinition<TContext>
): RecipeModule<TContext> {
  assertTagDefinitions(input.tagDefinitions);
  assertUniqueInstanceIds(input.stages);

  const occurrences = finalizeOccurrences({
    namespace: input.namespace,
    recipeId: input.id,
    stages: input.stages,
  });
  const registry = buildRegistry(occurrences, input.tagDefinitions);
  const recipe = toStructuralRecipeV1(input.id, occurrences);

  function instantiate(config?: RecipeConfig | null): RecipeV1 {
    const cfg = config ?? null;
    return {
      ...recipe,
      steps: occurrences.map((occ) => ({
        id: occ.step.id,
        instanceId: occ.instanceId,
        config: cfg ? cfg[occ.stageId]?.[occ.stepId] : undefined,
      })),
    };
  }

  function runRequest(settings: RunSettings, config?: RecipeConfig | null): RunRequest {
    return { recipe: instantiate(config), settings };
  }

  function compile(settings: RunSettings, config?: RecipeConfig | null): ExecutionPlan {
    return compileExecutionPlan(runRequest(settings, config), registry);
  }

  function run(
    context: TContext,
    settings: RunSettings,
    config?: RecipeConfig | null,
    options: { trace?: TraceSession | null; log?: (message: string) => void } = {}
  ): void {
    const plan = compile(settings, config);
    const executor = new PipelineExecutor(registry, {
      log: options.log,
      logPrefix: `[recipe:${input.id}]`,
    });
    executor.executePlan(context, plan, { trace: options.trace ?? null });
  }

  return { id: input.id, recipe, instantiate, runRequest, compile, run };
}

// Ensure environments without Web TextEncoder (e.g., Civ7 embedded V8) have a compatible implementation.
import "../polyfills/text-encoder";

import { Type, type Static } from "typebox";

import type { StepRegistry } from "@mapgen/engine/StepRegistry.js";
import type { GenerationPhase } from "@mapgen/engine/types.js";
import { EnvSchema, type Env } from "@mapgen/core/env.js";

const UnknownRecord = Type.Record(Type.String(), Type.Unknown(), { default: {} });

/**
 * Recipe schema version 2 (locked):
 * - step ids are unique within the recipe
 * - no instance identity layer; a "step" is a single execution node
 */
export const RecipeStepV2Schema = Type.Object(
  {
    id: Type.String(),
    enabled: Type.Optional(Type.Boolean()),
    config: Type.Optional(UnknownRecord),
  },
  { additionalProperties: false }
);

export type RecipeStepV2 = Static<typeof RecipeStepV2Schema>;

export const RecipeV2Schema = Type.Object(
  {
    schemaVersion: Type.Literal(2),
    id: Type.Optional(Type.String()),
    steps: Type.Array(RecipeStepV2Schema),
  },
  { additionalProperties: false }
);

export type RecipeV2 = Static<typeof RecipeV2Schema>;

export const RunRequestSchema = Type.Object(
  {
    recipe: RecipeV2Schema,
    env: EnvSchema,
  },
  { additionalProperties: false }
);

export type RunRequest = Static<typeof RunRequestSchema>;

export interface ExecutionPlanNode {
  stepId: string;
  phase: GenerationPhase;
  requires: readonly string[];
  provides: readonly string[];
  config: unknown;
}

export interface ExecutionPlan {
  recipeSchemaVersion: number;
  recipeId?: string;
  env: Env;
  nodes: ExecutionPlanNode[];
}

export type ExecutionPlanCompileErrorCode =
  | "runRequest.invalid"
  | "step.unknown";

export interface ExecutionPlanCompileErrorItem {
  code: ExecutionPlanCompileErrorCode;
  path: string;
  message: string;
  stepId?: string;
}

export class ExecutionPlanCompileError extends Error {
  readonly errors: ExecutionPlanCompileErrorItem[];

  constructor(errors: ExecutionPlanCompileErrorItem[]) {
    const message = errors.map((err) => `${err.path}: ${err.message}`).join("; ");
    super(`ExecutionPlan compile failed: ${message}`);
    this.name = "ExecutionPlanCompileError";
    this.errors = errors;
  }
}

export function compileExecutionPlan<TContext>(
  runRequest: RunRequest,
  registry: StepRegistry<TContext>
): ExecutionPlan {
  const { recipe, env } = runRequest;

  const errors: ExecutionPlanCompileErrorItem[] = [];
  const nodes: ExecutionPlanNode[] = [];
  const seenStepIds = new Set<string>();

  recipe.steps.forEach((step, index) => {
    const enabled = step.enabled ?? true;
    if (!enabled) return;

    if (seenStepIds.has(step.id)) {
      errors.push({
        code: "runRequest.invalid",
        path: `/recipe/steps/${index}/id`,
        message: `Duplicate step id "${step.id}" (recipes require unique step ids)`,
        stepId: step.id,
      });
      return;
    }
    seenStepIds.add(step.id);

    if (!registry.has(step.id)) {
      errors.push({
        code: "step.unknown",
        path: `/recipe/steps/${index}/id`,
        message: `Unknown step "${step.id}"`,
        stepId: step.id,
      });
      return;
    }

    const registryStep = registry.get(step.id);
    const config = step.config;

    nodes.push({
      stepId: step.id,
      phase: registryStep.phase,
      requires: [...registryStep.requires],
      provides: [...registryStep.provides],
      config,
    });
  });

  if (errors.length > 0) {
    throw new ExecutionPlanCompileError(errors);
  }

  return {
    recipeSchemaVersion: recipe.schemaVersion,
    recipeId: recipe.id,
    env,
    nodes,
  };
}

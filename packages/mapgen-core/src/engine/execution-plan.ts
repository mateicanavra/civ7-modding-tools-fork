// Ensure environments without Web TextEncoder (e.g., Civ7 embedded V8) have a compatible implementation.
import "../polyfills/text-encoder";

import { Type, type Static, type TSchema } from "typebox";
import { TypeCompiler } from "typebox/compile";

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
  | "step.unknown"
  | "step.config.invalid";

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function findUnknownKeyErrors(
  schema: unknown,
  value: unknown,
  path = ""
): Array<{ path: string; message: string }> {
  if (!isPlainObject(schema) || !isPlainObject(value)) return [];

  const anyOf = Array.isArray(schema.anyOf) ? (schema.anyOf as unknown[]) : null;
  const oneOf = Array.isArray(schema.oneOf) ? (schema.oneOf as unknown[]) : null;
  const candidates = anyOf ?? oneOf;
  if (candidates) {
    let best: Array<{ path: string; message: string }> | null = null;
    for (const candidate of candidates) {
      const errs = findUnknownKeyErrors(candidate, value, path);
      if (best == null || errs.length < best.length) best = errs;
      if (best.length === 0) break;
    }
    return best ?? [];
  }

  const properties = isPlainObject(schema.properties) ? (schema.properties as Record<string, unknown>) : null;
  const additionalProperties = schema.additionalProperties;

  const errors: Array<{ path: string; message: string }> = [];

  if (properties && additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!(key in properties)) {
        errors.push({
          path: `${path}/${key}`,
          message: "Unknown key",
        });
        continue;
      }
      errors.push(...findUnknownKeyErrors(properties[key], value[key], `${path}/${key}`));
    }
    return errors;
  }

  const patternProperties = isPlainObject(schema.patternProperties)
    ? (schema.patternProperties as Record<string, unknown>)
    : null;
  if (patternProperties) {
    const firstValueSchema = Object.values(patternProperties)[0];
    for (const key of Object.keys(value)) {
      errors.push(...findUnknownKeyErrors(firstValueSchema, value[key], `${path}/${key}`));
    }
    return errors;
  }

  if (schema.type === "array" && schema.items && Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      errors.push(...findUnknownKeyErrors(schema.items, value[i], `${path}/${String(i)}`));
    }
    return errors;
  }

  return [];
}

function joinPath(basePath: string, rawPath: string): string {
  if (!rawPath || rawPath === "/") return basePath || "/";
  if (!basePath) return rawPath;
  return `${basePath}${rawPath}`;
}

const schemaCache = new WeakMap<TSchema, ReturnType<typeof TypeCompiler.Compile>>();

function getCompiler(schema: TSchema): ReturnType<typeof TypeCompiler.Compile> {
  const cached = schemaCache.get(schema);
  if (cached) return cached;
  const compiled = TypeCompiler.Compile(schema);
  schemaCache.set(schema, compiled);
  return compiled;
}

function formatErrors(
  schema: TSchema,
  value: unknown,
  basePath: string
): Array<{ path: string; message: string }> {
  const formattedErrors: Array<{ path: string; message: string }> = [];
  const checker = getCompiler(schema);

  for (const err of checker.Errors(value)) {
    const path =
      (err as { path?: string; instancePath?: string }).path ??
      (err as { instancePath?: string }).instancePath ??
      "";
    const normalizedPath = path && path.length > 0 ? path : "/";
    formattedErrors.push({
      path: joinPath(basePath, normalizedPath),
      message: err.message,
    });
  }

  return formattedErrors;
}

function parseRunRequest(input: unknown): RunRequest {
  const unknownKeyErrors = findUnknownKeyErrors(
    RunRequestSchema,
    isPlainObject(input) ? input : {},
    ""
  );
  const errors = [...unknownKeyErrors, ...formatErrors(RunRequestSchema, input, "")];

  if (errors.length > 0) {
    throw new ExecutionPlanCompileError(
      errors.map((err) => ({
        code: "runRequest.invalid",
        path: err.path,
        message: err.message,
      }))
    );
  }

  return input as RunRequest;
}

function validateStepConfig(
  schema: TSchema,
  rawValue: unknown,
  path: string
): { value: unknown; errors: ExecutionPlanCompileErrorItem[] } {
  const unknownKeyErrors = findUnknownKeyErrors(schema, rawValue, path);
  const errors = [...unknownKeyErrors, ...formatErrors(schema, rawValue, path)].map(
    (err) => ({
      code: "step.config.invalid" as const,
      path: err.path,
      message: err.message,
    })
  );

  return { value: rawValue, errors };
}

export function compileExecutionPlan<TContext>(
  runRequest: RunRequest,
  registry: StepRegistry<TContext>
): ExecutionPlan {
  const normalized = parseRunRequest(runRequest);
  const { recipe, env } = normalized;

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
    const configPath = `/recipe/steps/${index}/config`;
    let config: unknown = step.config;
    if (registryStep.configSchema) {
      const { value, errors: configErrors } = validateStepConfig(
        registryStep.configSchema,
        step.config,
        configPath
      );
      if (configErrors.length > 0) {
        errors.push(
          ...configErrors.map((err) => ({
            ...err,
            stepId: step.id,
          }))
        );
        return;
      }
      config = value;
    }

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

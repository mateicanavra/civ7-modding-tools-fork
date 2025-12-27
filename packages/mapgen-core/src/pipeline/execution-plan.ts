// Ensure environments without Web TextEncoder (e.g., Civ7 embedded V8) have a compatible implementation.
import "../polyfills/text-encoder";

import { Type, type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

import type { StepRegistry } from "@mapgen/pipeline/StepRegistry.js";
import type { GenerationPhase, MapGenStep } from "@mapgen/pipeline/types.js";

const UnknownRecord = Type.Record(Type.String(), Type.Unknown(), { default: {} });

export const RunSettingsSchema = Type.Object(
  {
    seed: Type.Number(),
    dimensions: Type.Object(
      {
        width: Type.Number(),
        height: Type.Number(),
      },
      { additionalProperties: false }
    ),
    latitudeBounds: Type.Object(
      {
        topLatitude: Type.Number(),
        bottomLatitude: Type.Number(),
      },
      { additionalProperties: false }
    ),
    wrap: Type.Object(
      {
        wrapX: Type.Boolean(),
        wrapY: Type.Boolean(),
      },
      { additionalProperties: false }
    ),
    metadata: Type.Optional(UnknownRecord),
  },
  { additionalProperties: false }
);

export type RunSettings = Static<typeof RunSettingsSchema>;

export const RecipeStepV1Schema = Type.Object(
  {
    id: Type.String(),
    instanceId: Type.Optional(Type.String()),
    enabled: Type.Optional(Type.Boolean()),
    config: Type.Optional(UnknownRecord),
    labels: Type.Optional(Type.Array(Type.String())),
  },
  { additionalProperties: false }
);

export type RecipeStepV1 = Static<typeof RecipeStepV1Schema>;

const RecipeFutureV1Schema = Type.Object({}, { additionalProperties: false });

export const RecipeV1Schema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    id: Type.Optional(Type.String()),
    metadata: Type.Optional(UnknownRecord),
    steps: Type.Array(RecipeStepV1Schema),
    future: Type.Optional(RecipeFutureV1Schema),
    extensions: Type.Optional(UnknownRecord),
  },
  { additionalProperties: false }
);

export type RecipeV1 = Static<typeof RecipeV1Schema>;

export const RunRequestSchema = Type.Object(
  {
    recipe: RecipeV1Schema,
    settings: RunSettingsSchema,
  },
  { additionalProperties: false }
);

export type RunRequest = Static<typeof RunRequestSchema>;

export interface ExecutionPlanNode {
  nodeId: string;
  stepId: string;
  phase: GenerationPhase;
  requires: readonly string[];
  provides: readonly string[];
  config: unknown;
}

export interface ExecutionPlan {
  recipeSchemaVersion: number;
  recipeId?: string;
  settings: RunSettings;
  nodes: ExecutionPlanNode[];
  extensions?: Record<string, unknown>;
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

function formatErrors(
  schema: TSchema,
  value: unknown,
  basePath: string
): Array<{ path: string; message: string }> {
  const formattedErrors: Array<{ path: string; message: string }> = [];

  for (const err of Value.Errors(schema, value)) {
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

function buildValue(schema: TSchema, input: unknown): { converted: unknown; cleaned: unknown } {
  const cloned = Value.Clone(input ?? {});
  const defaulted = Value.Default(schema, cloned);
  const cleaned = Value.Clean(schema, defaulted);
  return { converted: defaulted, cleaned };
}

function parseRunRequest(input: unknown): RunRequest {
  const unknownKeyErrors = findUnknownKeyErrors(RunRequestSchema, input ?? {}, "");
  const { converted, cleaned } = buildValue(RunRequestSchema, input);
  const errors = [
    ...unknownKeyErrors,
    ...formatErrors(RunRequestSchema, converted, ""),
  ];

  if (errors.length > 0) {
    throw new ExecutionPlanCompileError(
      errors.map((err) => ({
        code: "runRequest.invalid",
        path: err.path,
        message: err.message,
      }))
    );
  }

  return cleaned as RunRequest;
}

function normalizeStepConfig(
  schema: TSchema,
  rawValue: unknown,
  path: string
): { value: unknown; errors: ExecutionPlanCompileErrorItem[] } {
  const input = rawValue ?? {};
  const unknownKeyErrors = findUnknownKeyErrors(schema, input, path);
  const { converted, cleaned } = buildValue(schema, input);
  const errors = [
    ...unknownKeyErrors,
    ...formatErrors(schema, converted, path),
  ].map((err) => ({
    code: "step.config.invalid" as const,
    path: err.path,
    message: err.message,
  }));

  return { value: cleaned, errors };
}

function buildNodeConfig<TContext>(
  step: MapGenStep<TContext, unknown>,
  recipeStep: RecipeStepV1,
  path: string
): { config: unknown; errors: ExecutionPlanCompileErrorItem[] } {
  if (!step.configSchema) {
    return { config: recipeStep.config ?? {}, errors: [] };
  }

  const { value, errors } = normalizeStepConfig(step.configSchema, recipeStep.config, path);
  return { config: value, errors };
}

export function compileExecutionPlan<TContext>(
  runRequest: RunRequest,
  registry: StepRegistry<TContext>
): ExecutionPlan {
  const normalized = parseRunRequest(runRequest);
  const { recipe, settings } = normalized;

  const errors: ExecutionPlanCompileErrorItem[] = [];
  const nodes: ExecutionPlanNode[] = [];

  recipe.steps.forEach((step, index) => {
    const enabled = step.enabled ?? true;
    if (!enabled) return;

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
    const { config, errors: configErrors } = buildNodeConfig(registryStep, step, configPath);
    if (configErrors.length > 0) {
      errors.push(
        ...configErrors.map((err) => ({
          ...err,
          stepId: step.id,
        }))
      );
      return;
    }

    const instanceId = step.instanceId ?? step.id;
    nodes.push({
      nodeId: instanceId,
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
    settings,
    nodes,
    extensions: recipe.extensions ?? undefined,
  };
}

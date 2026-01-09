import type { TSchema } from "typebox";
import { Value } from "typebox/value";

import type { Env, NormalizeCtx } from "./env";
import { buildOpEnvelopeSchema, bindCompileOps, type DomainOpCompileAny } from "./ops";
import type { StepModuleAny } from "./steps";
import type { StageToInternalResult } from "./stages";
import type { CompiledRecipeConfigOf, RecipeConfigInputOf } from "./recipes";

export type CompileErrorCode =
  | "config.invalid"
  | "stage.compile.failed"
  | "op.missing"
  | "step.normalize.failed"
  | "op.normalize.failed"
  | "normalize.not.shape-preserving";

export type CompileErrorItem = Readonly<{
  code: CompileErrorCode;
  path: string;
  message: string;
  stageId?: string;
  stepId?: string;
  opKey?: string;
  opId?: string;
}>;

export class RecipeCompileError extends Error {
  readonly errors: CompileErrorItem[];

  constructor(errors: CompileErrorItem[]) {
    const message = errors.map((err) => `${err.path}: ${err.message}`).join("; ");
    super(`Recipe compile failed: ${message}`);
    this.name = "RecipeCompileError";
    this.errors = errors;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function joinPath(basePath: string, rawPath: string): string {
  const base = basePath && basePath.length > 0 ? basePath : "";
  const suffix = rawPath && rawPath.length > 0 ? rawPath : "";
  return `${base}${suffix}`;
}

function formatErrors(
  schema: TSchema,
  value: unknown,
  basePath: string
): Array<{ path: string; message: string }> {
  const formatted: Array<{ path: string; message: string }> = [];
  for (const err of Value.Errors(schema, value)) {
    const path =
      (err as { path?: string; instancePath?: string }).path ??
      (err as { instancePath?: string }).instancePath ??
      "";
    const normalizedPath = path && path.length > 0 ? path : "/";
    formatted.push({ path: joinPath(basePath, normalizedPath), message: err.message });
  }
  return formatted;
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

  const properties = isPlainObject(schema.properties)
    ? (schema.properties as Record<string, unknown>)
    : null;
  const additionalProperties = schema.additionalProperties;

  const errors: Array<{ path: string; message: string }> = [];

  if (properties && additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!(key in properties)) {
        errors.push({ path: `${path}/${key}`, message: "Unknown key" });
        continue;
      }
      errors.push(...findUnknownKeyErrors(properties[key], value[key], `${path}/${key}`));
    }
    return errors;
  }

  if (properties) {
    for (const key of Object.keys(properties)) {
      errors.push(...findUnknownKeyErrors(properties[key], (value as any)[key], `${path}/${key}`));
    }
  }
  return errors;
}

function buildValue(schema: TSchema, input: unknown): { converted: unknown; cleaned: unknown } {
  const cloned = Value.Clone(input ?? {});
  const defaulted = Value.Default(schema, cloned);
  const cleaned = Value.Clean(schema, defaulted);
  return { converted: defaulted, cleaned };
}

export function normalizeStrict<T>(
  schema: TSchema,
  rawValue: unknown,
  path: string
): { value: T; errors: CompileErrorItem[] } {
  if (rawValue === null) {
    const errors = formatErrors(schema, rawValue, path).map((err) => ({
      code: "config.invalid" as const,
      path: err.path,
      message: err.message,
    }));
    return { value: rawValue as T, errors };
  }

  const input = rawValue === undefined ? {} : rawValue;
  const unknownKeyErrors = findUnknownKeyErrors(schema, input, path);
  const { converted, cleaned } = buildValue(schema, input);
  const errors = [...unknownKeyErrors, ...formatErrors(schema, converted, path)].map((err) => ({
    code: "config.invalid" as const,
    path: err.path,
    message: err.message,
  }));

  return { value: cleaned as T, errors };
}

export function prefillOpDefaults(
  step: StepModuleAny,
  rawStepConfig: unknown,
  path: string
): { value: Record<string, unknown>; errors: CompileErrorItem[] } {
  if (rawStepConfig !== undefined && !isPlainObject(rawStepConfig)) {
    return {
      value: {},
      errors: [
        {
          code: "config.invalid",
          path,
          message: "Expected object for step config",
        },
      ],
    };
  }

  const value: Record<string, unknown> = { ...(rawStepConfig as Record<string, unknown> | undefined) };
  const errors: CompileErrorItem[] = [];

  const opsDecl = (step as any).contract?.ops as Record<
    string,
    { id: string; strategies: Record<string, TSchema> }
  > | null;
  if (!opsDecl) return { value, errors };

  for (const opKey of Object.keys(opsDecl)) {
    if (value[opKey] !== undefined) continue;
    const contract = opsDecl[opKey]!;
    const { defaultConfig } = buildOpEnvelopeSchema(contract.id, contract.strategies as any);
    value[opKey] = Value.Clone(defaultConfig);
  }

  return { value, errors };
}

export function normalizeOpsTopLevel(
  step: StepModuleAny,
  stepConfig: Record<string, unknown>,
  ctx: NormalizeCtx<Env, unknown>,
  opsById: Readonly<Record<string, DomainOpCompileAny>>,
  path: string
): { value: Record<string, unknown>; errors: CompileErrorItem[] } {
  const errors: CompileErrorItem[] = [];

  const opsDecl = (step as any).contract?.ops as Record<string, { id: string }> | null;
  if (!opsDecl) return { value: stepConfig, errors };

  let compileOps: Record<string, DomainOpCompileAny>;
  try {
    compileOps = bindCompileOps(opsDecl, opsById) as any;
  } catch (err) {
    errors.push({
      code: "op.missing",
      path,
      message: err instanceof Error ? err.message : "bindCompileOps failed",
    });
    return { value: stepConfig, errors };
  }

  let value: Record<string, unknown> = stepConfig;
  for (const opKey of Object.keys(opsDecl)) {
    const op = (compileOps as any)[opKey] as DomainOpCompileAny | undefined;
    if (!op) {
      errors.push({
        code: "op.missing",
        path: `${path}/${opKey}`,
        message: `Missing op implementation for key "${opKey}"`,
        opKey,
        opId: (opsDecl as any)[opKey]?.id,
      });
      continue;
    }

    const envelope = value[opKey];
    if (envelope === undefined) continue;

    if (typeof (op as any).normalize === "function") {
      try {
        const next = (op as any).normalize(envelope, ctx);
        value = { ...value, [opKey]: next };
      } catch (err) {
        errors.push({
          code: "op.normalize.failed",
          path: `${path}/${opKey}`,
          message: err instanceof Error ? err.message : "op.normalize failed",
          opKey,
          opId: op.id,
        });
      }
    }
  }

  return { value, errors };
}

export function compileRecipeConfig<const TStages extends readonly any[]>(args: {
  env: Env;
  recipe: Readonly<{ stages: TStages }>;
  config: RecipeConfigInputOf<any> | null | undefined;
  opsById: Readonly<Record<string, DomainOpCompileAny>>;
}): CompiledRecipeConfigOf<any> {
  const errors: CompileErrorItem[] = [];
  const out: Record<string, Record<string, unknown>> = {};

  const env = args.env as Env;
  const recipe = args.recipe as Readonly<{ stages: readonly any[] }>;
  const config = (args.config ?? {}) as Record<string, unknown>;
  const opsById = args.opsById as Readonly<Record<string, DomainOpCompileAny>>;

  for (const stage of recipe.stages) {
    const stageId = stage.id as string;
    const stagePath = `/config/${stageId}`;

    const { value: stageConfig, errors: stageErrors } = normalizeStrict(
      stage.surfaceSchema as any,
      config[stageId],
      stagePath
    );
    if (stageErrors.length > 0) {
      errors.push(...stageErrors.map((e) => ({ ...e, stageId })));
      continue;
    }

    let internal: StageToInternalResult<string, unknown>;
    try {
      internal = stage.toInternal({ env, stageConfig }) as any;
    } catch (err) {
      errors.push({
        code: "stage.compile.failed",
        path: stagePath,
        message: err instanceof Error ? err.message : "stage.toInternal failed",
        stageId,
      });
      continue;
    }

    const stageOut: Record<string, unknown> = {};
    const { knobs, rawSteps } = internal;

    for (const step of stage.steps as readonly StepModuleAny[]) {
      const stepId = step.contract.id;
      const stepPath = `${stagePath}/${stepId}`;

      const { value: prefilled, errors: prefillErrors } = prefillOpDefaults(
        step as any,
        (rawSteps as any)[stepId],
        stepPath
      );
      if (prefillErrors.length > 0) {
        errors.push(...prefillErrors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      const { value: strict1, errors: strict1Errors } = normalizeStrict(
        step.contract.schema as any,
        prefilled,
        stepPath
      );
      if (strict1Errors.length > 0) {
        errors.push(...strict1Errors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      let normalized: unknown = strict1;

      if (typeof (step as any).normalize === "function") {
        let next: unknown;
        try {
          next = (step as any).normalize(normalized, { env, knobs });
        } catch (err) {
          errors.push({
            code: "step.normalize.failed",
            path: stepPath,
            message: err instanceof Error ? err.message : "step.normalize failed",
            stageId,
            stepId,
          });
          continue;
        }

        const { value: strict2, errors: strict2Errors } = normalizeStrict(
          step.contract.schema as any,
          next,
          stepPath
        );
        if (strict2Errors.length > 0) {
          errors.push(...strict2Errors.map((e) => ({ ...e, stageId, stepId })));
          errors.push({
            code: "normalize.not.shape-preserving",
            path: stepPath,
            message: "step.normalize returned a value that does not validate against the step schema",
            stageId,
            stepId,
          });
          continue;
        }
        normalized = strict2;
      }

      const { value: opNormalized, errors: opNormErrors } = normalizeOpsTopLevel(
        step as any,
        normalized as any,
        { env, knobs } as NormalizeCtx<Env, unknown>,
        opsById,
        stepPath
      );
      if (opNormErrors.length > 0) {
        errors.push(...opNormErrors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      const { value: strict3, errors: strict3Errors } = normalizeStrict(
        step.contract.schema as any,
        opNormalized,
        stepPath
      );
      if (strict3Errors.length > 0) {
        errors.push(...strict3Errors.map((e) => ({ ...e, stageId, stepId })));
        continue;
      }

      stageOut[stepId] = strict3;
    }

    out[stageId] = stageOut;
  }

  if (errors.length > 0) throw new RecipeCompileError(errors);
  return out as CompiledRecipeConfigOf<any>;
}


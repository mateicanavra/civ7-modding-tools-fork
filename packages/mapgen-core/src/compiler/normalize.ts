import type { TSchema } from "typebox";
import { Value } from "typebox/value";

import type { DomainOpCompileAny, OpsById } from "../authoring/bindings.js";
import { bindCompileOps, OpBindingError } from "../authoring/bindings.js";
import { buildOpEnvelopeSchema } from "../authoring/op/envelope.js";
import { applySchemaDefaults } from "../authoring/schema.js";
import type { StepOpsDecl } from "../authoring/step/ops.js";
import type { CompileErrorItem } from "./recipe-compile.js";

export type NormalizeCtx<TEnv = unknown, TKnobs = unknown> = Readonly<{ env: TEnv; knobs: TKnobs }>;

export type StepModuleAny = Readonly<{ contract?: Readonly<{ ops?: StepOpsDecl }> }>;

export class OpConfigInvalidError extends Error {
  readonly opId?: string;

  constructor(message: string, opId?: string) {
    super(message);
    this.name = "OpConfigInvalidError";
    this.opId = opId;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
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
  const normalizedInput = input ?? {};
  const typed = schema as { anyOf?: TSchema[]; oneOf?: TSchema[] };
  const unionCandidates = Array.isArray(typed.anyOf)
    ? typed.anyOf
    : Array.isArray(typed.oneOf)
      ? typed.oneOf
      : null;

  if (unionCandidates) {
    let best: { errors: number; converted: unknown; cleaned: unknown } | null = null;
    for (const candidate of unionCandidates) {
      const initial = applySchemaDefaults(candidate, normalizedInput);
      const cloned = Value.Clone(initial ?? {});
      const converted = Value.Default(candidate, cloned);
      const errorCount = Array.from(Value.Errors(candidate, converted)).length;
      const cleaned = Value.Clean(candidate, converted);
      if (!best || errorCount < best.errors) {
        best = { errors: errorCount, converted, cleaned };
        if (errorCount === 0) break;
      }
    }
    if (best) {
      return { converted: best.converted, cleaned: best.cleaned };
    }
  }

  const initial = applySchemaDefaults(schema, normalizedInput);
  const cloned = Value.Clone(initial ?? {});
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

  const value: Record<string, unknown> = {
    ...(rawStepConfig as Record<string, unknown> | undefined),
  };
  const errors: CompileErrorItem[] = [];

  const opsDecl = step.contract?.ops;
  if (!opsDecl) return { value, errors };

  for (const opKey of Object.keys(opsDecl)) {
    if (value[opKey] !== undefined) continue;
    const contract = opsDecl[opKey]!;
    const { defaultConfig } = buildOpEnvelopeSchema(contract.id, contract.strategies);
    value[opKey] = Value.Clone(defaultConfig);
  }

  return { value, errors };
}

export function normalizeOpsTopLevel(
  step: StepModuleAny,
  stepConfig: Record<string, unknown>,
  ctx: NormalizeCtx<any, any>,
  compileOpsById: OpsById<DomainOpCompileAny>,
  path: string
): { value: Record<string, unknown>; errors: CompileErrorItem[] } {
  const errors: CompileErrorItem[] = [];

  const opsDecl = step.contract?.ops;
  if (!opsDecl) return { value: stepConfig, errors };

  let compileOps: Record<string, DomainOpCompileAny>;
  try {
    compileOps = bindCompileOps(opsDecl, compileOpsById) as Record<string, DomainOpCompileAny>;
  } catch (err) {
    if (err instanceof OpBindingError) {
      errors.push({
        code: "op.missing",
        path: `${path}/${err.opKey}`,
        message: `Missing op implementation for key "${err.opKey}"`,
        opKey: err.opKey,
        opId: err.opId,
      });
    } else {
      errors.push({
        code: "op.missing",
        path,
        message: err instanceof Error ? err.message : "bindCompileOps failed",
      });
    }
    return { value: stepConfig, errors };
  }

  let value: Record<string, unknown> = stepConfig;
  for (const opKey of Object.keys(opsDecl)) {
    const contract = opsDecl[opKey]!;
    const op = compileOps[opKey];
    if (!op) {
      errors.push({
        code: "op.missing",
        path: `${path}/${opKey}`,
        message: `Missing op implementation for key "${opKey}"`,
        opKey,
        opId: contract.id,
      });
      continue;
    }

    const envelope = value[opKey];
    if (envelope === undefined) continue;

    if (typeof op.normalize === "function") {
      try {
        const next = op.normalize(envelope as any, ctx);
        value = { ...value, [opKey]: next };
      } catch (err) {
        if (err instanceof OpConfigInvalidError) {
          errors.push({
            code: "op.config.invalid",
            path: `${path}/${opKey}`,
            message: err.message,
            opKey,
            opId: op.id,
          });
        } else {
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
  }

  return { value, errors };
}

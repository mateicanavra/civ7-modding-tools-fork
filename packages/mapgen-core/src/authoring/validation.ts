import type { TSchema } from "typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export type ValidationError = Readonly<{
  path: string;
  message: string;
  code?: string;
}>;

export class OpValidationError extends Error {
  readonly opId: string;
  readonly errors: readonly ValidationError[];

  constructor(opId: string, errors: readonly ValidationError[]) {
    super(`[op.validate] Validation failed for "${opId}" (${errors.length} error(s))`);
    this.name = "OpValidationError";
    this.opId = opId;
    this.errors = errors;
  }
}

export type OpValidateOptions = Readonly<{
  validateOutput?: boolean;
  output?: unknown;
}>;

export type OpRunValidatedOptions = Readonly<{
  validateOutput?: boolean;
}>;

export type CustomValidateFn<Input, Config> = (input: Input, config: Config) => readonly ValidationError[];

type XRuntimeTypedArray = Readonly<{
  kind: "typed-array";
  ctor: string;
  shape?: Readonly<{
    kind: "grid";
    dims: readonly [string, string];
  }>;
}>;

type TypedArrayField = Readonly<{
  path: string;
  meta: XRuntimeTypedArray;
}>;

function joinPath(basePath: string, rawPath: string): string {
  const p = rawPath && rawPath.length > 0 ? rawPath : "/";
  if (!basePath || basePath === "/") return p;
  if (p === "/") return basePath;
  return `${basePath}${p}`;
}

const schemaCache = new WeakMap<TSchema, ReturnType<typeof TypeCompiler.Compile>>();

function getCompiler(schema: TSchema): ReturnType<typeof TypeCompiler.Compile> {
  const cached = schemaCache.get(schema);
  if (cached) return cached;
  const compiled = TypeCompiler.Compile(schema);
  schemaCache.set(schema, compiled);
  return compiled;
}

function formatSchemaErrors(schema: TSchema, value: unknown, basePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const checker = getCompiler(schema);
  for (const err of checker.Errors(value)) {
    const path =
      (err as { path?: string; instancePath?: string }).path ??
      (err as { instancePath?: string }).instancePath ??
      "";
    errors.push({
      path: joinPath(basePath, path),
      message: err.message,
    });
  }
  return errors;
}

function getXRuntimeTypedArray(schema: unknown): XRuntimeTypedArray | null {
  if (!schema || typeof schema !== "object") return null;
  const candidate = schema as { [k: string]: unknown };
  const meta = candidate["x-runtime"];
  if (!meta || typeof meta !== "object") return null;
  const typed = meta as { kind?: unknown; ctor?: unknown; shape?: unknown };
  if (typed.kind !== "typed-array") return null;
  if (typeof typed.ctor !== "string") return null;

  const shape = typed.shape;
  if (!shape) {
    return { kind: "typed-array", ctor: typed.ctor };
  }
  if (typeof shape !== "object") return null;
  const s = shape as { kind?: unknown; dims?: unknown };
  if (s.kind !== "grid") return null;
  if (!Array.isArray(s.dims) || s.dims.length !== 2) return null;
  if (typeof s.dims[0] !== "string" || typeof s.dims[1] !== "string") return null;
  return {
    kind: "typed-array",
    ctor: typed.ctor,
    shape: { kind: "grid", dims: [s.dims[0], s.dims[1]] },
  };
}

function collectTypedArrayFields(schema: unknown, basePath = ""): TypedArrayField[] {
  const fields: TypedArrayField[] = [];
  const meta = getXRuntimeTypedArray(schema);
  if (meta) {
    fields.push({ path: basePath || "/", meta });
    return fields;
  }

  if (!schema || typeof schema !== "object") return fields;
  const s = schema as { [k: string]: unknown };

  // Traverse object properties
  const props = s.properties;
  if (props && typeof props === "object" && !Array.isArray(props)) {
    for (const [key, child] of Object.entries(props as Record<string, unknown>)) {
      fields.push(...collectTypedArrayFields(child, `${basePath}/${key}`));
    }
  }

  // Traverse arrays
  if (s.type === "array" && s.items) {
    fields.push(...collectTypedArrayFields(s.items, `${basePath}/*`));
  }

  return fields;
}

function getAtPath(root: unknown, path: string): unknown {
  if (!path || path === "/") return root;
  if (!root || typeof root !== "object") return undefined;
  const parts = path.split("/").filter(Boolean);
  let current: any = root as any;
  for (const part of parts) {
    if (part === "*") return undefined;
    if (!current || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

function typedArrayCtorByName(name: string): (new (...args: any[]) => any) | null {
  switch (name) {
    case "Uint8Array":
      return Uint8Array;
    case "Int8Array":
      return Int8Array;
    case "Uint16Array":
      return Uint16Array;
    case "Int16Array":
      return Int16Array;
    case "Int32Array":
      return Int32Array;
    case "Float32Array":
      return Float32Array;
    default:
      return null;
  }
}

function tryComputeExpectedLength(
  ownerLabel: "/input" | "/output",
  owner: unknown,
  fallbackOwnerLabel: "/input" | "/output",
  fallbackOwner: unknown,
  dims: readonly [string, string]
): { expectedLength: number | null; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  const wFromOwner = owner && typeof owner === "object" ? (owner as any)[dims[0]] : undefined;
  const hFromOwner = owner && typeof owner === "object" ? (owner as any)[dims[1]] : undefined;
  const wFromFallback =
    fallbackOwner && typeof fallbackOwner === "object" ? (fallbackOwner as any)[dims[0]] : undefined;
  const hFromFallback =
    fallbackOwner && typeof fallbackOwner === "object" ? (fallbackOwner as any)[dims[1]] : undefined;

  const ownerHas = typeof wFromOwner === "number" && typeof hFromOwner === "number";

  const label = ownerHas ? ownerLabel : fallbackOwnerLabel;
  const wRaw = ownerHas ? wFromOwner : wFromFallback;
  const hRaw = ownerHas ? hFromOwner : hFromFallback;

  const w = typeof wRaw === "number" ? wRaw : Number.NaN;
  const h = typeof hRaw === "number" ? hRaw : Number.NaN;

  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    errors.push({
      path: `${label}/${dims[0]}`,
      message: `Missing or invalid ${dims[0]} for grid length validation`,
    });
    errors.push({
      path: `${label}/${dims[1]}`,
      message: `Missing or invalid ${dims[1]} for grid length validation`,
    });
    return { expectedLength: null, errors };
  }

  const wi = w | 0;
  const hi = h | 0;
  if (wi <= 0 || hi <= 0 || wi !== w || hi !== h) {
    errors.push({
      path: `${label}/${dims[0]}`,
      message: `${dims[0]} must be a positive integer`,
    });
    errors.push({
      path: `${label}/${dims[1]}`,
      message: `${dims[1]} must be a positive integer`,
    });
    return { expectedLength: null, errors };
  }

  return { expectedLength: wi * hi, errors };
}

function validateTypedArrays(
  schema: TSchema,
  value: unknown,
  basePath: string,
  fallbackForDims?: unknown
): ValidationError[] {
  const fields = collectTypedArrayFields(schema, "");
  if (fields.length === 0) return [];

  const errors: ValidationError[] = [];
  for (const field of fields) {
    const fieldValue = getAtPath(value, field.path);

    const ctor = typedArrayCtorByName(field.meta.ctor);
    if (!ctor) {
      errors.push({
        path: joinPath(basePath, field.path),
        message: `Unknown typed-array ctor "${field.meta.ctor}" (x-runtime)`,
        code: "typedArray.ctor.unknown",
      });
      continue;
    }

    if (!(fieldValue instanceof ctor)) {
      errors.push({
        path: joinPath(basePath, field.path),
        message: `Expected ${field.meta.ctor}`,
        code: "typedArray.type",
      });
      continue;
    }

    const shape = field.meta.shape;
    if (shape?.kind === "grid") {
      const { expectedLength, errors: lenErrors } = tryComputeExpectedLength(
        basePath as "/input" | "/output",
        value,
        "/input",
        fallbackForDims,
        shape.dims
      );
      errors.push(...lenErrors);
      if (expectedLength != null) {
        const actual = (fieldValue as { length: number }).length;
        if (actual !== expectedLength) {
          errors.push({
            path: joinPath(basePath, field.path),
            message: `Expected length ${expectedLength} (grid ${shape.dims[0]}×${shape.dims[1]}), got ${actual}`,
            code: "typedArray.length",
          });
        }
      }
    }
  }

  return errors;
}

export function validateOpCall<InputSchema extends TSchema, OutputSchema extends TSchema, ConfigSchema extends TSchema>(
  op: Readonly<{ id: string; input: InputSchema; output: OutputSchema; config: ConfigSchema }>,
  input: unknown,
  config: unknown,
  customValidate?: CustomValidateFn<any, any> | undefined,
  options?: OpValidateOptions
): { ok: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // 1) Schema checks
  errors.push(...formatSchemaErrors(op.input, input, "/input"));
  errors.push(...formatSchemaErrors(op.config, config, "/config"));

  // 2) Typed array checks (constructor + length coupling)
  errors.push(...validateTypedArrays(op.input, input, "/input"));

  // 3) Custom semantic checks
  if (customValidate) {
    errors.push(...(customValidate(input as any, config as any) as ValidationError[]));
  }

  // Optional output validation (schema + typed arrays)
  if (options?.validateOutput) {
    const output = options.output;
    errors.push(...formatSchemaErrors(op.output, output, "/output"));
    errors.push(...validateTypedArrays(op.output, output, "/output", input));
  }

  return { ok: errors.length === 0, errors };
}

export function validateOpOutput<InputSchema extends TSchema, OutputSchema extends TSchema>(
  op: Readonly<{ input: InputSchema; output: OutputSchema }>,
  input: unknown,
  output: unknown
): { ok: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  errors.push(...formatSchemaErrors(op.output, output, "/output"));
  errors.push(...validateTypedArrays(op.output, output, "/output", input));
  return { ok: errors.length === 0, errors };
}

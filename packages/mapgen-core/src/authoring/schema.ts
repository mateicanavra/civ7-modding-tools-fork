import { Type, type Static, type TSchema } from "typebox";

import type { DomainOpSchema } from "./op/schema.js";

type SchemaWithDefaults = TSchema & {
  default?: unknown;
  type?: string;
  properties?: Record<string, TSchema>;
  items?: TSchema | TSchema[];
  anyOf?: TSchema[];
  oneOf?: TSchema[];
  allOf?: TSchema[];
  not?: TSchema;
  additionalProperties?: boolean | TSchema;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneDefault(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function schemaProvidesDefaults(schema: TSchema): boolean {
  const typed = schema as SchemaWithDefaults;
  if (typed.default !== undefined) return true;
  if (typed.type === "object") {
    const props = typed.properties ?? {};
    return Object.values(props).some(schemaProvidesDefaults);
  }
  if (typed.items) {
    const items = Array.isArray(typed.items) ? typed.items : [typed.items];
    return items.some(schemaProvidesDefaults);
  }
  if (Array.isArray(typed.anyOf)) return typed.anyOf.some(schemaProvidesDefaults);
  if (Array.isArray(typed.oneOf)) return typed.oneOf.some(schemaProvidesDefaults);
  if (Array.isArray(typed.allOf)) return typed.allOf.some(schemaProvidesDefaults);
  if (typed.not) return schemaProvidesDefaults(typed.not);
  return false;
}

function enforceSchemaConventions(schema: TSchema, path: string): void {
  const typed = schema as SchemaWithDefaults;
  if (typed.type === "object") {
    const props = typed.properties ?? {};
    const hasPropertyDefaults = Object.values(props).some(schemaProvidesDefaults);
    if (typed.default !== undefined && hasPropertyDefaults) {
      throw new Error(
        `schema(${path}) defines an object default while properties already declare defaults`
      );
    }
    if (typed.additionalProperties === undefined) {
      typed.additionalProperties = false;
    }
    for (const [key, propSchema] of Object.entries(props)) {
      enforceSchemaConventions(propSchema, `${path}.${key}`);
    }
  }

  if (typed.items) {
    const items = Array.isArray(typed.items) ? typed.items : [typed.items];
    items.forEach((item, index) => enforceSchemaConventions(item, `${path}[${index}]`));
  }
  if (Array.isArray(typed.anyOf)) {
    typed.anyOf.forEach((item, index) => enforceSchemaConventions(item, `${path}.anyOf[${index}]`));
  }
  if (Array.isArray(typed.oneOf)) {
    typed.oneOf.forEach((item, index) => enforceSchemaConventions(item, `${path}.oneOf[${index}]`));
  }
  if (Array.isArray(typed.allOf)) {
    typed.allOf.forEach((item, index) => enforceSchemaConventions(item, `${path}.allOf[${index}]`));
  }
  if (typed.not) {
    enforceSchemaConventions(typed.not, `${path}.not`);
  }
}

export function applySchemaConventions(schema: TSchema, path: string): TSchema {
  enforceSchemaConventions(schema, path);
  return schema;
}

export function buildSchemaDefaults(schema: TSchema): unknown {
  const typed = schema as SchemaWithDefaults;
  if (typed.type === "object") {
    const props = typed.properties ?? {};
    const out: Record<string, unknown> = {};
    let hasDefaults = false;

    if (typed.default !== undefined) {
      return cloneDefault(typed.default);
    }

    for (const [key, propSchema] of Object.entries(props)) {
      const value = buildSchemaDefaults(propSchema);
      if (value !== undefined) {
        out[key] = value;
        hasDefaults = true;
      }
    }

    return hasDefaults ? out : undefined;
  }

  if (typed.default !== undefined) return cloneDefault(typed.default);

  return undefined;
}

export function applySchemaDefaults<T extends TSchema>(
  schema: T,
  input: unknown
): Static<T> {
  const typed = schema as SchemaWithDefaults;
  if (input == null) {
    const defaults = buildSchemaDefaults(typed);
    return (defaults ?? (typed.type === "object" ? {} : input)) as Static<T>;
  }

  if (typed.type === "object") {
    if (!isPlainObject(input)) return input as Static<T>;
    const props = typed.properties ?? {};
    const out: Record<string, unknown> = { ...input };

    for (const [key, propSchema] of Object.entries(props)) {
      if (out[key] === undefined) {
        const value = buildSchemaDefaults(propSchema);
        if (value !== undefined) out[key] = value;
        continue;
      }

      const next = applySchemaDefaults(propSchema, out[key]);
      if (next !== out[key]) {
        out[key] = next;
      }
    }

    return out as Static<T>;
  }

  return input as Static<T>;
}

/**
 * Helper to define the canonical op schema bundle shape: `Type.Object({ input, config, output })`.
 *
 * TypeBox object inference can be lossy across package boundaries. This helper pins the schema's
 * TypeScript type so callers can reuse `schema.properties.*` without re-exporting per-sub-schema
 * types.
 */
export function defineOpSchema<
  const InputSchema extends TSchema,
  const ConfigSchema extends TSchema,
  const OutputSchema extends TSchema,
>(
  schemas: Readonly<{ input: InputSchema; config: ConfigSchema; output: OutputSchema }>,
  options?: Record<string, unknown>
): DomainOpSchema<InputSchema, ConfigSchema, OutputSchema> {
  return Type.Object(schemas as any, options as any) as any;
}

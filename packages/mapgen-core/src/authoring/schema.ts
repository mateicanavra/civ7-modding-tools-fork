import { Type, type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

import type { DomainOpSchema } from "./op/schema.js";

export function applySchemaDefaults<T extends TSchema>(
  schema: T,
  input: unknown
): Static<T> {
  const cloned = Value.Clone(input ?? {});
  const defaulted = Value.Default(schema, cloned);
  return Value.Clean(schema, defaulted) as Static<T>;
}

/**
 * Helper to define the canonical op schema bundle shape: `Type.Object({ input, config, output })`.
 *
 * TypeBox object inference can be lossy across package boundaries. This helper pins the schema's
 * TypeScript type so `createOp({ schema, ... })` can infer `run(input, config)` types from the
 * schema bundle without callers spelling out `schema.properties.*` or exporting per-sub-schema
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

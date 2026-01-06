import { type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

export function applySchemaDefaults<T extends TSchema>(
  schema: T,
  input: unknown
): Static<T> {
  const cloned = Value.Clone(input ?? {});
  const defaulted = Value.Default(schema, cloned);
  return Value.Clean(schema, defaulted) as Static<T>;
}

import type { TSchema } from "typebox";
import { Value } from "typebox/value";

export function buildDefaultConfigValue(schema: TSchema): unknown {
  const defaulted = Value.Default(schema, {});
  const converted = Value.Convert(schema, defaulted);
  return Value.Clean(schema, converted);
}

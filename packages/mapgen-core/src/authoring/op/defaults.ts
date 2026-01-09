import type { TSchema } from "typebox";
import { buildSchemaDefaults } from "../schema.js";

export function buildDefaultConfigValue(schema: TSchema): unknown {
  const defaults = buildSchemaDefaults(schema);
  return defaults === undefined ? {} : defaults;
}

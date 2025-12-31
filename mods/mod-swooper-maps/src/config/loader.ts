// Ensure environments without Web TextEncoder (e.g., Civ7 embedded V8) have a compatible implementation.
import "@swooper/mapgen-core/polyfills/text-encoder";
import { Value } from "typebox/value";

import { MapGenConfigSchema, INTERNAL_METADATA_KEY, type MapGenConfig } from "@mapgen/config/schema";

export interface ParseResult {
  success: boolean;
  config?: MapGenConfig;
  errors?: Array<{ path: string; message: string }>;
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

  // Union schemas: choose the branch that yields the fewest unknown keys.
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

  // Object schemas with explicit properties: enforce strict keys.
  const properties = isPlainObject(schema.properties) ? (schema.properties as Record<string, unknown>) : null;
  const additionalProperties = schema.additionalProperties;

  const errors: Array<{ path: string; message: string }> = [];

  if (properties && additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!(key in properties)) {
        errors.push({
          path: `${path}/${key}`,
          message: "Unknown config key",
        });
        continue;
      }
      errors.push(...findUnknownKeyErrors(properties[key], value[key], `${path}/${key}`));
    }
    return errors;
  }

  // Record schemas are represented as patternProperties; keys are allowed, but
  // their values may still be object-validated.
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

  // Array schemas: validate elements.
  if (schema.type === "array" && schema.items && Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      errors.push(...findUnknownKeyErrors(schema.items, value[i], `${path}/${String(i)}`));
    }
    return errors;
  }

  return [];
}

function buildConfig(input: unknown): { converted: unknown; cleaned: MapGenConfig } {
  const cloned = Value.Clone(input ?? {});
  const defaulted = Value.Default(MapGenConfigSchema, cloned);
  const converted = Value.Convert(MapGenConfigSchema, defaulted);
  const cleaned = Value.Clean(MapGenConfigSchema, converted);
  return { converted, cleaned: cleaned as MapGenConfig };
}

function formatErrors(value: unknown): { path: string; message: string }[] {
  const formattedErrors: Array<{ path: string; message: string }> = [];

  for (const err of Value.Errors(MapGenConfigSchema, value)) {
    const path = (err as { path?: string; instancePath?: string }).path ?? (err as { instancePath?: string }).instancePath;
    formattedErrors.push({
      path: path && path.length > 0 ? path : "/",
      message: err.message,
    });
  }

  return formattedErrors;
}

/**
 * Parse and validate raw config, applying defaults and throwing on errors.
 */
export function parseConfig(input: unknown): MapGenConfig {
  // Detect unknown keys against the raw input object before any coercion/cleaning.
  const unknownKeyErrors = findUnknownKeyErrors(MapGenConfigSchema, input ?? {}, "");

  const { converted, cleaned } = buildConfig(input);

  // Validate before Value.Clean() so that unknown keys (additionalProperties)
  // are not silently dropped.
  const errors = [...unknownKeyErrors, ...formatErrors(converted)];
  if (errors.length > 0) {
    const messages = errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    const error = new Error(`Invalid MapGenConfig: ${messages}`);
    (error as Error & { errors?: typeof errors }).errors = errors;
    throw error;
  }

  return cleaned;
}

/**
 * Safe parse that returns structured errors instead of throwing.
 */
export function safeParseConfig(input: unknown): ParseResult {
  try {
    const config = parseConfig(input);
    return { success: true, config };
  } catch (err) {
    if (err && typeof err === "object" && "errors" in (err as Record<string, unknown>)) {
      return { success: false, errors: (err as { errors: Array<{ path: string; message: string }> }).errors };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errors: [{ path: "", message }] };
  }
}

/**
 * Return a fully defaulted config using the schema defaults.
 */
export function getDefaultConfig(): MapGenConfig {
  return parseConfig({});
}

/**
 * Export JSON schema for external tooling (cloned to avoid mutation).
 * Includes internal fields; use getPublicJsonSchema() for the public API surface.
 */
export function getJsonSchema(): object {
  return JSON.parse(JSON.stringify(MapGenConfigSchema));
}

// ────────────────────────────────────────────────────────────────────────────
// Public schema guard
// ────────────────────────────────────────────────────────────────────────────

/**
 * Recursively filter internal fields from a JSON Schema clone.
 * Removes properties marked with xInternal: true and cleans up empty containers.
 */
function filterInternalFields(schema: Record<string, unknown>): Record<string, unknown> | null {
  // Check if this node is marked internal
  if (schema[INTERNAL_METADATA_KEY] === true) {
    return null; // Signal to parent that this should be removed
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    // Skip the internal marker itself from output
    if (key === INTERNAL_METADATA_KEY) {
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const filtered = filterInternalFields(value as Record<string, unknown>);
      if (filtered !== null) {
        result[key] = filtered;
      }
      // If filtered is null, we skip adding this key (removes internal fields)
    } else if (Array.isArray(value)) {
      // Process arrays (e.g., anyOf, oneOf, allOf)
      const filteredArray = value
        .map((item) => {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            return filterInternalFields(item as Record<string, unknown>);
          }
          return item;
        })
        .filter((item) => item !== null);
      result[key] = filteredArray;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Export a filtered JSON Schema that excludes internal fields.
 * Use this for public tooling, editor integrations, and documentation.
 *
 * Internal fields are those marked with `xInternal: true` in the schema metadata.
 * They represent engine plumbing not intended as stable mod API.
 */
export function getPublicJsonSchema(): object {
  const fullSchema = JSON.parse(JSON.stringify(MapGenConfigSchema));
  const filtered = filterInternalFields(fullSchema);
  return filtered ?? {};
}

import { Compile } from "typebox/compile";
import { Value } from "typebox/value";

import { MapGenConfigSchema, INTERNAL_METADATA_KEY, type MapGenConfig } from "./schema";

const compiled = Compile(MapGenConfigSchema);

export interface ParseResult {
  success: boolean;
  config?: MapGenConfig;
  errors?: Array<{ path: string; message: string }>;
}

function buildConfig(input: unknown): MapGenConfig {
  const cloned = Value.Clone(input ?? {});
  const defaulted = Value.Default(MapGenConfigSchema, cloned);
  const converted = Value.Convert(MapGenConfigSchema, defaulted);
  const cleaned = Value.Clean(MapGenConfigSchema, converted);
  return cleaned as MapGenConfig;
}

function formatErrors(cleaned: MapGenConfig): { path: string; message: string }[] {
  return compiled.Errors(cleaned).map((err) => ({
    path: err.instancePath || "/",
    message: err.message,
  }));
}

/**
 * Parse and validate raw config, applying defaults and throwing on errors.
 */
export function parseConfig(input: unknown): MapGenConfig {
  const cleaned = buildConfig(input);

  if (!compiled.Check(cleaned)) {
    const errors = formatErrors(cleaned);
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

/**
 * Engine surface introspection helpers.
 *
 * These utilities dump the available methods on Civ7 global objects like
 * GameplayMap and TerrainBuilder APIs. Useful for validating the actual runtime
 * API surface during engine integration and migrations.
 *
 * All helpers are no-op when DEV.ENABLED is false.
 */

import { DEV } from "@mapgen/dev/flags.js";
import { devLogPrefixed } from "@mapgen/dev/logging.js";

/**
 * Collect a sorted list of own + prototype property names for an object.
 */
function collectApiKeys(obj: unknown): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  let current: unknown = obj;
  // Walk the prototype chain while we have a non-null object
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  while (current && typeof current === "object") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    for (const name of Object.getOwnPropertyNames(current)) {
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    current = Object.getPrototypeOf(current);
  }

  names.sort();
  return names;
}

/**
 * Log the API surface for a single engine object (e.g., GameplayMap).
 */
function logEngineObjectApi(label: string, obj: unknown): void {
  if (!DEV.ENABLED) return;

  if (!obj || (typeof obj !== "object" && typeof obj !== "function")) {
    devLogPrefixed(
      "ENGINE_API",
      `${label} is not an object/function (typeof=${typeof obj})`
    );
    return;
  }

  const apiKeys = collectApiKeys(obj);
  devLogPrefixed("ENGINE_API", `${label} API (${apiKeys.length} keys)`);

  for (const name of apiKeys) {
    let kind = "unknown";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (obj as any)[name];
      kind = typeof value === "function" ? `fn(${value.length})` : typeof value;
    } catch {
      kind = "unknown";
    }
    devLogPrefixed("ENGINE_API", `  ${label}.${name}: ${kind}`);
  }
}

let engineApiLogged = false;

/**
 * Log the engine surface APIs (GameplayMap, TerrainBuilder, etc.) once per
 * script context. Safe to call multiple times; subsequent calls are no-op.
 */
export function logEngineSurfaceApisOnce(): void {
  if (!DEV.ENABLED) return;
  if (engineApiLogged) return;
  engineApiLogged = true;

  try {
    const globalAny = globalThis as unknown as Record<string, unknown>;

    const gameplayMap = globalAny.GameplayMap;
    const terrainBuilder = globalAny.TerrainBuilder;
    const fractalBuilder = globalAny.FractalBuilder;
    const areaBuilder = globalAny.AreaBuilder;

    if (!gameplayMap && !terrainBuilder && !fractalBuilder && !areaBuilder) {
      devLogPrefixed(
        "ENGINE_API",
        "GameplayMap, TerrainBuilder, FractalBuilder, and AreaBuilder are not defined in global scope"
      );
      return;
    }

    if (gameplayMap) {
      logEngineObjectApi("GameplayMap", gameplayMap);
    } else {
      devLogPrefixed("ENGINE_API", "GameplayMap is not defined");
    }

    if (terrainBuilder) {
      logEngineObjectApi("TerrainBuilder", terrainBuilder);
    } else {
      devLogPrefixed("ENGINE_API", "TerrainBuilder is not defined");
    }

    if (fractalBuilder) {
      logEngineObjectApi("FractalBuilder", fractalBuilder);
    } else {
      devLogPrefixed("ENGINE_API", "FractalBuilder is not defined");
    }

    if (areaBuilder) {
      logEngineObjectApi("AreaBuilder", areaBuilder);
    } else {
      devLogPrefixed("ENGINE_API", "AreaBuilder is not defined");
    }
  } catch (err) {
    devLogPrefixed("ENGINE_API", "Failed to introspect engine APIs", err);
  }
}

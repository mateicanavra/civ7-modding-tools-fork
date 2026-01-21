import type { EngineAdapter } from "@civ7/adapter";

import type { BiomeEngineBindings, BiomeSymbol } from "@mapgen/domain/ecology";
import { BIOME_SYMBOL_ORDER } from "@mapgen/domain/ecology";

const DEFAULT_ENGINE_BINDINGS: Record<BiomeSymbol, string> = Object.freeze({
  snow: "BIOME_TUNDRA",
  tundra: "BIOME_TUNDRA",
  boreal: "BIOME_TUNDRA",
  temperateDry: "BIOME_PLAINS",
  temperateHumid: "BIOME_GRASSLAND",
  tropicalSeasonal: "BIOME_GRASSLAND",
  tropicalRainforest: "BIOME_TROPICAL",
  desert: "BIOME_DESERT",
});

const DEFAULT_MARINE_BINDING = "BIOME_MARINE";

export interface ResolvedEngineBiomeIds {
  land: Record<BiomeSymbol, number>;
  marine: number;
}

/**
 * Resolves engine biome globals for symbols and the marine biome id.
 */
export function resolveEngineBiomeIds(
  adapter: EngineAdapter,
  bindings: BiomeEngineBindings = {}
): ResolvedEngineBiomeIds {
  const resolved: Partial<Record<BiomeSymbol, number>> = {};

  for (const symbol of BIOME_SYMBOL_ORDER) {
    const key = bindings[symbol] ?? DEFAULT_ENGINE_BINDINGS[symbol];
    const resolvedId = adapter.getBiomeGlobal(key);
    if (typeof resolvedId !== "number" || Number.isNaN(resolvedId)) {
      throw new Error(`resolveEngineBiomeIds: missing biome global "${key}" for symbol "${symbol}"`);
    }
    resolved[symbol] = resolvedId;
  }

  const marineKey = bindings.marine ?? DEFAULT_MARINE_BINDING;
  const marineId = adapter.getBiomeGlobal(marineKey);
  if (typeof marineId !== "number" || Number.isNaN(marineId)) {
    throw new Error(`resolveEngineBiomeIds: missing biome global "${marineKey}" for marine`);
  }

  return { land: resolved as Record<BiomeSymbol, number>, marine: marineId };
}

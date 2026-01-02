import type { EngineAdapter } from "@civ7/adapter";
import { Type, type Static } from "typebox";

import type { BiomeSymbol } from "./types.js";

export const BiomeEngineBindingsSchema = Type.Object(
  {
    snow: Type.Optional(Type.String({ default: "BIOME_SNOW" })),
    tundra: Type.Optional(Type.String({ default: "BIOME_TUNDRA" })),
    boreal: Type.Optional(Type.String({ default: "BIOME_TUNDRA" })),
    temperateDry: Type.Optional(Type.String({ default: "BIOME_PLAINS" })),
    temperateHumid: Type.Optional(Type.String({ default: "BIOME_GRASSLAND" })),
    tropicalSeasonal: Type.Optional(Type.String({ default: "BIOME_GRASSLAND" })),
    tropicalRainforest: Type.Optional(Type.String({ default: "BIOME_TROPICAL" })),
    desert: Type.Optional(Type.String({ default: "BIOME_DESERT" })),
  },
  { additionalProperties: false, default: {} }
);

export type BiomeEngineBindings = Static<typeof BiomeEngineBindingsSchema>;

export const DEFAULT_ENGINE_BINDINGS: Record<BiomeSymbol, string> = Object.freeze({
  snow: "BIOME_SNOW",
  tundra: "BIOME_TUNDRA",
  boreal: "BIOME_TUNDRA",
  temperateDry: "BIOME_PLAINS",
  temperateHumid: "BIOME_GRASSLAND",
  tropicalSeasonal: "BIOME_GRASSLAND",
  tropicalRainforest: "BIOME_TROPICAL",
  desert: "BIOME_DESERT",
});

export function resolveEngineBiomeIds(
  adapter: EngineAdapter,
  bindings: BiomeEngineBindings = {}
): Record<BiomeSymbol, number> {
  const resolved: Partial<Record<BiomeSymbol, number>> = {};

  for (const [symbol, globalId] of Object.entries(DEFAULT_ENGINE_BINDINGS)) {
    const castSymbol = symbol as BiomeSymbol;
    const key = bindings[castSymbol] ?? globalId;
    const resolvedId = adapter.getBiomeGlobal(key);
    if (typeof resolvedId !== "number" || Number.isNaN(resolvedId)) {
      throw new Error(`resolveEngineBiomeIds: missing biome global "${key}" for symbol "${symbol}"`);
    }
    resolved[castSymbol] = resolvedId;
  }

  return resolved as Record<BiomeSymbol, number>;
}

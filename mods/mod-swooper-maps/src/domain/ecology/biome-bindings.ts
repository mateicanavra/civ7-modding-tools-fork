import type { EngineAdapter } from "@civ7/adapter";
import { Type, type Static } from "typebox";

import { BIOME_SYMBOL_ORDER, type BiomeSymbol } from "./types.js";

/**
 * Bindings from internal biome symbols to Civ7 engine biome globals.
 * These values are resolved during the biomes step to populate `field:biomeId`,
 * which downstream feature placement and engine validity checks depend on.
 */
export const BiomeEngineBindingsSchema = Type.Object(
  {
    /** Engine biome global used for permanent snow/ice biomes (written to field:biomeId). */
    snow: Type.Optional(
      Type.String({
        description: "Engine biome global used for permanent snow/ice biomes.",
        default: "BIOME_TUNDRA",
      })
    ),
    /** Engine biome global used for tundra (cold, sparse vegetation). */
    tundra: Type.Optional(
      Type.String({
        description: "Engine biome global used for tundra (cold, sparse vegetation).",
        default: "BIOME_TUNDRA",
      })
    ),
    /** Engine biome global used for boreal forests (cold conifers). */
    boreal: Type.Optional(
      Type.String({
        description: "Engine biome global used for boreal forests (cold conifers).",
        default: "BIOME_TUNDRA",
      })
    ),
    /** Engine biome global used for dry temperate grasslands/steppes. */
    temperateDry: Type.Optional(
      Type.String({
        description: "Engine biome global used for dry temperate grasslands/steppes.",
        default: "BIOME_PLAINS",
      })
    ),
    /** Engine biome global used for humid temperate plains/forests. */
    temperateHumid: Type.Optional(
      Type.String({
        description: "Engine biome global used for humid temperate plains/forests.",
        default: "BIOME_GRASSLAND",
      })
    ),
    /** Engine biome global used for seasonal tropical savannas. */
    tropicalSeasonal: Type.Optional(
      Type.String({
        description: "Engine biome global used for seasonal tropical savannas.",
        default: "BIOME_GRASSLAND",
      })
    ),
    /** Engine biome global used for tropical rainforest zones. */
    tropicalRainforest: Type.Optional(
      Type.String({
        description: "Engine biome global used for tropical rainforest zones.",
        default: "BIOME_TROPICAL",
      })
    ),
    /** Engine biome global used for hot/cold desert basins. */
    desert: Type.Optional(
      Type.String({
        description: "Engine biome global used for hot/cold desert basins.",
        default: "BIOME_DESERT",
      })
    ),
    /** Engine biome global used for ocean and coastal water tiles (water tiles must resolve to BIOME_MARINE). */
    marine: Type.Optional(
      Type.String({
        description: "Engine biome global used for ocean and coastal water tiles.",
        default: "BIOME_MARINE",
      })
    ),
  },
  {
    additionalProperties: false,
    default: {},
    description:
      "Mappings from biome symbols to Civ7 engine biome globals (used to populate field:biomeId).",
  }
);

export type BiomeEngineBindings = Static<typeof BiomeEngineBindingsSchema>;

export const DEFAULT_ENGINE_BINDINGS: Record<BiomeSymbol, string> = Object.freeze({
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

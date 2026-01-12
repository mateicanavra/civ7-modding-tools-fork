import type { BiomeSymbol } from "@mapgen/domain/ecology/types.js";

const BIOME_LOOKUP: Record<
  "polar" | "cold" | "temperate" | "tropical",
  Record<"arid" | "semiArid" | "subhumid" | "humid" | "perhumid", BiomeSymbol>
> = {
  polar: {
    arid: "snow",
    semiArid: "tundra",
    subhumid: "tundra",
    humid: "snow",
    perhumid: "snow",
  },
  cold: {
    arid: "desert",
    semiArid: "tundra",
    subhumid: "boreal",
    humid: "boreal",
    perhumid: "boreal",
  },
  temperate: {
    arid: "desert",
    semiArid: "temperateDry",
    subhumid: "temperateHumid",
    humid: "temperateHumid",
    perhumid: "temperateHumid",
  },
  tropical: {
    arid: "desert",
    semiArid: "tropicalSeasonal",
    subhumid: "tropicalSeasonal",
    humid: "tropicalRainforest",
    perhumid: "tropicalRainforest",
  },
};

/**
 * Looks up the biome symbol for a temperature and moisture zone pair.
 */
export function biomeSymbolForZones(
  tempZone: "polar" | "cold" | "temperate" | "tropical",
  moistureZone: "arid" | "semiArid" | "subhumid" | "humid" | "perhumid"
): BiomeSymbol {
  return BIOME_LOOKUP[tempZone][moistureZone];
}

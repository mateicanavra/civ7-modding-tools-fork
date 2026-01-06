import type { BiomeSymbol } from "@mapgen/domain/ecology/types.js";
import type { TempZone } from "./temperature.js";
import type { MoistureZone } from "./moisture.js";

const BIOME_LOOKUP: Record<TempZone, Record<MoistureZone, BiomeSymbol>> = {
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

export function biomeSymbolForZones(tempZone: TempZone, moistureZone: MoistureZone): BiomeSymbol {
  return BIOME_LOOKUP[tempZone][moistureZone];
}

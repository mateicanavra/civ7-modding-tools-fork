import type { EngineAdapter } from "@civ7/adapter";
import type { BiomeGlobals } from "@mapgen/domain/ecology/biomes/types.js";

export function resolveBiomeGlobals(adapter: EngineAdapter): BiomeGlobals {
  return {
    tundra: adapter.getBiomeGlobal("BIOME_TUNDRA"),
    tropical: adapter.getBiomeGlobal("BIOME_TROPICAL"),
    grassland: adapter.getBiomeGlobal("BIOME_GRASSLAND"),
    plains: adapter.getBiomeGlobal("BIOME_PLAINS"),
    desert: adapter.getBiomeGlobal("BIOME_DESERT"),
    snow: adapter.getBiomeGlobal("BIOME_SNOW"),
  };
}

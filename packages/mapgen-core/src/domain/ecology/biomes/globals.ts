import type { EngineAdapter } from "@civ7/adapter";
import type { BiomeGlobals } from "./types.js";

export function resolveBiomeGlobals(adapter: EngineAdapter): BiomeGlobals {
  return {
    tundra: adapter.getBiomeGlobal("tundra"),
    tropical: adapter.getBiomeGlobal("tropical"),
    grassland: adapter.getBiomeGlobal("grassland"),
    plains: adapter.getBiomeGlobal("plains"),
    desert: adapter.getBiomeGlobal("desert"),
    snow: adapter.getBiomeGlobal("snow"),
  };
}


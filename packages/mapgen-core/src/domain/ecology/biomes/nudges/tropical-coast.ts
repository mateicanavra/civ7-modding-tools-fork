import type { EngineAdapter } from "@civ7/adapter";
import type { BiomeGlobals } from "@mapgen/domain/ecology/biomes/types.js";
import { isCoastalLand } from "@mapgen/domain/ecology/biomes/coastal.js";

export function applyTropicalCoastBias(
  adapter: EngineAdapter,
  globals: BiomeGlobals,
  x: number,
  y: number,
  width: number,
  height: number,
  latAbs: number,
  rainfall: number,
  cfg: { latMax: number; rainMin: number }
): void {
  if (latAbs < cfg.latMax && isCoastalLand(adapter, x, y, width, height) && rainfall > cfg.rainMin) {
    adapter.setBiomeType(x, y, globals.tropical);
  }
}


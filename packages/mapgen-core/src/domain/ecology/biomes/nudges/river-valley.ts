import type { EngineAdapter } from "@civ7/adapter";
import type { BiomeGlobals } from "@mapgen/domain/ecology/biomes/types.js";

export function applyRiverValleyGrasslandBias(
  adapter: EngineAdapter,
  globals: BiomeGlobals,
  x: number,
  y: number,
  width: number,
  riverAdjacency: Uint8Array,
  latAbs: number,
  rainfall: number,
  cfg: { latMax: number; rainMin: number }
): void {
  const idxValue = y * width + x;
  if (riverAdjacency[idxValue] === 1 && rainfall > cfg.rainMin && latAbs < cfg.latMax) {
    adapter.setBiomeType(x, y, globals.grassland);
  }
}


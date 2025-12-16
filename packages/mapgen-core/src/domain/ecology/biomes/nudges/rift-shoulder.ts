import type { EngineAdapter } from "@civ7/adapter";
import type { BiomeGlobals } from "../types.js";

export function applyRiftShoulderBias(
  adapter: EngineAdapter,
  globals: BiomeGlobals,
  x: number,
  y: number,
  latAbs: number,
  rainfall: number,
  story: { riftShoulder: Set<string> },
  cfg: { grasslandLatMax: number; grasslandRainMin: number; tropicalLatMax: number; tropicalRainMin: number }
): void {
  const key = `${x},${y}`;
  if (!story.riftShoulder.has(key)) return;

  if (latAbs < cfg.grasslandLatMax && rainfall > cfg.grasslandRainMin) {
    adapter.setBiomeType(x, y, globals.grassland);
  } else if (latAbs < cfg.tropicalLatMax && rainfall > cfg.tropicalRainMin) {
    adapter.setBiomeType(x, y, globals.tropical);
  }
}


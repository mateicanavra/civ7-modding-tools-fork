import type { EngineAdapter } from "@civ7/adapter";
import type { BiomeGlobals } from "../types.js";

export function applyTundraRestraint(
  adapter: EngineAdapter,
  globals: BiomeGlobals,
  x: number,
  y: number,
  latAbs: number,
  elevation: number,
  rainfall: number,
  cfg: { latMin: number; elevMin: number; rainMax: number }
): boolean {
  if ((latAbs > cfg.latMin || elevation > cfg.elevMin) && rainfall < cfg.rainMax) {
    adapter.setBiomeType(x, y, globals.tundra);
    return true;
  }
  return false;
}


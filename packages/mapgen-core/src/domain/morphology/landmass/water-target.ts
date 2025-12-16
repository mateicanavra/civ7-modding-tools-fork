import { clampPct } from "../../../lib/math/index.js";
import type { LandmassConfig } from "./types.js";

export function computeTargetLandTiles(
  tileCount: number,
  landmassCfg: LandmassConfig
): { waterPct: number; targetLandTiles: number } {
  const baseWaterPct = clampPct(landmassCfg.baseWaterPercent ?? 60, 0, 100, 60);
  const waterScalar =
    clampPct(
      Number.isFinite(landmassCfg.waterScalar) ? landmassCfg.waterScalar! * 100 : 100,
      25,
      175,
      100
    ) / 100;
  const waterPct = clampPct(baseWaterPct * waterScalar, 0, 100, baseWaterPct);
  const totalTiles = tileCount || 1;
  const targetLandTiles = Math.max(
    1,
    Math.min(totalTiles - 1, Math.round(totalTiles * (1 - waterPct / 100)))
  );

  return { waterPct, targetLandTiles };
}

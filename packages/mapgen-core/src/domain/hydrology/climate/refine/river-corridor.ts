import type { ClimateRuntime } from "../types.js";

export function applyRiverCorridorRefinement(
  width: number,
  height: number,
  runtime: ClimateRuntime,
  refineCfg: Record<string, unknown>,
  inBounds: (x: number, y: number) => boolean
): void {
  const { adapter, readRainfall, writeRainfall } = runtime;

  const riverCorridor = ((refineCfg.riverCorridor || {}) as Record<string, number>) || {};
  const lowBasinCfg = ((refineCfg.lowBasin || {}) as Record<string, number>) || {};

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      let rf = readRainfall(x, y);
      const elev = adapter.getElevation(x, y);

      if (adapter.isAdjacentToRivers(x, y, 1)) {
        rf +=
          elev < 250
            ? (riverCorridor?.lowlandAdjacencyBonus ?? 14)
            : (riverCorridor?.highlandAdjacencyBonus ?? 10);
      }

      let lowBasinClosed = true;
      const basinRadius = lowBasinCfg?.radius ?? 2;

      for (let dy = -basinRadius; dy <= basinRadius && lowBasinClosed; dy++) {
        for (let dx = -basinRadius; dx <= basinRadius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (inBounds(nx, ny)) {
            if (adapter.getElevation(nx, ny) < elev + 20) {
              lowBasinClosed = false;
              break;
            }
          }
        }
      }

      if (lowBasinClosed && elev < 200) rf += lowBasinCfg?.delta ?? 6;
      writeRainfall(x, y, rf);
    }
  }
}


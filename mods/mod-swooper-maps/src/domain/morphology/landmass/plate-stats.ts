import type { PlateStats } from "@mapgen/domain/morphology/landmass/types.js";

export function computePlateStatsFromLandMask(
  width: number,
  height: number,
  landMask: Uint8Array,
  plateIds: Int16Array | Int8Array | Uint16Array | Uint8Array | number[]
): Map<number, PlateStats> {
  const size = width * height;
  const plateStats = new Map<number, PlateStats>();

  for (let idx = 0; idx < size; idx++) {
    if (!landMask[idx]) continue;
    const plateId = plateIds[idx];
    if (plateId == null || plateId < 0) continue;

    const y = Math.floor(idx / width);
    const x = idx - y * width;

    let stat = plateStats.get(plateId);
    if (!stat) {
      stat = {
        plateId,
        count: 0,
        minX: width,
        maxX: -1,
        minY: height,
        maxY: -1,
      };
      plateStats.set(plateId, stat);
    }

    stat.count++;
    if (x < stat.minX) stat.minX = x;
    if (x > stat.maxX) stat.maxX = x;
    if (y < stat.minY) stat.minY = y;
    if (y > stat.maxY) stat.maxY = y;
  }

  return plateStats;
}


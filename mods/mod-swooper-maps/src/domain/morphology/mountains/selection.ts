import type { EngineAdapter } from "@civ7/adapter";
import type { ExtendedMapContext } from "@swooper/mapgen-core";

export function createIsWaterTile(
  ctx: ExtendedMapContext,
  adapter: EngineAdapter,
  width: number,
  height: number
): (x: number, y: number) => boolean {
  const landMask = ctx?.buffers?.heightfield?.landMask || null;
  return (x: number, y: number): boolean => {
    if (landMask) {
      const i = y * width + x;
      if (i >= 0 && i < landMask.length) {
        return landMask[i] === 0;
      }
    }
    return adapter.isWater(x, y);
  };
}

export function selectTilesAboveThreshold(
  scores: Float32Array,
  width: number,
  height: number,
  threshold: number,
  adapter: { isWater: (x: number, y: number) => boolean },
  excludeSet: Set<number> | null = null
): Set<number> {
  const selected = new Set<number>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;

      if (adapter.isWater(x, y)) continue;
      if (excludeSet && excludeSet.has(i)) continue;

      if (scores[i] > threshold) {
        selected.add(i);
      }
    }
  }

  return selected;
}


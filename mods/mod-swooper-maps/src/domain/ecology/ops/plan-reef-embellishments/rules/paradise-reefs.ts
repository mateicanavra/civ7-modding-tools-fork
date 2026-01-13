import type { LabelRng } from "@swooper/mapgen-core";

/**
 * Seeds paradise reefs around paradise mask hotspots within the configured radius.
 */
export function planParadiseReefs(params: {
  width: number;
  height: number;
  paradiseMask: Uint8Array;
  inBounds: (x: number, y: number) => boolean;
  isWater: (x: number, y: number) => boolean;
  rng: LabelRng;
  paradiseReefChance: number;
  paradiseReefRadius: number;
  canPlace: (x: number, y: number) => boolean;
  place: (x: number, y: number) => void;
}): void {
  const {
    width,
    height,
    paradiseMask,
    inBounds,
    isWater,
    rng,
    paradiseReefChance,
    paradiseReefRadius,
    canPlace,
    place,
  } = params;

  if (paradiseReefChance <= 0 || paradiseReefRadius <= 0) return;

  const size = width * height;
  for (let idx = 0; idx < size; idx++) {
    if (paradiseMask[idx] !== 1) continue;
    const cx = idx % width;
    const cy = Math.floor(idx / width);

    for (let dy = -paradiseReefRadius; dy <= paradiseReefRadius; dy++) {
      for (let dx = -paradiseReefRadius; dx <= paradiseReefRadius; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!inBounds(nx, ny)) continue;
        if (!isWater(nx, ny)) continue;
        if (!canPlace(nx, ny)) continue;

        if (rng(100, "features:plan:reef:paradise") < paradiseReefChance) {
          place(nx, ny);
        }
      }
    }
  }
}

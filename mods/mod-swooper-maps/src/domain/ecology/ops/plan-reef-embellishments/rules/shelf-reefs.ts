import type { LabelRng } from "@swooper/mapgen-core";

/**
 * Seeds shelf reefs around passive shelf markers within the configured radius.
 */
export function planShelfReefs(params: {
  width: number;
  height: number;
  passiveShelfMask: Uint8Array;
  inBounds: (x: number, y: number) => boolean;
  isWater: (x: number, y: number) => boolean;
  rng: LabelRng;
  shelfReefChance: number;
  shelfReefRadius: number;
  canPlace: (x: number, y: number) => boolean;
  place: (x: number, y: number) => void;
}): void {
  const {
    width,
    height,
    passiveShelfMask,
    inBounds,
    isWater,
    rng,
    shelfReefChance,
    shelfReefRadius,
    canPlace,
    place,
  } = params;

  if (shelfReefChance <= 0 || shelfReefRadius <= 0) return;

  const size = width * height;
  for (let idx = 0; idx < size; idx++) {
    if (passiveShelfMask[idx] !== 1) continue;
    const sx = idx % width;
    const sy = Math.floor(idx / width);

    for (let dy = -shelfReefRadius; dy <= shelfReefRadius; dy++) {
      for (let dx = -shelfReefRadius; dx <= shelfReefRadius; dx++) {
        const nx = sx + dx;
        const ny = sy + dy;
        if (!inBounds(nx, ny)) continue;
        if (!isWater(nx, ny)) continue;
        if (!canPlace(nx, ny)) continue;

        if (rng(100, "features:plan:reef:shelf") < shelfReefChance) {
          place(nx, ny);
        }
      }
    }
  }
}

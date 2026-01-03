export function planParadiseReefs(params: {
  width: number;
  height: number;
  paradiseMask: Uint8Array;
  inBounds: (x: number, y: number) => boolean;
  isWater: (x: number, y: number) => boolean;
  rng: (label: string, max: number) => number;
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

        if (rng("features:plan:reef:paradise", 100) < paradiseReefChance) {
          place(nx, ny);
        }
      }
    }
  }
}

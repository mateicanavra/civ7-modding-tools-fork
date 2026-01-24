import type { ExtendedMapContext } from "@swooper/mapgen-core";

export function assertNoWaterDrift(
  context: ExtendedMapContext,
  landMask: Uint8Array,
  label: string
): void {
  const { width, height } = context.dimensions;
  const size = Math.max(0, (width | 0) * (height | 0));
  if (landMask.length !== size) {
    throw new Error(
      `[${label}] landMask length ${landMask.length} does not match ${size}.`
    );
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const isLand = landMask[idx] === 1;
      const isWater = context.adapter.isWater(x, y);
      if (isLand && isWater) {
        throw new Error(
          `[${label}] drift: landMask=1 but adapter reports water at (${x},${y}).`
        );
      }
      if (!isLand && !isWater) {
        throw new Error(
          `[${label}] drift: landMask=0 but adapter reports land at (${x},${y}).`
        );
      }
    }
  }
}

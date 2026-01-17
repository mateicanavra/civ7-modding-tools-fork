import type { ExtendedMapContext } from "@swooper/mapgen-core";

export function computeRiverAdjacencyMask(ctx: ExtendedMapContext, radius = 1): Uint8Array {
  const { width, height } = ctx.dimensions;
  const size = width * height;
  const mask = new Uint8Array(size);

  const r = Math.max(0, radius | 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mask[y * width + x] = ctx.adapter.isAdjacentToRivers(x, y, r) ? 1 : 0;
    }
  }

  return mask;
}

export function computeRiverAdjacencyMaskFromRiverClass(options: {
  width: number;
  height: number;
  riverClass: Uint8Array;
  radius?: number;
}): Uint8Array {
  const width = options.width | 0;
  const height = options.height | 0;
  const radius = Math.max(0, options.radius ?? 1) | 0;
  const size = Math.max(0, width * height);

  if (!(options.riverClass instanceof Uint8Array) || options.riverClass.length !== size) {
    throw new Error("[Hydrology] Invalid riverClass for riverAdjacency projection.");
  }

  const mask = new Uint8Array(size);
  if (radius <= 0) {
    for (let i = 0; i < size; i++) mask[i] = options.riverClass[i] ? 1 : 0;
    return mask;
  }

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      let adjacent = 0;
      for (let ny = y0; ny <= y1 && !adjacent; ny++) {
        const row = ny * width;
        for (let nx = x0; nx <= x1; nx++) {
          if (options.riverClass[row + nx] !== 0) {
            adjacent = 1;
            break;
          }
        }
      }
      mask[y * width + x] = adjacent;
    }
  }

  return mask;
}

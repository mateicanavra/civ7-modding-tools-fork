import { createStrategy } from "@swooper/mapgen-core/authoring";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";

import ComputeLandmassesContract from "../contract.js";
import {
  computeCircularBounds,
  remapLandmassesBySize,
  validateLandmassInputs,
} from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeLandmassesContract, "default", {
  run: (input) => {
    const { width, height } = input;
    const { size, landMask } = validateLandmassInputs(input);

    const visited = new Uint8Array(size);
    const landmassIdByTile = new Int32Array(size);
    landmassIdByTile.fill(-1);
    const components: Array<{
      id: number;
      tileCount: number;
      bbox: { west: number; east: number; south: number; north: number };
    }> = [];

    const queue: number[] = [];
    const columnsUsed = new Uint8Array(width);

    for (let i = 0; i < size; i++) {
      if ((landMask[i] | 0) !== 1) continue;
      if ((visited[i] | 0) === 1) continue;

      const componentId = components.length;
      visited[i] = 1;
      queue.length = 0;
      queue.push(i);
      landmassIdByTile[i] = componentId;
      columnsUsed.fill(0);

      let tileCount = 0;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      while (queue.length > 0) {
        const idx = queue.pop()!;
        tileCount++;
        const y = (idx / width) | 0;
        const x = idx - y * width;

        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        columnsUsed[x] = 1;

        forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
          const ni = ny * width + nx;
          if ((visited[ni] | 0) === 1) return;
          if ((landMask[ni] | 0) !== 1) return;
          visited[ni] = 1;
          landmassIdByTile[ni] = componentId;
          queue.push(ni);
        });
      }

      const { west, east } = computeCircularBounds(columnsUsed);
      components.push({
        id: components.length,
        tileCount,
        bbox: {
          west,
          east,
          south: Number.isFinite(minY) ? minY : 0,
          north: Number.isFinite(maxY) ? maxY : 0,
        },
      });
    }

    const remapped = remapLandmassesBySize(components, landmassIdByTile);

    return { landmasses: remapped.components, landmassIdByTile: remapped.landmassIdByTile };
  },
});

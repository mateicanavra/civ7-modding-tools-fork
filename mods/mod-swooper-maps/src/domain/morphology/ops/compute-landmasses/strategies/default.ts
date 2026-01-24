import { createStrategy } from "@swooper/mapgen-core/authoring";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";

import ComputeLandmassesContract from "../contract.js";
import {
  computeCircularBounds,
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
      coastlineLength: number;
      bbox: { west: number; east: number; south: number; north: number };
      minTileIndex: number;
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
      let coastlineLength = 0;
      let minTileIndex = i;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      while (queue.length > 0) {
        const idx = queue.pop()!;
        tileCount++;
        if (idx < minTileIndex) minTileIndex = idx;
        const y = (idx / width) | 0;
        const x = idx - y * width;

        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        columnsUsed[x] = 1;

        forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
          const ni = ny * width + nx;
          if ((landMask[ni] | 0) !== 1) {
            coastlineLength += 1;
            return;
          }
          if ((visited[ni] | 0) === 1) return;
          visited[ni] = 1;
          landmassIdByTile[ni] = componentId;
          queue.push(ni);
        });
      }

      const { west, east } = computeCircularBounds(columnsUsed);
      components.push({
        id: components.length,
        tileCount,
        coastlineLength,
        bbox: {
          west,
          east,
          south: Number.isFinite(minY) ? minY : 0,
          north: Number.isFinite(maxY) ? maxY : 0,
        },
        minTileIndex,
      });
    }

    const ordered = components
      .map((component, index) => ({ component, index }))
      .sort((a, b) => {
        const ta = a.component.tileCount;
        const tb = b.component.tileCount;
        if (ta !== tb) return tb - ta;
        const ca = a.component.coastlineLength;
        const cb = b.component.coastlineLength;
        if (ca !== cb) return cb - ca;
        const sa = a.component.bbox.south;
        const sb = b.component.bbox.south;
        if (sa !== sb) return sa - sb;
        const wa = a.component.bbox.west;
        const wb = b.component.bbox.west;
        if (wa !== wb) return wa - wb;
        const ma = a.component.minTileIndex;
        const mb = b.component.minTileIndex;
        if (ma !== mb) return ma - mb;
        return a.index - b.index;
      });

    const remap = new Int32Array(components.length);
    const sortedComponents: Array<{ id: number; tileCount: number; coastlineLength: number; bbox: { west: number; east: number; south: number; north: number } }> =
      [];
    for (let i = 0; i < ordered.length; i++) {
      const { component, index } = ordered[i];
      remap[index] = i;
      sortedComponents.push({
        id: i,
        tileCount: component.tileCount,
        coastlineLength: component.coastlineLength,
        bbox: component.bbox,
      });
    }

    for (let i = 0; i < landmassIdByTile.length; i++) {
      const previous = landmassIdByTile[i];
      if (previous >= 0) landmassIdByTile[i] = remap[previous] ?? -1;
    }

    return { landmasses: sortedComponents, landmassIdByTile };
  },
});

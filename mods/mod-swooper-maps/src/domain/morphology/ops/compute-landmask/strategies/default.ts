import { createStrategy } from "@swooper/mapgen-core/authoring";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";

import ComputeLandmaskContract from "../contract.js";
import { applyBasinSeparation, validateLandmaskInputs } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeLandmaskContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const { size, elevation } = validateLandmaskInputs(input);

    const landMask = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      landMask[i] = elevation[i] > input.seaLevel ? 1 : 0;
    }

    applyBasinSeparation(width, height, landMask, config.basinSeparation);

    const distanceToCoast = new Uint16Array(size);
    distanceToCoast.fill(65535);
    const queue: number[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const isLand = landMask[i] === 1;
        let isCoastal = false;
        forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
          if (isCoastal) return;
          const ni = ny * width + nx;
          if ((landMask[ni] === 1) !== isLand) isCoastal = true;
        });
        if (isCoastal) {
          distanceToCoast[i] = 0;
          queue.push(i);
        }
      }
    }

    while (queue.length > 0) {
      const idx = queue.shift()!;
      const y = (idx / width) | 0;
      const x = idx - y * width;
      const dist = distanceToCoast[idx];
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const ni = ny * width + nx;
        if (distanceToCoast[ni] <= dist + 1) return;
        distanceToCoast[ni] = dist + 1;
        queue.push(ni);
      });
    }

    return { landMask, distanceToCoast };
  },
});

import { createStrategy } from "@swooper/mapgen-core/authoring";
import RefineBiomeEdgesContract from "../contract.js";
export const defaultStrategy = createStrategy(RefineBiomeEdgesContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const size = width * height;
    if (input.biomeIndex.length !== size || input.landMask.length !== size) {
      throw new Error("Refine biome edges: invalid input size.");
    }
    let working = new Uint8Array(input.biomeIndex);
    const radius = config.radius;

    for (let iter = 0; iter < config.iterations; iter++) {
      const next = new Uint8Array(size);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (input.landMask[idx] === 0) {
            next[idx] = working[idx]!;
            continue;
          }
          const counts: Record<number, number> = {};
          for (let dy = -radius; dy <= radius; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;
              const nIdx = ny * width + nx;
              const biome = working[nIdx]!;
              counts[biome] = (counts[biome] ?? 0) + 1;
            }
          }
          let dominant = working[idx]!;
          let bestCount = -1;
          for (const [biome, count] of Object.entries(counts)) {
            const numericBiome = Number(biome);
            if (count > bestCount) {
              dominant = numericBiome;
              bestCount = count;
            }
          }
          next[idx] = dominant;
        }
      }
      working = next;
    }

    return { biomeIndex: working };
  },
});

import { createStrategy } from "@swooper/mapgen-core/authoring";
import { RefineBiomeEdgesContract } from "../contract.js";

export const gaussianStrategy = createStrategy(RefineBiomeEdgesContract, "gaussian", {
  run: (input, config) => {
    const { width, height } = input;
    const size = width * height;
    if (input.biomeIndex.length !== size) {
      throw new Error("Refine biome edges (gaussian): invalid input size.");
    }

    const radius = config.radius;
    const sigma = Math.max(1, radius);
    const kernel: number[] = [];
    let kernelSum = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const weight = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        kernel.push(weight);
        kernelSum += weight;
      }
    }

    let working = new Uint8Array(input.biomeIndex);
    for (let iter = 0; iter < config.iterations; iter++) {
      const next = new Uint8Array(size);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let weighted: Record<number, number> = {};
          let idxKernel = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) {
              idxKernel += radius * 2 + 1;
              continue;
            }
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) {
                idxKernel += 1;
                continue;
              }
              const weight = kernel[idxKernel]!;
              const biome = working[ny * width + nx]!;
              weighted[biome] = (weighted[biome] ?? 0) + weight;
              idxKernel += 1;
            }
          }
          let bestBiome = working[y * width + x]!;
          let bestScore = -1;
          for (const [biome, score] of Object.entries(weighted)) {
            if (score > bestScore) {
              bestScore = score;
              bestBiome = Number(biome);
            }
          }
          next[y * width + x] = bestBiome;
        }
      }
      working = next;
    }

    return { biomeIndex: working };
  },
});

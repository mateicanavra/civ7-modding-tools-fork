import { createStrategy } from "@swooper/mapgen-core/authoring";
import AggregatePedologyContract from "../contract.js";
export const defaultStrategy = createStrategy(AggregatePedologyContract, "default", {
  run: (input, config) => {
    const { width, height } = input;
    const cellSize = config.cellSize;
    const cells = [];

    for (let y = 0; y < height; y += cellSize) {
      for (let x = 0; x < width; x += cellSize) {
        let totalFertility = 0;
        let count = 0;
        const soilCounts: Record<number, number> = {};
        for (let dy = 0; dy < cellSize && y + dy < height; dy++) {
          const row = (y + dy) * width;
          for (let dx = 0; dx < cellSize && x + dx < width; dx++) {
            const idx = row + x + dx;
            totalFertility += input.fertility[idx];
            const soil = input.soilType[idx];
            soilCounts[soil] = (soilCounts[soil] ?? 0) + 1;
            count += 1;
          }
        }
        const dominantSoil = Object.entries(soilCounts).reduce(
          (best, [soil, soilCount]) => (soilCount > best.count ? { soil: Number(soil), count: soilCount } : best),
          { soil: 0, count: -1 }
        ).soil;
        cells.push({
          x,
          y,
          width: Math.min(cellSize, width - x),
          height: Math.min(cellSize, height - y),
          meanFertility: count === 0 ? 0 : totalFertility / count,
          dominantSoil,
        });
      }
    }

    return { cells };
  },
});

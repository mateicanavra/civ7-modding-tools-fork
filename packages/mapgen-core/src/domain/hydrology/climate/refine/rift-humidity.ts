import type { StoryTagsInstance } from "@mapgen/domain/narrative/tags/instance.js";
import type { ClimateRuntime } from "@mapgen/domain/hydrology/climate/types.js";

export function applyRiftHumidityRefinement(
  width: number,
  height: number,
  runtime: ClimateRuntime,
  inBounds: (x: number, y: number) => boolean,
  StoryTags: StoryTagsInstance,
  storyRain: Record<string, number>
): void {
  const { adapter, readRainfall, writeRainfall } = runtime;

  const riftR = storyRain?.riftRadius ?? 2;
  const riftBoost = storyRain?.riftBoost ?? 8;

  if (StoryTags.riftLine.size > 0 && riftR > 0 && riftBoost !== 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;

        let nearRift = false;
        for (let dy = -riftR; dy <= riftR && !nearRift; dy++) {
          for (let dx = -riftR; dx <= riftR; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (!inBounds(nx, ny)) continue;
            if (StoryTags.riftLine.has(`${nx},${ny}`)) {
              nearRift = true;
              break;
            }
          }
        }

        if (nearRift) {
          const rf = readRainfall(x, y);
          const elev = adapter.getElevation(x, y);
          const penalty = Math.max(0, Math.floor((elev - 200) / 150));
          const delta = Math.max(0, riftBoost - penalty);
          writeRainfall(x, y, rf + delta);
        }
      }
    }
  }
}


import type { StoryTagsInstance } from "@mapgen/domain/narrative/tags/instance.js";
import type { ClimateRuntime } from "@mapgen/domain/hydrology/climate/types.js";

export function applyHotspotMicroclimatesRefinement(
  width: number,
  height: number,
  runtime: ClimateRuntime,
  inBounds: (x: number, y: number) => boolean,
  StoryTags: StoryTagsInstance,
  storyRain: Record<string, number>
): void {
  const { adapter, readRainfall, writeRainfall } = runtime;

  const paradiseDelta = storyRain?.paradiseDelta ?? 6;
  const volcanicDelta = storyRain?.volcanicDelta ?? 8;
  const radius = 2;
  const hasParadise = StoryTags.hotspotParadise.size > 0;
  const hasVolcanic = StoryTags.hotspotVolcanic.size > 0;

  if (hasParadise || hasVolcanic) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;

        let nearParadise = false;
        let nearVolcanic = false;

        for (let dy = -radius; dy <= radius && (!nearParadise || !nearVolcanic); dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (!inBounds(nx, ny)) continue;
            const key = `${nx},${ny}`;
            if (!nearParadise && hasParadise && StoryTags.hotspotParadise.has(key))
              nearParadise = true;
            if (!nearVolcanic && hasVolcanic && StoryTags.hotspotVolcanic.has(key))
              nearVolcanic = true;
            if (nearParadise && nearVolcanic) break;
          }
        }

        if (nearParadise || nearVolcanic) {
          const rf = readRainfall(x, y);
          let delta = 0;
          if (nearParadise) delta += paradiseDelta;
          if (nearVolcanic) delta += volcanicDelta;
          writeRainfall(x, y, rf + delta);
        }
      }
    }
  }
}


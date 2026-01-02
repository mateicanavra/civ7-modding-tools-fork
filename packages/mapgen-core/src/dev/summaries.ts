/**
 * Summary logging utilities for foundation, biomes, and placement.
 *
 * Provides compact diagnostic summaries for debugging map generation.
 *
 * @module dev/summaries
 */

import type { EngineAdapter } from "@civ7/adapter";
import { isDevEnabled } from "@mapgen/dev/flags.js";
import { devLog, devLogJson } from "@mapgen/dev/logging.js";
import {
  COAST_TERRAIN,
  FLAT_TERRAIN,
  HILL_TERRAIN,
  MOUNTAIN_TERRAIN,
  NAVIGABLE_RIVER_TERRAIN,
  OCEAN_TERRAIN,
} from "@mapgen/core/terrain-constants.js";

type ElevationStats = {
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p90: number;
  p99: number;
};

function computeElevationStats(values: number[]): ElevationStats | null {
  if (!values.length) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
    sum += value;
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const pick = (ratio: number): number => {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(ratio * (sorted.length - 1))));
    return sorted[idx] ?? 0;
  };
  const mean = sum / Math.max(1, values.length);
  return {
    count: values.length,
    min,
    max,
    mean: Number(mean.toFixed(2)),
    p50: pick(0.5),
    p90: pick(0.9),
    p99: pick(0.99),
  };
}

/**
 * Foundation plates data structure.
 */
export interface FoundationPlates {
  plateId?: Int16Array;
  boundaryType?: Uint8Array;
  boundaryCloseness?: Uint8Array;
  upliftPotential?: Uint8Array;
  riftPotential?: Uint8Array;
}

/**
 * Log a compact foundation summary.
 */
export function logFoundationSummary(
  adapter: EngineAdapter,
  width: number,
  height: number,
  foundation: FoundationPlates
): void {
  if (!isDevEnabled("LOG_FOUNDATION_SUMMARY")) return;

  const { plateId, boundaryType, boundaryCloseness, upliftPotential, riftPotential } = foundation;

  if (!plateId || !boundaryType || !boundaryCloseness) {
    devLog("[foundation] summary: Missing core fields");
    return;
  }

  const size = width * height;
  const n = Math.min(size, plateId.length, boundaryType.length, boundaryCloseness.length);

  // Count unique plates
  const plates = new Set<number>();
  for (let i = 0; i < n; i++) {
    plates.add(plateId[i]);
  }

  // Count boundary types
  const btCounts = [0, 0, 0, 0]; // none, convergent, divergent, transform
  let boundaryTiles = 0;

  for (let i = 0; i < n; i++) {
    const bt = boundaryType[i];
    if (bt >= 0 && bt < 4) btCounts[bt]++;
    if (boundaryCloseness[i] > 32) boundaryTiles++;
  }

  // Compute averages for potentials
  const avgByte = (arr: Uint8Array | undefined): number | null => {
    if (!arr || arr.length === 0) return null;
    const m = Math.min(arr.length, size);
    let sum = 0;
    for (let i = 0; i < m; i++) sum += arr[i];
    return Math.round(sum / m);
  };

  // Sample rows for directional bias detection
  const rowSamples: Array<{
    row: number;
    closAvg: number;
    upliftAvg: number | null;
    landCount: number;
  }> = [];

  const sampleRows = [
    0,
    Math.floor(height * 0.25),
    Math.floor(height * 0.5),
    Math.floor(height * 0.75),
    height - 1,
  ].filter((y, i, arr) => y >= 0 && y < height && arr.indexOf(y) === i);

  for (const y of sampleRows) {
    let closSum = 0;
    let upliftSum = 0;
    let landCount = 0;

    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      closSum += boundaryCloseness[idx] ?? 0;
      upliftSum += upliftPotential?.[idx] ?? 0;
      if (!adapter.isWater(x, y)) landCount++;
    }

    rowSamples.push({
      row: y,
      closAvg: Math.round(closSum / Math.max(1, width)),
      upliftAvg: upliftPotential ? Math.round(upliftSum / Math.max(1, width)) : null,
      landCount,
    });
  }

  devLogJson("foundation summary", {
    dimensions: { width, height },
    plates: plates.size,
    boundaryTiles,
    boundaryTypes: {
      none: btCounts[0],
      convergent: btCounts[1],
      divergent: btCounts[2],
      transform: btCounts[3],
    },
    upliftAvg: avgByte(upliftPotential),
    riftAvg: avgByte(riftPotential),
    rowSamples,
  });
}

/**
 * Log biome tile counts and distribution.
 */
export function logBiomeSummary(
  adapter: EngineAdapter,
  width: number,
  height: number,
  biomeNames?: Map<number, string>
): void {
  if (!isDevEnabled("LOG_BIOME_SUMMARY")) return;

  const counts = new Map<number, number>();
  let landTiles = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      landTiles++;
      const biomeId = adapter.getBiomeType(x, y);
      counts.set(biomeId, (counts.get(biomeId) ?? 0) + 1);
    }
  }

  if (landTiles === 0) {
    devLog("[biome] summary: No land tiles");
    return;
  }

  // Build sorted summary
  const summary = Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      name: biomeNames?.get(id) ?? null,
      count,
      share: Number(((count / landTiles) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count);

  devLogJson("biome summary", {
    landTiles,
    biomes: summary,
  });
}

/**
 * Log mountain placement summary.
 */
export function logMountainSummary(
  adapter: EngineAdapter,
  width: number,
  height: number
): void {
  if (!isDevEnabled("LOG_MOUNTAINS")) return;

  let mountains = 0;
  let onLand = 0;
  let coastal = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!adapter.isMountain(x, y)) continue;
      mountains++;

      if (!adapter.isWater(x, y)) onLand++;

      // Check if coastal (adjacent to water)
      let hasWaterNeighbor = false;
      for (let dy = -1; dy <= 1 && !hasWaterNeighbor; dy++) {
        for (let dx = -1; dx <= 1 && !hasWaterNeighbor; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (adapter.isWater(nx, ny)) hasWaterNeighbor = true;
          }
        }
      }
      if (hasWaterNeighbor) coastal++;
    }
  }

  devLogJson("mountains summary", {
    total: mountains,
    onLand,
    coastal,
    share: width * height > 0 ? `${((mountains / (width * height)) * 100).toFixed(2)}%` : "0%",
  });
}

/**
 * Log elevation summary stats for land and terrain categories.
 */
export function logElevationSummary(
  adapter: EngineAdapter,
  width: number,
  height: number,
  stage?: string
): void {
  if (!isDevEnabled("LOG_ELEVATION_SUMMARY")) return;

  const land: number[] = [];
  const mountain: number[] = [];
  const hill: number[] = [];
  const flat: number[] = [];
  const coast: number[] = [];
  const ocean: number[] = [];
  const river: number[] = [];
  const unknown: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const elevation = adapter.getElevation(x, y);
      if (!Number.isFinite(elevation)) continue;
      const terrain = adapter.getTerrainType(x, y);

      if (!adapter.isWater(x, y)) {
        land.push(elevation);
      }

      switch (terrain) {
        case MOUNTAIN_TERRAIN:
          mountain.push(elevation);
          break;
        case HILL_TERRAIN:
          hill.push(elevation);
          break;
        case FLAT_TERRAIN:
          flat.push(elevation);
          break;
        case COAST_TERRAIN:
          coast.push(elevation);
          break;
        case OCEAN_TERRAIN:
          ocean.push(elevation);
          break;
        case NAVIGABLE_RIVER_TERRAIN:
          river.push(elevation);
          break;
        default:
          unknown.push(elevation);
          break;
      }
    }
  }

  devLogJson("elevation summary", {
    stage: stage ?? null,
    dimensions: { width, height },
    totals: {
      landTiles: land.length,
      waterTiles: coast.length + ocean.length,
      unknownTerrainTiles: unknown.length,
    },
    land: computeElevationStats(land),
    mountain: computeElevationStats(mountain),
    hill: computeElevationStats(hill),
    flat: computeElevationStats(flat),
    coast: computeElevationStats(coast),
    ocean: computeElevationStats(ocean),
    navigableRiver: computeElevationStats(river),
    unknown: computeElevationStats(unknown),
  });
}

/**
 * Log volcano placement summary.
 */
export function logVolcanoSummary(
  adapter: EngineAdapter,
  width: number,
  height: number,
  volcanoFeatureId?: number
): void {
  if (!isDevEnabled("LOG_VOLCANOES")) return;

  if (volcanoFeatureId === undefined || volcanoFeatureId < 0) {
    devLog("[volcanoes] summary: Volcano feature ID not available");
    return;
  }

  let volcanoes = 0;
  let onMountain = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const featureType = adapter.getFeatureType(x, y);
      if (featureType === volcanoFeatureId) {
        volcanoes++;
        if (adapter.isMountain(x, y)) onMountain++;
      }
    }
  }

  devLogJson("volcanoes summary", {
    total: volcanoes,
    onMountain,
  });
}

/**
 * Log landmass window bounding boxes.
 */
export function logLandmassWindows(
  windows: Array<{ minX: number; maxX: number; minY: number; maxY: number; area: number }>
): void {
  if (!isDevEnabled("LOG_LANDMASS_WINDOWS")) return;

  if (!windows || windows.length === 0) {
    devLog("[landmass] windows: None defined");
    return;
  }

  devLogJson("landmass windows", {
    count: windows.length,
    windows: windows.map((w, i) => ({
      id: i,
      bounds: `(${w.minX},${w.minY})-(${w.maxX},${w.maxY})`,
      area: w.area,
    })),
  });
}

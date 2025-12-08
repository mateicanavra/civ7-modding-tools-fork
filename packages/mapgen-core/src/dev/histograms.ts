/**
 * Histogram utilities for data distribution analysis.
 *
 * Provides helpers to build and log histograms for rainfall,
 * foundation metrics, and other numeric data.
 *
 * @module dev/histograms
 */

import type { EngineAdapter } from "@civ7/adapter";
import { isDevEnabled } from "./flags.js";
import { devLog, devLogJson } from "./logging.js";

// Hill terrain type constant (from map-globals)
const HILL_TERRAIN_DEFAULT = 2;

/**
 * Build a histogram from a value array.
 *
 * @param values Array of numeric values
 * @param bins Number of bins (default: 10)
 * @param range Optional [min, max] range (auto-detected if not provided)
 * @returns Histogram with bin counts and metadata
 */
export function buildHistogram(
  values: number[] | Uint8Array | Int16Array | Float32Array,
  bins: number = 10,
  range?: [number, number]
): {
  counts: number[];
  total: number;
  min: number;
  max: number;
  binWidth: number;
} {
  const n = values.length;
  if (n === 0) {
    return { counts: new Array(bins).fill(0), total: 0, min: 0, max: 0, binWidth: 0 };
  }

  // Determine range
  let min: number, max: number;
  if (range) {
    [min, max] = range;
  } else {
    min = values[0];
    max = values[0];
    for (let i = 1; i < n; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
  }

  const binWidth = max > min ? (max - min) / bins : 1;
  const counts = new Array(bins).fill(0);

  for (let i = 0; i < n; i++) {
    const v = values[i];
    const binIdx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / binWidth)));
    counts[binIdx]++;
  }

  return { counts, total: n, min, max, binWidth };
}

/**
 * Format histogram as percentage strings.
 */
export function formatHistogramPercent(counts: number[], total: number): string[] {
  if (total === 0) return counts.map(() => "0.0%");
  return counts.map((c) => `${((c / total) * 100).toFixed(1)}%`);
}

/**
 * Log a rainfall histogram over non-water tiles.
 */
export function logRainfallHistogram(
  adapter: EngineAdapter,
  width: number,
  height: number,
  options: { bins?: number } = {}
): void {
  if (!isDevEnabled("LOG_RAINFALL_SUMMARY")) return;

  const bins = Math.max(5, Math.min(20, options.bins ?? 10));
  const values: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      values.push(adapter.getRainfall(x, y));
    }
  }

  if (values.length === 0) {
    devLog("[rainfall] histogram: No land samples");
    return;
  }

  const hist = buildHistogram(values, bins, [0, 200]);
  const pct = formatHistogramPercent(hist.counts, hist.total);

  devLogJson("rainfall histogram", {
    samples: hist.total,
    bins,
    distribution: pct,
  });
}

/**
 * Log rainfall statistics (min/max/avg/buckets).
 */
export function logRainfallStats(
  adapter: EngineAdapter,
  width: number,
  height: number,
  label: string = "rainfall"
): void {
  if (!isDevEnabled("LOG_RAINFALL_SUMMARY")) return;

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let landTiles = 0;

  const buckets = { arid: 0, semiArid: 0, temperate: 0, wet: 0, lush: 0 };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;

      const value = adapter.getRainfall(x, y);
      landTiles++;
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;

      // Bucket classification
      if (value < 25) buckets.arid++;
      else if (value < 60) buckets.semiArid++;
      else if (value < 95) buckets.temperate++;
      else if (value < 130) buckets.wet++;
      else buckets.lush++;
    }
  }

  if (landTiles === 0) {
    devLog(`[${label}] stats: No land tiles`);
    return;
  }

  devLogJson(`${label} stats`, {
    landTiles,
    min,
    max,
    avg: Number((sum / landTiles).toFixed(2)),
    buckets,
  });
}

/**
 * Log foundation uplift/rift potential histograms.
 */
export function logFoundationHistograms(
  width: number,
  height: number,
  foundation: {
    upliftPotential?: Uint8Array;
    riftPotential?: Uint8Array;
  },
  options: { bins?: number } = {}
): void {
  if (!isDevEnabled("FOUNDATION_HISTOGRAMS")) return;

  const { upliftPotential, riftPotential } = foundation;
  if (!upliftPotential || !riftPotential) {
    devLog("[foundation] histograms: Missing uplift/rift data");
    return;
  }

  const bins = Math.max(5, Math.min(20, options.bins ?? 10));
  const size = Math.min(width * height, upliftPotential.length, riftPotential.length);

  // Collect values
  const upliftValues = Array.from(upliftPotential.slice(0, size));
  const riftValues = Array.from(riftPotential.slice(0, size));

  const upliftHist = buildHistogram(upliftValues, bins, [0, 255]);
  const riftHist = buildHistogram(riftValues, bins, [0, 255]);

  devLogJson("foundation uplift histogram", {
    samples: upliftHist.total,
    distribution: formatHistogramPercent(upliftHist.counts, upliftHist.total),
  });

  devLogJson("foundation rift histogram", {
    samples: riftHist.total,
    distribution: formatHistogramPercent(riftHist.counts, riftHist.total),
  });
}

/**
 * Log boundary closeness distribution by type.
 */
export function logBoundaryMetrics(
  adapter: EngineAdapter,
  width: number,
  height: number,
  foundation: {
    boundaryType?: Uint8Array;
    boundaryCloseness?: Uint8Array;
  },
  options: { thresholds?: number[] } = {}
): void {
  if (!isDevEnabled("LOG_BOUNDARY_METRICS")) return;

  const { boundaryType, boundaryCloseness } = foundation;
  if (!boundaryType || !boundaryCloseness) {
    devLog("[boundary] metrics: Missing boundary data");
    return;
  }

  const thresholds = options.thresholds ?? [0.35, 0.6];
  const totalTiles = Math.min(width * height, boundaryType.length, boundaryCloseness.length);

  // Count boundary types
  const typeCounts = { none: 0, convergent: 0, divergent: 0, transform: 0 };
  const thresholdHits = thresholds.map(() => 0);

  // Count terrain overlaps
  let mountains = 0;
  let hills = 0;
  const mountainByType = [0, 0, 0, 0];
  const hillByType = [0, 0, 0, 0];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (idx >= totalTiles) continue;

      const bType = boundaryType[idx];
      const closeness = boundaryCloseness[idx] / 255;

      // Count by type
      if (bType === 0) typeCounts.none++;
      else if (bType === 1) typeCounts.convergent++;
      else if (bType === 2) typeCounts.divergent++;
      else if (bType === 3) typeCounts.transform++;

      // Count threshold hits
      for (let t = 0; t < thresholds.length; t++) {
        if (closeness >= thresholds[t]) thresholdHits[t]++;
      }

      // Terrain overlap
      const isMountain = adapter.isMountain(x, y);
      // Check hills by terrain type (no isHills on adapter)
      const terrainType = adapter.getTerrainType(x, y);
      const isHill = terrainType === HILL_TERRAIN_DEFAULT;

      if (isMountain) {
        mountains++;
        if (bType >= 0 && bType < 4) mountainByType[bType]++;
      } else if (isHill) {
        hills++;
        if (bType >= 0 && bType < 4) hillByType[bType]++;
      }
    }
  }

  const pct = (v: number) => `${((v / totalTiles) * 100).toFixed(1)}%`;

  devLogJson("boundary type counts", {
    total: totalTiles,
    ...typeCounts,
    shares: {
      convergent: pct(typeCounts.convergent),
      divergent: pct(typeCounts.divergent),
      transform: pct(typeCounts.transform),
    },
  });

  for (let t = 0; t < thresholds.length; t++) {
    devLogJson(`boundary closeness >= ${thresholds[t].toFixed(2)}`, {
      tiles: thresholdHits[t],
      share: pct(thresholdHits[t]),
    });
  }

  devLogJson("mountains by boundary type", {
    total: mountains,
    none: mountainByType[0],
    convergent: mountainByType[1],
    divergent: mountainByType[2],
    transform: mountainByType[3],
  });

  devLogJson("hills by boundary type", {
    total: hills,
    none: hillByType[0],
    convergent: hillByType[1],
    divergent: hillByType[2],
    transform: hillByType[3],
  });
}

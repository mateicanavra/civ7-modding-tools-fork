import { clamp01 } from "@swooper/mapgen-core";

type PlotEffectsInput = {
  width: number;
  height: number;
  landMask: Uint8Array;
  elevation: Int16Array;
};

type SnowElevationStats = {
  count: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p99: number;
};

type SnowElevationRange = {
  strategy: "absolute" | "percentile";
  min: number;
  max: number;
  stats: SnowElevationStats;
  percentiles?: {
    min: number;
    max: number;
  };
};

const pickPercentile = (sorted: number[], ratio: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(ratio * (sorted.length - 1))));
  return sorted[idx]!;
};

const computeStats = (sorted: number[]): SnowElevationStats => {
  if (sorted.length === 0) {
    return { count: 0, min: 0, max: 0, p50: 0, p90: 0, p99: 0 };
  }

  return {
    count: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    p50: pickPercentile(sorted, 0.5),
    p90: pickPercentile(sorted, 0.9),
    p99: pickPercentile(sorted, 0.99),
  };
};

const collectLandElevations = (input: PlotEffectsInput): number[] => {
  const elevations: number[] = [];
  const { width, height, landMask, elevation } = input;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      if (landMask[rowOffset + x] === 0) continue;
      const idx = rowOffset + x;
      elevations.push(elevation[idx]);
    }
  }

  return elevations;
};

/**
 * Resolves the snow elevation thresholds from the configured strategy and terrain stats.
 */
export function resolveSnowElevationRange(
  input: PlotEffectsInput,
  config: {
    snow: {
      elevationStrategy?: "absolute" | "percentile";
      elevationPercentileMin: number;
      elevationPercentileMax: number;
      elevationMin: number;
      elevationMax: number;
    };
  }
) {
  const elevations = collectLandElevations(input);
  const sorted = elevations.slice().sort((a, b) => a - b);
  const stats = computeStats(sorted);

  if (config.snow.elevationStrategy === "percentile") {
    const minPercentile = clamp01(config.snow.elevationPercentileMin);
    const maxPercentile = clamp01(config.snow.elevationPercentileMax);
    const min = sorted.length > 0 ? pickPercentile(sorted, minPercentile) : config.snow.elevationMin;
    const max = sorted.length > 0 ? pickPercentile(sorted, maxPercentile) : config.snow.elevationMax;

    return {
      strategy: "percentile",
      min,
      max,
      stats,
      percentiles: {
        min: minPercentile,
        max: maxPercentile,
      },
    } satisfies SnowElevationRange;
  }

  return {
    strategy: "absolute",
    min: config.snow.elevationMin,
    max: config.snow.elevationMax,
    stats,
  } satisfies SnowElevationRange;
}

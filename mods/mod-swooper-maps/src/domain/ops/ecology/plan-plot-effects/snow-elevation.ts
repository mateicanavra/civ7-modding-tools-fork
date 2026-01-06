import { type Static } from "@swooper/mapgen-core/authoring";
import { PlanPlotEffectsSchema, type ResolvedPlotEffectsConfig } from "./schema.js";

type PlotEffectsInput = Static<typeof PlanPlotEffectsSchema["properties"]["input"]>;
type SnowElevationStrategy = NonNullable<ResolvedPlotEffectsConfig["snow"]["elevationStrategy"]>;

export type SnowElevationStats = {
  count: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p99: number;
};

export type SnowElevationRange = {
  strategy: SnowElevationStrategy;
  min: number;
  max: number;
  stats: SnowElevationStats;
  percentiles?: {
    min: number;
    max: number;
  };
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const pickPercentile = (sorted: number[], ratio: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(ratio * (sorted.length - 1))));
  return sorted[idx] ?? 0;
};

const computeStats = (sorted: number[]): SnowElevationStats => {
  if (sorted.length === 0) {
    return { count: 0, min: 0, max: 0, p50: 0, p90: 0, p99: 0 };
  }

  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
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
      elevations.push(elevation[idx] ?? 0);
    }
  }

  return elevations;
};

export function resolveSnowElevationRange(
  input: PlotEffectsInput,
  config: ResolvedPlotEffectsConfig
): SnowElevationRange {
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
    };
  }

  return {
    strategy: "absolute",
    min: config.snow.elevationMin,
    max: config.snow.elevationMax,
    stats,
  };
}

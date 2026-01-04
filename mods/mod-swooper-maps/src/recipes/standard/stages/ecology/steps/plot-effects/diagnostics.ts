import {
  devLogJson,
  FLAT_TERRAIN,
  HILL_TERRAIN,
  MOUNTAIN_TERRAIN,
} from "@swooper/mapgen-core";
import type { TraceScope } from "@swooper/mapgen-core";
import type * as ecology from "@mapgen/domain/ecology";
import type { PlotEffectKey, ResolvedPlotEffectsConfig } from "@mapgen/domain/ecology";
import { resolveSnowElevationRange } from "@mapgen/domain/ecology";

type PlotEffectsInput = Parameters<typeof ecology.ops.planPlotEffects.run>[0];

type PlotEffectPlacement = {
  x: number;
  y: number;
  plotEffect: PlotEffectKey;
};

type TerrainBucket = {
  total: number;
  gateEligible: number;
  scoreEligible: number;
  mediumEligible: number;
  heavyEligible: number;
  aboveElevationMin: number;
  aboveElevationMax: number;
  scoreSum: number;
  scoreCount: number;
  scoreMin: number;
  scoreMax: number;
};

type ScoreStats = {
  mean: number;
  min: number;
  max: number;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const normalizeRange = (value: number, min: number, max: number): number => {
  if (max <= min) return value >= max ? 1 : 0;
  return clamp01((value - min) / (max - min));
};

const createBucket = (): TerrainBucket => ({
  total: 0,
  gateEligible: 0,
  scoreEligible: 0,
  mediumEligible: 0,
  heavyEligible: 0,
  aboveElevationMin: 0,
  aboveElevationMax: 0,
  scoreSum: 0,
  scoreCount: 0,
  scoreMin: Number.POSITIVE_INFINITY,
  scoreMax: Number.NEGATIVE_INFINITY,
});

const finalizeScoreStats = (bucket: TerrainBucket): ScoreStats | null => {
  if (bucket.scoreCount === 0) return null;
  return {
    mean: Number((bucket.scoreSum / bucket.scoreCount).toFixed(3)),
    min: Number(bucket.scoreMin.toFixed(3)),
    max: Number(bucket.scoreMax.toFixed(3)),
  };
};

export function logSnowEligibilitySummary(
  trace: TraceScope | null | undefined,
  input: PlotEffectsInput,
  config: ResolvedPlotEffectsConfig,
  placements: PlotEffectPlacement[],
  terrainType: Uint8Array
): void {
  if (!trace?.isVerbose) return;

  if (!config.snow.enabled) {
    devLogJson(trace, "snow summary", {
      enabled: false,
      reason: "snow placement disabled",
    });
    return;
  }

  const snowTypes = {
    light: config.snow.selectors.light.typeName,
    medium: config.snow.selectors.medium.typeName,
    heavy: config.snow.selectors.heavy.typeName,
  } as const;

  const bucketLand = createBucket();
  const bucketMountain = createBucket();
  const bucketHill = createBucket();
  const bucketFlat = createBucket();

  const snowElevation = resolveSnowElevationRange(input, config);
  const elevationMin = snowElevation.min;
  const elevationMax = snowElevation.max;

  const totals = {
    land: 0,
    mountain: 0,
    hill: 0,
    flat: 0,
  };

  for (let y = 0; y < input.height; y++) {
    const rowOffset = y * input.width;
    for (let x = 0; x < input.width; x++) {
      const idx = rowOffset + x;
      if (input.landMask[idx] === 0) continue;

      const terrain = terrainType[idx] ?? 0;
      const isMountain = terrain === MOUNTAIN_TERRAIN;
      const isHill = terrain === HILL_TERRAIN;
      const isFlat = terrain === FLAT_TERRAIN;

      totals.land += 1;
      bucketLand.total += 1;

      if (isMountain) {
        totals.mountain += 1;
        bucketMountain.total += 1;
      } else if (isHill) {
        totals.hill += 1;
        bucketHill.total += 1;
      } else if (isFlat) {
        totals.flat += 1;
        bucketFlat.total += 1;
      }

      const temp = input.surfaceTemperature[idx] ?? 0;
      const moisture = input.effectiveMoisture[idx] ?? 0;
      const aridity = input.aridityIndex[idx] ?? 0;
      const freeze = input.freezeIndex[idx] ?? 0;
      const elevation = input.elevation[idx] ?? 0;

      const elevationFactor = normalizeRange(elevation, elevationMin, elevationMax);
      const moistureFactor = normalizeRange(
        moisture,
        config.snow.moistureMin,
        config.snow.moistureMax
      );
      const scoreRaw =
        freeze * config.snow.freezeWeight +
        elevationFactor * config.snow.elevationWeight +
        moistureFactor * config.snow.moistureWeight +
        config.snow.scoreBias;
      const score = clamp01(scoreRaw / Math.max(0.0001, config.snow.scoreNormalization));

      const gateEligible = temp <= config.snow.maxTemperature && aridity <= config.snow.maxAridity;

      const applyBucket = (bucket: TerrainBucket): void => {
        bucket.scoreSum += score;
        bucket.scoreCount += 1;
        bucket.scoreMin = Math.min(bucket.scoreMin, score);
        bucket.scoreMax = Math.max(bucket.scoreMax, score);
        if (elevation >= elevationMin) bucket.aboveElevationMin += 1;
        if (elevation >= elevationMax) bucket.aboveElevationMax += 1;
        if (gateEligible) bucket.gateEligible += 1;
        if (score >= config.snow.lightThreshold) bucket.scoreEligible += 1;
        if (score >= config.snow.mediumThreshold) bucket.mediumEligible += 1;
        if (score >= config.snow.heavyThreshold) bucket.heavyEligible += 1;
      };

      applyBucket(bucketLand);
      if (isMountain) applyBucket(bucketMountain);
      if (isHill) applyBucket(bucketHill);
      if (isFlat) applyBucket(bucketFlat);
    }
  }

  const placementCounts = {
    snowLight: 0,
    snowMedium: 0,
    snowHeavy: 0,
    total: placements.length,
  };

  for (const placement of placements) {
    if (placement.plotEffect === snowTypes.light) placementCounts.snowLight += 1;
    if (placement.plotEffect === snowTypes.medium) placementCounts.snowMedium += 1;
    if (placement.plotEffect === snowTypes.heavy) placementCounts.snowHeavy += 1;
  }

  devLogJson(trace, "snow summary", {
    enabled: true,
    snowTypes,
    config: {
      coverageChance: config.snow.coverageChance,
      thresholds: {
        light: config.snow.lightThreshold,
        medium: config.snow.mediumThreshold,
        heavy: config.snow.heavyThreshold,
      },
      elevation: {
        strategy: snowElevation.strategy,
        absolute: {
          min: config.snow.elevationMin,
          max: config.snow.elevationMax,
        },
        percentiles: {
          min: config.snow.elevationPercentileMin,
          max: config.snow.elevationPercentileMax,
        },
        derived: {
          min: elevationMin,
          max: elevationMax,
        },
        stats: snowElevation.stats,
      },
      temperatureMax: config.snow.maxTemperature,
      aridityMax: config.snow.maxAridity,
      scoreWeights: {
        freeze: config.snow.freezeWeight,
        elevation: config.snow.elevationWeight,
        moisture: config.snow.moistureWeight,
      },
      scoreNormalization: config.snow.scoreNormalization,
    },
    totals,
    land: {
      ...bucketLand,
      scoreStats: finalizeScoreStats(bucketLand),
    },
    mountain: {
      ...bucketMountain,
      scoreStats: finalizeScoreStats(bucketMountain),
    },
    hill: {
      ...bucketHill,
      scoreStats: finalizeScoreStats(bucketHill),
    },
    flat: {
      ...bucketFlat,
      scoreStats: finalizeScoreStats(bucketFlat),
    },
    placements: placementCounts,
    expectedCoverage: Number(
      ((bucketLand.scoreEligible * config.snow.coverageChance) / 100).toFixed(2)
    ),
  });
}

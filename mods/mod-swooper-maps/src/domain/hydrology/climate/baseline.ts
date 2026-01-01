import { PerlinNoise } from "@swooper/mapgen-core/lib/noise";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { Value } from "typebox/value";
import {
  ClimateBaselineBandEdgesSchema,
  ClimateBaselineBandsSchema,
  ClimateBaselineBlendSchema,
  ClimateBaselineCoastalSchema,
  ClimateBaselineNoiseSchema,
  ClimateBaselineOrographicSchema,
  ClimateBaselineSchema,
  ClimateBaselineSizeScalingSchema,
  ClimateConfigSchema,
  type ClimateBaseline,
  type ClimateBaselineBandEdges,
  type ClimateBaselineBands,
  type ClimateBaselineBlend,
  type ClimateBaselineCoastal,
  type ClimateBaselineNoise,
  type ClimateBaselineOrographic,
  type ClimateBaselineSizeScaling,
  type ClimateConfig,
} from "@mapgen/config";
import { distanceToNearestWater } from "@mapgen/domain/hydrology/climate/distance-to-water.js";
import { createClimateRuntime } from "@mapgen/domain/hydrology/climate/runtime.js";

/**
 * Baseline rainfall generation (latitude bands + coastal/orographic modifiers).
 */
export function applyClimateBaseline(
  width: number,
  height: number,
  ctx: ExtendedMapContext | null = null,
  config: ClimateConfig = {}
): void {
  console.log("Building enhanced rainfall patterns...");
  if (!ctx) {
    throw new Error(
      "ClimateEngine: applyClimateBaseline requires MapContext (legacy direct-engine fallback removed)."
    );
  }

  const runtime = createClimateRuntime(width, height, ctx);
  const { adapter, readRainfall, writeRainfall, rand } = runtime;

  ctx.buffers.climate.rainfall.fill(0);
  if (ctx.fields?.rainfall) ctx.fields.rainfall.fill(0);

  const resolvedConfig = Value.Default(ClimateConfigSchema, config) as ClimateConfig;
  const baselineCfg = Value.Default(
    ClimateBaselineSchema,
    resolvedConfig.baseline ?? {}
  ) as Required<ClimateBaseline>;
  const bands = Value.Default(
    ClimateBaselineBandsSchema,
    baselineCfg.bands ?? {}
  ) as Required<ClimateBaselineBands>;
  const bandEdges = Value.Default(
    ClimateBaselineBandEdgesSchema,
    bands.edges ?? {}
  ) as Required<ClimateBaselineBandEdges>;
  const transitionWidth = bands.transitionWidth;
  const sizeScaling = Value.Default(
    ClimateBaselineSizeScalingSchema,
    baselineCfg.sizeScaling ?? {}
  ) as Required<ClimateBaselineSizeScaling>;
  const blend = Value.Default(
    ClimateBaselineBlendSchema,
    baselineCfg.blend ?? {}
  ) as Required<ClimateBaselineBlend>;
  const orographic = Value.Default(
    ClimateBaselineOrographicSchema,
    baselineCfg.orographic ?? {}
  ) as Required<ClimateBaselineOrographic>;
  const coastalCfg = Value.Default(
    ClimateBaselineCoastalSchema,
    baselineCfg.coastal ?? {}
  ) as Required<ClimateBaselineCoastal>;
  const noiseCfg = Value.Default(
    ClimateBaselineNoiseSchema,
    baselineCfg.noise ?? {}
  ) as Required<ClimateBaselineNoise>;

  const baseArea = sizeScaling.baseArea;
  const minScale = sizeScaling.minScale;
  const maxScale = sizeScaling.maxScale;
  const equatorBoostScale = sizeScaling.equatorBoostScale;
  const equatorBoostTaper = sizeScaling.equatorBoostTaper;

  const areaScale = Math.min(
    maxScale,
    Math.max(minScale, Math.sqrt(Math.max(1, width * height) / Math.max(1, baseArea)))
  );
  const equatorPlus = equatorBoostScale * (areaScale - 1);

  const noiseBase = noiseCfg.baseSpanSmall;
  const noiseScaleFactor = noiseCfg.spanLargeScaleFactor;
  const noiseSpan = noiseBase + noiseScaleFactor * Math.max(0, areaScale - 1);
  const maxSpread = coastalCfg.spread;
  const noiseScale = noiseCfg.scale;

  const seed = rand(10000, "PerlinSeed");
  const perlin = new PerlinNoise(seed);
  const distMap = distanceToNearestWater(width, height, (x: number, y: number) =>
    adapter.isWater(x, y)
  );

  const rollNoise = (x: number, y: number): number => {
    const n = perlin.noise2D(x * noiseScale, y * noiseScale);
    return n * noiseSpan;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;

      const base = readRainfall(x, y);
      const elevation = adapter.getElevation(x, y);
      const lat = Math.abs(adapter.getLatitude(x, y));

      const b0 = bands.deg0to10;
      const b1 = bands.deg10to20;
      const b2 = bands.deg20to35;
      const b3 = bands.deg35to55;
      const b4 = bands.deg55to70;
      const b5 = bands.deg70plus;

      const edges = [
        bandEdges.deg0to10,
        bandEdges.deg10to20,
        bandEdges.deg20to35,
        bandEdges.deg35to55,
        bandEdges.deg55to70,
      ];

      const bandValues = [
        b0 + equatorPlus,
        b1 + equatorPlus * equatorBoostTaper,
        b2,
        b3,
        b4,
        b5,
      ];

      const blendWidth = Math.max(0, transitionWidth);
      const halfBlend = blendWidth / 2;

      let bandRain = bandValues[bandValues.length - 1] ?? 0;
      let blended = false;
      if (blendWidth > 0) {
        for (let i = 0; i < edges.length; i++) {
          const edge = edges[i] ?? 0;
          const start = edge - halfBlend;
          const end = edge + halfBlend;
          if (lat >= start && lat <= end) {
            const t = (lat - start) / Math.max(1e-6, blendWidth);
            const smooth = t * t * (3 - 2 * t);
            const left = bandValues[i] ?? 0;
            const right = bandValues[i + 1] ?? left;
            bandRain = left + (right - left) * smooth;
            blended = true;
            break;
          }
        }
      }

      if (!blended) {
        for (let i = 0; i < edges.length; i++) {
          if (lat < (edges[i] ?? 0)) {
            bandRain = bandValues[i] ?? bandRain;
            break;
          }
        }
      }

      const baseW = blend.baseWeight;
      const bandW = blend.bandWeight;
      let currentRainfall = Math.round(base * baseW + bandRain * bandW);

      const hi1T = orographic.hi1Threshold;
      const hi1B = orographic.hi1Bonus;
      const hi2T = orographic.hi2Threshold;
      const hi2B = orographic.hi2Bonus;
      if (elevation > hi1T) currentRainfall += hi1B;
      if (elevation > hi2T) currentRainfall += hi2B;

      const coastalBonus = coastalCfg.coastalLandBonus;

      const dist = distMap[y * width + x];
      if (dist > 0 && dist <= maxSpread) {
        const factor = 1 - (dist - 1) / maxSpread;
        currentRainfall += coastalBonus * factor;
      }

      currentRainfall += rollNoise(x, y);
      writeRainfall(x, y, currentRainfall);
    }
  }
}

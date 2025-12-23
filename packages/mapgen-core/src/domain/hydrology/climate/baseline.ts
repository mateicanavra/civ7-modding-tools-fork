import { PerlinNoise } from "@mapgen/lib/noise/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { ClimateConfig } from "@mapgen/config/index.js";
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

  const climateCfg = config;
  const baselineCfg = climateCfg.baseline || {};
  const bands = (baselineCfg.bands || {}) as Record<string, number>;
  const blend = (baselineCfg.blend || {}) as Record<string, number>;
  const orographic = (baselineCfg.orographic || {}) as Record<string, number>;
  const coastalCfg = (baselineCfg.coastal || {}) as Record<string, number>;
  const noiseCfg = (baselineCfg.noise || {}) as Record<string, number>;

  const BASE_AREA = 10000;
  const sqrt = Math.min(2.0, Math.max(0.6, Math.sqrt(Math.max(1, width * height) / BASE_AREA)));
  const equatorPlus = Math.round(12 * (sqrt - 1));

  const noiseBase = Number.isFinite(noiseCfg?.baseSpanSmall) ? noiseCfg.baseSpanSmall : 3;
  const noiseSpan =
    sqrt > 1
      ? noiseBase +
        Math.round(
          Number.isFinite(noiseCfg?.spanLargeScaleFactor) ? noiseCfg.spanLargeScaleFactor : 1
        )
      : noiseBase;
  const maxSpread = Number.isFinite(coastalCfg.spread) ? coastalCfg.spread : 4;
  const noiseScale = Number.isFinite(noiseCfg.scale) ? noiseCfg.scale : 0.15;

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

      const b0 = Number.isFinite(bands.deg0to10) ? bands.deg0to10 : 120;
      const b1 = Number.isFinite(bands.deg10to20) ? bands.deg10to20 : 104;
      const b2 = Number.isFinite(bands.deg20to35) ? bands.deg20to35 : 75;
      const b3 = Number.isFinite(bands.deg35to55) ? bands.deg35to55 : 70;
      const b4 = Number.isFinite(bands.deg55to70) ? bands.deg55to70 : 60;
      const b5 = Number.isFinite(bands.deg70plus) ? bands.deg70plus : 45;

      let bandRain = 0;
      if (lat < 10) bandRain = b0 + equatorPlus;
      else if (lat < 20) bandRain = b1 + Math.floor(equatorPlus * 0.6);
      else if (lat < 35) bandRain = b2;
      else if (lat < 55) bandRain = b3;
      else if (lat < 70) bandRain = b4;
      else bandRain = b5;

      const baseW = Number.isFinite(blend?.baseWeight) ? blend.baseWeight : 0.6;
      const bandW = Number.isFinite(blend?.bandWeight) ? blend.bandWeight : 0.4;
      let currentRainfall = Math.round(base * baseW + bandRain * bandW);

      const hi1T = Number.isFinite(orographic?.hi1Threshold) ? orographic.hi1Threshold : 350;
      const hi1B = Number.isFinite(orographic?.hi1Bonus) ? orographic.hi1Bonus : 8;
      const hi2T = Number.isFinite(orographic?.hi2Threshold) ? orographic.hi2Threshold : 600;
      const hi2B = Number.isFinite(orographic?.hi2Bonus) ? orographic.hi2Bonus : 7;
      if (elevation > hi1T) currentRainfall += hi1B;
      if (elevation > hi2T) currentRainfall += hi2B;

      const coastalBonus = Number.isFinite(coastalCfg.coastalLandBonus)
        ? coastalCfg.coastalLandBonus
        : 24;

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

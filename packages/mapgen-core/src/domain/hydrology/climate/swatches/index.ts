import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { clamp } from "@mapgen/lib/math/clamp.js";
import type { ClimateConfig, FoundationDirectionalityConfig } from "@mapgen/config/index.js";
import type { ClimateSwatchResult, OrogenyCache } from "@mapgen/domain/hydrology/climate/types.js";
import { createClimateRuntime } from "@mapgen/domain/hydrology/climate/runtime.js";
import { chooseSwatchTypeWeighted } from "@mapgen/domain/hydrology/climate/swatches/chooser.js";
import { applyMacroDesertBeltSwatch } from "@mapgen/domain/hydrology/climate/swatches/macro-desert-belt.js";
import { applyEquatorialRainbeltSwatch } from "@mapgen/domain/hydrology/climate/swatches/equatorial-rainbelt.js";
import { applyRainforestArchipelagoSwatch } from "@mapgen/domain/hydrology/climate/swatches/rainforest-archipelago.js";
import { applyMountainForestsSwatch } from "@mapgen/domain/hydrology/climate/swatches/mountain-forests.js";
import { applyGreatPlainsSwatch } from "@mapgen/domain/hydrology/climate/swatches/great-plains.js";
import { applyMonsoonBiasPass } from "@mapgen/domain/hydrology/climate/swatches/monsoon-bias.js";
import type { SwatchHelpers, SwatchRuntime, SwatchTypesConfig } from "@mapgen/domain/hydrology/climate/swatches/types.js";

/**
 * Apply macro climate swatches to the rainfall field.
 */
export function applyClimateSwatches(
  width: number,
  height: number,
  ctx: ExtendedMapContext | null = null,
  options: {
    orogenyCache?: OrogenyCache;
    climate?: ClimateConfig;
    directionality?: FoundationDirectionalityConfig;
  } = {}
): ClimateSwatchResult {
  if (!ctx) {
    throw new Error(
      "ClimateEngine: applyClimateSwatches requires MapContext (legacy direct-engine fallback removed)."
    );
  }
  const cfg = options.climate?.swatches;

  if (!cfg) return { applied: false, kind: "missing-config" };

  const area = Math.max(1, width * height);
  const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

  const runtimeFull = createClimateRuntime(width, height, ctx);
  const { adapter, readRainfall, writeRainfall, rand, idx } = runtimeFull;
  const orogenyCache = options?.orogenyCache || {};

  const runtime: SwatchRuntime = { readRainfall, writeRainfall, idx };

  const clamp200 = (v: number): number => clamp(v, 0, 200);
  const inLocalBounds = (x: number, y: number): boolean =>
    x >= 0 && x < width && y >= 0 && y < height;
  const isWater = (x: number, y: number): boolean => adapter.isWater(x, y);
  const getElevation = (x: number, y: number): number => adapter.getElevation(x, y);
  const signedLatitudeAt = (y: number): number => adapter.getLatitude(0, y);

  const isCoastalLand = (x: number, y: number): boolean => {
    if (adapter.isCoastalLand) return adapter.isCoastalLand(x, y);
    if (isWater(x, y)) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!inLocalBounds(nx, ny)) continue;
        if (isWater(nx, ny)) return true;
      }
    }
    return false;
  };

  const helpers: SwatchHelpers = {
    clamp200,
    inLocalBounds,
    isWater,
    isCoastalLand,
    signedLatitudeAt,
    getElevation,
  };

  const types = (cfg.types || {}) as SwatchTypesConfig;
  const entries = Object.keys(types).map((key) => ({
    key,
    w: Math.max(0, (types[key].weight as number) | 0),
  }));

  const chosenKey = chooseSwatchTypeWeighted(entries, rand, options.directionality);

  const kind = chosenKey;
  const t = types[kind] || {};
  const sizeScaling = (cfg.sizeScaling || {}) as Record<string, number>;
  const widthMul = 1 + (sizeScaling?.widthMulSqrt || 0) * (sqrtScale - 1);

  let applied = 0;

  if (kind === "macroDesertBelt") {
    applied = applyMacroDesertBeltSwatch(width, height, runtime, helpers, t, widthMul);
  } else if (kind === "equatorialRainbelt") {
    applied = applyEquatorialRainbeltSwatch(width, height, runtime, helpers, t, widthMul);
  } else if (kind === "rainforestArchipelago") {
    applied = applyRainforestArchipelagoSwatch(width, height, runtime, helpers, t);
  } else if (kind === "mountainForests") {
    applied = applyMountainForestsSwatch(width, height, runtime, helpers, t, orogenyCache);
  } else if (kind === "greatPlains") {
    applied = applyGreatPlainsSwatch(width, height, runtime, helpers, t, widthMul);
  }

  applyMonsoonBiasPass(width, height, ctx, runtime, helpers, options.directionality);

  return { applied: applied > 0, kind, tiles: applied };
}

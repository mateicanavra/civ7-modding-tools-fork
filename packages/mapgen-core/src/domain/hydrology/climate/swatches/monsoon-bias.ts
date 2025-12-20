import { clamp } from "@mapgen/lib/math/clamp.js";
import type { FoundationDirectionalityConfig } from "@mapgen/bootstrap/types.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import type { SwatchHelpers, SwatchRuntime } from "@mapgen/domain/hydrology/climate/swatches/types.js";

export function applyMonsoonBiasPass(
  width: number,
  height: number,
  ctx: ExtendedMapContext,
  runtime: SwatchRuntime,
  helpers: SwatchHelpers
): void {
  const { readRainfall, writeRainfall, idx } = runtime;
  const { inLocalBounds, isWater, isCoastalLand, signedLatitudeAt } = helpers;
  assertFoundationContext(ctx, "storySwatches");
  const DIR = (ctx.config.foundation?.dynamics?.directionality || {}) as FoundationDirectionalityConfig;
  const hemispheres = (DIR as Record<string, unknown>).hemispheres as
    | Record<string, number>
    | undefined;
  const monsoonBias = Math.max(0, Math.min(1, hemispheres?.monsoonBias ?? 0));
  const COH = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
  const eqBand = Math.max(0, (hemispheres?.equatorBandDeg ?? 12) | 0);

  const dynamics = ctx.foundation.dynamics;
  if (monsoonBias > 0 && COH > 0) {
    const baseDelta = Math.max(1, Math.round(3 * COH * monsoonBias));

    for (let y = 0; y < height; y++) {
      const latSigned = signedLatitudeAt(y);
      const absLat = Math.abs(latSigned);
      if (absLat > eqBand + 18) continue;

      for (let x = 0; x < width; x++) {
        if (isWater(x, y)) continue;
        if (!isCoastalLand(x, y)) continue;

        const i = idx(x, y);
        const u = dynamics.windU[i] | 0;
        const v = dynamics.windV[i] | 0;
        let ux = 0;
        let vy = 0;

        if (Math.abs(u) >= Math.abs(v)) {
          ux = u === 0 ? 0 : u > 0 ? 1 : -1;
          vy = 0;
        } else {
          ux = 0;
          vy = v === 0 ? 0 : v > 0 ? 1 : -1;
        }

        const dnX = x - ux;
        const dnY = y - vy;
        if (!inLocalBounds(dnX, dnY)) continue;

        let rf = readRainfall(x, y);
        let baseDeltaAdj = baseDelta;
        if (absLat <= eqBand) baseDeltaAdj += 2;
        if (isWater(dnX, dnY)) baseDeltaAdj += 2;
        rf = clamp(rf + baseDeltaAdj, 0, 200);
        writeRainfall(x, y, rf);

        const upX = x + ux;
        const upY = y + vy;
        if (inLocalBounds(upX, upY) && isWater(dnX, dnY)) {
          const rf0 = readRainfall(x, y);
          const rf1 = Math.max(0, Math.min(200, rf0 - 1));
          writeRainfall(x, y, rf1);
        }
      }
    }
  }
}

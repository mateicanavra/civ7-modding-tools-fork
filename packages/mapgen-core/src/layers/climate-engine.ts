/**
 * Climate Engine — centralizes rainfall staging passes so the orchestrator and
 * narrative overlays operate against a single shared module.
 */

import type { ExtendedMapContext } from "../core/types.js";
import type { EngineAdapter } from "@civ7/adapter";
import type {
  ClimateConfig as BootstrapClimateConfig,
  FoundationDirectionalityConfig,
} from "../bootstrap/types.js";
import { ctxRandom, writeClimateField, syncClimateField } from "../core/types.js";
import type { FoundationContext } from "../core/types.js";
import { getStoryTags } from "../story/tags.js";
import { getTunables } from "../bootstrap/tunables.js";
import { clamp, inBounds as boundsCheck } from "../core/index.js";

// ============================================================================
// Types
// ============================================================================

export type ClimateConfig = BootstrapClimateConfig;

export interface ClimateRuntime {
  adapter: ClimateAdapter;
  readRainfall: (x: number, y: number) => number;
  writeRainfall: (x: number, y: number, rainfall: number) => void;
  rand: (max: number, label: string) => number;
  idx: (x: number, y: number) => number;
}

export interface ClimateAdapter {
  isWater: (x: number, y: number) => boolean;
  isMountain: (x: number, y: number) => boolean;
  /** Optional - when undefined, climate code uses local neighborhood fallback */
  isCoastalLand?: (x: number, y: number) => boolean;
  /** Optional - when undefined, climate code uses local fallback */
  isAdjacentToShallowWater?: (x: number, y: number) => boolean;
  isAdjacentToRivers: (x: number, y: number, radius: number) => boolean;
  getRainfall: (x: number, y: number) => number;
  setRainfall: (x: number, y: number, rf: number) => void;
  getElevation: (x: number, y: number) => number;
  getLatitude: (x: number, y: number) => number;
  getRandomNumber: (max: number, label: string) => number;
}

export interface OrogenyCache {
  windward?: Set<string>;
  lee?: Set<string>;
}

export interface ClimateSwatchResult {
  applied: boolean;
  kind: string;
  tiles?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve an engine adapter for rainfall operations.
 */
function resolveAdapter(ctx: ExtendedMapContext | null): ClimateAdapter {
  if (ctx && ctx.adapter) {
    const engineAdapter = ctx.adapter;
    return {
      isWater: (x, y) => engineAdapter.isWater(x, y),
      isMountain: (x, y) => engineAdapter.isMountain(x, y),
      // NOTE: isCoastalLand and isAdjacentToShallowWater intentionally omitted.
      // These are not on the base EngineAdapter interface. By leaving them
      // undefined, the climate code's local fallbacks will execute instead of
      // receiving stubbed `() => false` values that block the fallback path.
      isAdjacentToRivers: (x, y, radius) =>
        engineAdapter.isAdjacentToRivers(x, y, radius),
      getRainfall: (x, y) => engineAdapter.getRainfall(x, y),
      setRainfall: (x, y, rf) => engineAdapter.setRainfall(x, y, rf),
      getElevation: (x, y) => engineAdapter.getElevation(x, y),
      getLatitude: (x, y) => engineAdapter.getLatitude(x, y),
      getRandomNumber: (max, label) => engineAdapter.getRandomNumber(max, label),
    } as ClimateAdapter;
  }

  // Fallback: return dummy adapter that will throw on critical methods
  // NOTE: isCoastalLand and isAdjacentToShallowWater intentionally omitted
  // to allow local neighborhood fallbacks to execute.
  return {
    isWater: () => {
      throw new Error("ClimateEngine: No adapter available");
    },
    isMountain: () => {
      throw new Error("ClimateEngine: No adapter available");
    },
    isAdjacentToRivers: () => false,
    getRainfall: () => 0,
    setRainfall: () => {},
    getElevation: () => 0,
    getLatitude: () => 0,
    getRandomNumber: (max) => Math.floor(Math.random() * max),
  } as ClimateAdapter;
}

/**
 * Create shared IO helpers for rainfall passes.
 */
function createClimateRuntime(
  width: number,
  height: number,
  ctx: ExtendedMapContext | null
): ClimateRuntime {
  const adapter = resolveAdapter(ctx);
  const rainfallBuf = ctx?.buffers?.climate?.rainfall || null;
  const idx = (x: number, y: number): number => y * width + x;

  const readRainfall = (x: number, y: number): number => {
    if (ctx && rainfallBuf) {
      return rainfallBuf[idx(x, y)] | 0;
    }
    return adapter.getRainfall(x, y);
  };

  const writeRainfall = (x: number, y: number, rainfall: number): void => {
    const clamped = clamp(rainfall, 0, 200);
    if (ctx) {
      writeClimateField(ctx, x, y, { rainfall: clamped });
    } else {
      adapter.setRainfall(x, y, clamped);
    }
  };

  const rand = (max: number, label: string): number => {
    if (ctx) {
      return ctxRandom(ctx, label || "ClimateRand", max);
    }
    return adapter.getRandomNumber(max, label || "ClimateRand");
  };

  return {
    adapter,
    readRainfall,
    writeRainfall,
    rand,
    idx,
  };
}

/**
 * Distance helper for the refinement pass.
 */
function distanceToNearestWater(
  x: number,
  y: number,
  maxR: number,
  adapter: ClimateAdapter,
  width: number,
  height: number
): number {
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (adapter.isWater(nx, ny)) return r;
        }
      }
    }
  }
  return -1;
}

/**
 * Upwind barrier utility (legacy helper).
 */
function hasUpwindBarrier(
  x: number,
  y: number,
  dx: number,
  dy: number,
  steps: number,
  adapter: ClimateAdapter,
  width: number,
  height: number
): number {
  for (let s = 1; s <= steps; s++) {
    const nx = x + dx * s;
    const ny = y + dy * s;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;
    if (!adapter.isWater(nx, ny)) {
      if (adapter.isMountain && adapter.isMountain(nx, ny)) return s;
      const elev = adapter.getElevation(nx, ny);
      if (elev >= 500) return s;
    }
  }
  return 0;
}

/**
 * Upwind barrier using foundation dynamics wind vectors.
 */
function hasUpwindBarrierWM(
  x: number,
  y: number,
  steps: number,
  adapter: ClimateAdapter,
  width: number,
  height: number,
  dynamics: FoundationContext["dynamics"]
): number {
  const U = dynamics.windU;
  const V = dynamics.windV;
  if (!U || !V) return 0;

  let cx = x;
  let cy = y;

  for (let s = 1; s <= steps; s++) {
    const i = cy * width + cx;
    let ux = 0;
    let vy = 0;

    if (i >= 0 && i < U.length) {
      const u = U[i] | 0;
      const v = V[i] | 0;
      if (Math.abs(u) >= Math.abs(v)) {
        ux = u === 0 ? 0 : u > 0 ? 1 : -1;
        vy = 0;
      } else {
        ux = 0;
        vy = v === 0 ? 0 : v > 0 ? 1 : -1;
      }
      if (ux === 0 && vy === 0) {
        const lat = Math.abs(adapter.getLatitude(cx, cy));
        ux = lat < 30 || lat >= 60 ? -1 : 1;
        vy = 0;
      }
    } else {
      const lat = Math.abs(adapter.getLatitude(cx, cy));
      ux = lat < 30 || lat >= 60 ? -1 : 1;
      vy = 0;
    }

    const nx = cx + ux;
    const ny = cy + vy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;

    if (!adapter.isWater(nx, ny)) {
      if (adapter.isMountain && adapter.isMountain(nx, ny)) return s;
      const elev = adapter.getElevation(nx, ny);
      if (elev >= 500) return s;
    }
    cx = nx;
    cy = ny;
  }
  return 0;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Baseline rainfall generation (latitude bands + coastal/orographic modifiers).
 */
export function applyClimateBaseline(
  width: number,
  height: number,
  ctx: ExtendedMapContext | null = null
): void {
  console.log("Building enhanced rainfall patterns...");

  // Sync climate field from engine state
  if (ctx) {
    syncClimateField(ctx);
  }

  const runtime = createClimateRuntime(width, height, ctx);
  const { adapter, readRainfall, writeRainfall, rand } = runtime;

  const tunables = getTunables();
  const climateCfg = tunables.CLIMATE_CFG || {};
  const baselineCfg = climateCfg.baseline || {};
  const bands = (baselineCfg.bands || {}) as Record<string, number>;
  const blend = (baselineCfg.blend || {}) as Record<string, number>;
  const orographic = (baselineCfg.orographic || {}) as Record<string, number>;
  const coastalCfg = (baselineCfg.coastal || {}) as Record<string, number>;
  const noiseCfg = (baselineCfg.noise || {}) as Record<string, number>;

  const BASE_AREA = 10000;
  const sqrt = Math.min(
    2.0,
    Math.max(0.6, Math.sqrt(Math.max(1, width * height) / BASE_AREA))
  );
  const equatorPlus = Math.round(12 * (sqrt - 1));

  const noiseBase = Number.isFinite(noiseCfg?.baseSpanSmall)
    ? noiseCfg.baseSpanSmall
    : 3;
  const noiseSpan =
    sqrt > 1
      ? noiseBase +
        Math.round(
          Number.isFinite(noiseCfg?.spanLargeScaleFactor)
            ? noiseCfg.spanLargeScaleFactor
            : 1
        )
      : noiseBase;

  const isCoastalLand = (x: number, y: number): boolean => {
    if (adapter.isCoastalLand) return adapter.isCoastalLand(x, y);
    if (adapter.isWater(x, y)) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        if (adapter.isWater(nx, ny)) return true;
      }
    }
    return false;
  };

  const isAdjacentToShallowWater = (x: number, y: number): boolean => {
    if (adapter.isAdjacentToShallowWater)
      return adapter.isAdjacentToShallowWater(x, y);
    return false;
  };

  const rollNoise = (): number => rand(noiseSpan * 2 + 1, "RainNoise") - noiseSpan;

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

      const hi1T = Number.isFinite(orographic?.hi1Threshold)
        ? orographic.hi1Threshold
        : 350;
      const hi1B = Number.isFinite(orographic?.hi1Bonus)
        ? orographic.hi1Bonus
        : 8;
      const hi2T = Number.isFinite(orographic?.hi2Threshold)
        ? orographic.hi2Threshold
        : 600;
      const hi2B = Number.isFinite(orographic?.hi2Bonus)
        ? orographic.hi2Bonus
        : 7;
      if (elevation > hi1T) currentRainfall += hi1B;
      if (elevation > hi2T) currentRainfall += hi2B;

      const coastalBonus = Number.isFinite(coastalCfg.coastalLandBonus)
        ? coastalCfg.coastalLandBonus
        : 24;
      const shallowBonus = Number.isFinite(coastalCfg.shallowAdjBonus)
        ? coastalCfg.shallowAdjBonus
        : 16;
      if (isCoastalLand(x, y)) currentRainfall += coastalBonus;
      if (isAdjacentToShallowWater(x, y)) currentRainfall += shallowBonus;

      currentRainfall += rollNoise();
      writeRainfall(x, y, currentRainfall);
    }
  }
}

/**
 * Apply macro climate swatches to the rainfall field.
 */
export function applyClimateSwatches(
  width: number,
  height: number,
  ctx: ExtendedMapContext | null = null,
  options: { orogenyCache?: OrogenyCache } = {}
): ClimateSwatchResult {
  const tunables = getTunables();
  const climateCfg = tunables.CLIMATE_CFG || {};
  const storyMoisture = (climateCfg as Record<string, unknown>).story as
    | Record<string, unknown>
    | undefined;
  const cfg = storyMoisture?.swatches as Record<string, unknown> | undefined;

  if (!cfg) return { applied: false, kind: "missing-config" };

  const area = Math.max(1, width * height);
  const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

  if (ctx) {
    syncClimateField(ctx);
  }

  const runtime = createClimateRuntime(width, height, ctx);
  const { adapter, readRainfall, writeRainfall, rand, idx } = runtime;
  const orogenyCache = options?.orogenyCache || {};

  const clamp200 = (v: number): number => clamp(v, 0, 200);
  const inLocalBounds = (x: number, y: number): boolean =>
    x >= 0 && x < width && y >= 0 && y < height;
  const isWater = (x: number, y: number): boolean => adapter.isWater(x, y);
  const getElevation = (x: number, y: number): number =>
    adapter.getElevation(x, y);
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

  const isAdjacentToShallowWater = (x: number, y: number): boolean => {
    if (adapter.isAdjacentToShallowWater)
      return adapter.isAdjacentToShallowWater(x, y);
    return false;
  };

  const types = (cfg.types || {}) as Record<
    string,
    Record<string, number | undefined>
  >;
  let entries = Object.keys(types).map((key) => ({
    key,
    w: Math.max(0, (types[key].weight as number) | 0),
  }));

  // Apply directionality adjustments
  try {
    const DIR = tunables.FOUNDATION_DIRECTIONALITY || {};
    const COH = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
    if (COH > 0) {
      const windDeg = (DIR?.primaryAxes?.windBiasDeg ?? 0) | 0;
      const plateDeg = (DIR?.primaryAxes?.plateAxisDeg ?? 0) | 0;
      const wRad = (windDeg * Math.PI) / 180;
      const pRad = (plateDeg * Math.PI) / 180;
      const alignZonal = Math.abs(Math.cos(wRad));
      const alignPlate = Math.abs(Math.cos(pRad));

      entries = entries.map((entry) => {
        let mul = 1;
        if (entry.key === "macroDesertBelt") {
          mul *= 1 + 0.4 * COH * alignZonal;
        } else if (entry.key === "equatorialRainbelt") {
          mul *= 1 + 0.25 * COH * alignZonal;
        } else if (entry.key === "mountainForests") {
          mul *= 1 + 0.2 * COH * alignPlate;
        } else if (entry.key === "greatPlains") {
          mul *= 1 + 0.2 * COH * alignZonal;
        }
        return { key: entry.key, w: Math.max(0, Math.round(entry.w * mul)) };
      });
    }
  } catch {
    /* keep default weights on any error */
  }

  const totalW = entries.reduce((sum, entry) => sum + entry.w, 0) || 1;
  let roll = rand(totalW, "SwatchType");
  let chosenKey = entries[0]?.key || "macroDesertBelt";

  for (const entry of entries) {
    if (roll < entry.w) {
      chosenKey = entry.key;
      break;
    }
    roll -= entry.w;
  }

  const kind = chosenKey;
  const t = types[kind] || {};
  const sizeScaling = (cfg.sizeScaling || {}) as Record<string, number>;
  const widthMul = 1 + (sizeScaling?.widthMulSqrt || 0) * (sqrtScale - 1);

  const latBandCenter = (): number => (t.latitudeCenterDeg as number) ?? 0;
  const halfWidthDeg = (): number =>
    Math.max(4, Math.round(((t.halfWidthDeg as number) ?? 10) * widthMul));
  const falloff = (value: number, radius: number): number =>
    Math.max(0, 1 - value / Math.max(1, radius));

  let applied = 0;

  for (let y = 0; y < height; y++) {
    const latDegAbs = Math.abs(signedLatitudeAt(y));

    for (let x = 0; x < width; x++) {
      if (isWater(x, y)) continue;
      let rf = readRainfall(x, y);
      const elev = getElevation(x, y);
      let tileAdjusted = false;

      if (kind === "macroDesertBelt") {
        const center = latBandCenter();
        const hw = halfWidthDeg();
        const f = falloff(Math.abs(latDegAbs - center), hw);
        if (f > 0) {
          const base = (t.drynessDelta as number) ?? 28;
          const lowlandBonus = elev < 250 ? 4 : 0;
          const delta = Math.round((base + lowlandBonus) * f);
          rf = clamp200(rf - delta);
          applied++;
          tileAdjusted = true;
        }
      } else if (kind === "equatorialRainbelt") {
        const center = latBandCenter();
        const hw = halfWidthDeg();
        const f = falloff(Math.abs(latDegAbs - center), hw);
        if (f > 0) {
          const base = (t.wetnessDelta as number) ?? 24;
          let coastBoost = 0;
          if (isCoastalLand(x, y)) coastBoost += 6;
          if (isAdjacentToShallowWater(x, y)) coastBoost += 4;
          const delta = Math.round((base + coastBoost) * f);
          rf = clamp200(rf + delta);
          applied++;
          tileAdjusted = true;
        }
      } else if (kind === "rainforestArchipelago") {
        const fTropics = latDegAbs < 23 ? 1 : latDegAbs < 30 ? 0.5 : 0;
        if (fTropics > 0) {
          let islandy = 0;
          if (isCoastalLand(x, y)) islandy += 1;
          if (isAdjacentToShallowWater(x, y)) islandy += 0.5;
          if (islandy > 0) {
            const base = (t.wetnessDelta as number) ?? 18;
            const delta = Math.round(base * fTropics * islandy);
            rf = clamp200(rf + delta);
            applied++;
            tileAdjusted = true;
          }
        }
      } else if (kind === "mountainForests") {
        const windward = !!orogenyCache?.windward?.has?.(`${x},${y}`);
        const lee = !!orogenyCache?.lee?.has?.(`${x},${y}`);
        if (windward) {
          const base = (t.windwardBonus as number) ?? 6;
          const delta = base + (elev < 300 ? 2 : 0);
          rf = clamp200(rf + delta);
          applied++;
          tileAdjusted = true;
        } else if (lee) {
          const base = (t.leePenalty as number) ?? 2;
          rf = clamp200(rf - base);
          applied++;
          tileAdjusted = true;
        }
      } else if (kind === "greatPlains") {
        const center = (t.latitudeCenterDeg as number) ?? 45;
        const hw = Math.max(
          6,
          Math.round(((t.halfWidthDeg as number) ?? 8) * widthMul)
        );
        const f = falloff(Math.abs(latDegAbs - center), hw);
        if (f > 0 && elev <= ((t.lowlandMaxElevation as number) ?? 300)) {
          const dry = (t.dryDelta as number) ?? 12;
          const delta = Math.round(dry * f);
          rf = clamp200(rf - delta);
          applied++;
          tileAdjusted = true;
        }
      }

      if (tileAdjusted) {
        writeRainfall(x, y, rf);
      }
    }
  }

  // Monsoon bias pass
  try {
    const DIR = tunables.FOUNDATION_DIRECTIONALITY || {};
    const hemispheres = (DIR as Record<string, unknown>).hemispheres as
      | Record<string, number>
      | undefined;
    const monsoonBias = Math.max(0, Math.min(1, hemispheres?.monsoonBias ?? 0));
    const COH = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
    const eqBand = Math.max(0, (hemispheres?.equatorBandDeg ?? 12) | 0);

    // Use foundation dynamics for wind data
    const dynamics = ctx?.foundation?.dynamics;
    if (
      monsoonBias > 0 &&
      COH > 0 &&
      dynamics &&
      dynamics.windU &&
      dynamics.windV
    ) {
      const baseDelta = Math.max(1, Math.round(3 * COH * monsoonBias));

      for (let y = 0; y < height; y++) {
        const latSigned = signedLatitudeAt(y);
        const absLat = Math.abs(latSigned);
        if (absLat > eqBand + 18) continue;

        for (let x = 0; x < width; x++) {
          if (isWater(x, y)) continue;
          if (!isCoastalLand(x, y) && !isAdjacentToShallowWater(x, y)) continue;

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
  } catch {
    /* keep resilient */
  }

  return { applied: applied > 0, kind, tiles: applied };
}

/**
 * Earthlike rainfall refinements (post-rivers).
 */
export function refineClimateEarthlike(
  width: number,
  height: number,
  ctx: ExtendedMapContext | null = null,
  options: { orogenyCache?: OrogenyCache } = {}
): void {
  const runtime = createClimateRuntime(width, height, ctx);
  const { adapter, readRainfall, writeRainfall } = runtime;
  const dynamics = ctx?.foundation?.dynamics;

  const tunables = getTunables();
  const climateCfg = tunables.CLIMATE_CFG || {};
  const refineCfg = climateCfg.refine || {};
  const storyMoisture = (climateCfg as Record<string, unknown>).story as
    | Record<string, unknown>
    | undefined;
  const storyRain = (storyMoisture?.rainfall || {}) as Record<string, number>;
  const orogenyCache = options?.orogenyCache || null;

  const StoryTags = getStoryTags();

  // Local bounds check with captured width/height
  const inBounds = (x: number, y: number): boolean =>
    boundsCheck(x, y, width, height);

  console.log(
    `[Climate Refinement] Using ${ctx ? "MapContext adapter" : "direct engine calls"}`
  );

  // Pass A: coastal and lake humidity gradient
  {
    const waterGradient = (refineCfg.waterGradient || {}) as Record<
      string,
      number
    >;
    const maxR = (waterGradient?.radius ?? 5) | 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;
        let rf = readRainfall(x, y);
        const dist = distanceToNearestWater(x, y, maxR, adapter, width, height);
        if (dist >= 0) {
          const elev = adapter.getElevation(x, y);
          let bonus =
            Math.max(0, maxR - dist) * (waterGradient?.perRingBonus ?? 5);
          if (elev < 150) bonus += waterGradient?.lowlandBonus ?? 3;
          rf += bonus;
          writeRainfall(x, y, rf);
        }
      }
    }
  }

  // Pass B: orographic rain shadows with wind model
  {
    const orographic = (refineCfg.orographic || {}) as Record<string, number>;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;

        const baseSteps = (orographic?.steps ?? 4) | 0;
        let steps = baseSteps;

        try {
          const DIR = tunables.FOUNDATION_DIRECTIONALITY || {};
          const coh = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
          const interplay = (DIR as Record<string, unknown>).interplay as
            | Record<string, number>
            | undefined;
          const windC = Math.max(0, Math.min(1, interplay?.windsFollowPlates ?? 0));
          const extra = Math.round(coh * windC);
          steps = Math.max(1, baseSteps + extra);
        } catch {
          steps = baseSteps;
        }

        let barrier = 0;
        const dynamicsEnabled = dynamics && dynamics.windU && dynamics.windV;
        if (dynamicsEnabled) {
          barrier = hasUpwindBarrierWM(
            x,
            y,
            steps,
            adapter,
            width,
            height,
            dynamics
          );
        } else {
          const lat = Math.abs(adapter.getLatitude(x, y));
          const dx = lat < 30 || lat >= 60 ? -1 : 1;
          const dy = 0;
          barrier = hasUpwindBarrier(x, y, dx, dy, steps, adapter, width, height);
        }

        if (barrier) {
          const rf = readRainfall(x, y);
          const reduction =
            (orographic?.reductionBase ?? 8) +
            barrier * (orographic?.reductionPerStep ?? 6);
          writeRainfall(x, y, rf - reduction);
        }
      }
    }
  }

  // Pass C: river corridor greening and basin humidity
  {
    const riverCorridor = (refineCfg.riverCorridor || {}) as Record<
      string,
      number
    >;
    const lowBasinCfg = (refineCfg.lowBasin || {}) as Record<string, number>;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;
        let rf = readRainfall(x, y);
        const elev = adapter.getElevation(x, y);

        if (adapter.isAdjacentToRivers(x, y, 1)) {
          rf +=
            elev < 250
              ? (riverCorridor?.lowlandAdjacencyBonus ?? 14)
              : (riverCorridor?.highlandAdjacencyBonus ?? 10);
        }

        let lowBasinClosed = true;
        const basinRadius = lowBasinCfg?.radius ?? 2;

        for (let dy = -basinRadius; dy <= basinRadius && lowBasinClosed; dy++) {
          for (let dx = -basinRadius; dx <= basinRadius; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (inBounds(nx, ny)) {
              if (adapter.getElevation(nx, ny) < elev + 20) {
                lowBasinClosed = false;
                break;
              }
            }
          }
        }

        if (lowBasinClosed && elev < 200) rf += lowBasinCfg?.delta ?? 6;
        writeRainfall(x, y, rf);
      }
    }
  }

  // Pass D: Rift humidity boost
  {
    const riftR = storyRain?.riftRadius ?? 2;
    const riftBoost = storyRain?.riftBoost ?? 8;

    if (StoryTags.riftLine.size > 0 && riftR > 0 && riftBoost !== 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (adapter.isWater(x, y)) continue;

          let nearRift = false;
          for (let dy = -riftR; dy <= riftR && !nearRift; dy++) {
            for (let dx = -riftR; dx <= riftR; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (!inBounds(nx, ny)) continue;
              if (StoryTags.riftLine.has(`${nx},${ny}`)) {
                nearRift = true;
                break;
              }
            }
          }

          if (nearRift) {
            const rf = readRainfall(x, y);
            const elev = adapter.getElevation(x, y);
            const penalty = Math.max(0, Math.floor((elev - 200) / 150));
            const delta = Math.max(0, riftBoost - penalty);
            writeRainfall(x, y, rf + delta);
          }
        }
      }
    }
  }

  // Pass E: Orogeny belts (windward/lee)
  {
    const storyTunables = (tunables.FOUNDATION_CFG?.story || {}) as Record<
      string,
      unknown
    >;
    const orogenyTunables = (storyTunables.orogeny || {}) as Record<
      string,
      number
    >;

    if (tunables.STORY_ENABLE_OROGENY && orogenyCache !== null) {
      const windwardSet = orogenyCache.windward;
      const leeSet = orogenyCache.lee;
      const hasWindward = (windwardSet?.size ?? 0) > 0;
      const hasLee = (leeSet?.size ?? 0) > 0;

      if (hasWindward || hasLee) {
        const windwardBoost = orogenyTunables?.windwardBoost ?? 5;
        const leeAmp = orogenyTunables?.leeDrynessAmplifier ?? 1.2;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (adapter.isWater(x, y)) continue;
            let rf = readRainfall(x, y);
            const key = `${x},${y}`;

            if (hasWindward && windwardSet && windwardSet.has(key)) {
              rf = clamp(rf + windwardBoost, 0, 200);
            }
            if (hasLee && leeSet && leeSet.has(key)) {
              const baseSubtract = 8;
              const extra = Math.max(0, Math.round(baseSubtract * (leeAmp - 1)));
              rf = clamp(rf - (baseSubtract + extra), 0, 200);
            }
            writeRainfall(x, y, rf);
          }
        }
      }
    }
  }

  // Pass F: Hotspot island microclimates
  {
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

          for (
            let dy = -radius;
            dy <= radius && (!nearParadise || !nearVolcanic);
            dy++
          ) {
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
}

export default {
  applyClimateBaseline,
  applyClimateSwatches,
  refineClimateEarthlike,
};

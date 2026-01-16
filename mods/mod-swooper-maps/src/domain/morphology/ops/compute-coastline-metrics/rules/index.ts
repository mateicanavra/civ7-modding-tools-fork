import { clamp } from "@swooper/mapgen-core/lib/math";

import type { ComputeCoastlineMetricsTypes } from "../types.js";

type CoastConfig = ComputeCoastlineMetricsTypes["config"]["default"]["coast"];
type PlateBiasConfig = CoastConfig["plateBias"];

type SeaLaneConfig = ComputeCoastlineMetricsTypes["config"]["default"]["seaLanes"];

type BayConfig = CoastConfig["bay"];
type FjordConfig = CoastConfig["fjord"];

type SeaLaneProtection = { skip: boolean; chanceMultiplier: number };

const BOUNDARY_CONVERGENT = 1;
const BOUNDARY_DIVERGENT = 2;
const BOUNDARY_TRANSFORM = 3;

/**
 * Computes boundary-driven bias for coastline carving.
 */
export function computePlateBias(
  closenessNorm: number,
  boundaryType: number,
  cfg: PlateBiasConfig
): number {
  const threshold = cfg.threshold;
  const power = cfg.power;
  let weight = 0;

  if (closenessNorm >= threshold) {
    const span = Math.max(1e-3, 1 - threshold);
    const normalized = clamp((closenessNorm - threshold) / span, 0, 1);
    const ramp = Math.pow(normalized, power);

    let typeMul = 0;
    if (boundaryType === BOUNDARY_CONVERGENT) typeMul = cfg.convergent;
    else if (boundaryType === BOUNDARY_TRANSFORM) typeMul = cfg.transform;
    else if (boundaryType === BOUNDARY_DIVERGENT) typeMul = cfg.divergent;

    weight = ramp * typeMul;
  } else if (cfg.interior !== 0 && threshold > 0) {
    const normalized = clamp(1 - closenessNorm / threshold, 0, 1);
    weight = Math.pow(normalized, power) * cfg.interior;
  }

  return weight;
}

/**
 * Expands a binary mask by a square radius in tile space.
 */
export function expandMaskRadius(
  width: number,
  height: number,
  mask: Uint8Array,
  radius: number
): Uint8Array {
  if (radius <= 0) return mask;
  const out = new Uint8Array(mask);
  const r = Math.max(0, radius | 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask[i] !== 1) continue;
      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        const row = ny * width;
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          out[row + nx] = 1;
        }
      }
    }
  }
  return out;
}

/**
 * Resolves sea-lane protection behavior for a tile.
 */
export function resolveSeaLaneProtection(config: SeaLaneConfig, onSeaLane: boolean): SeaLaneProtection {
  if (!onSeaLane) return { skip: false, chanceMultiplier: 1 };
  if (config.mode === "hard") return { skip: true, chanceMultiplier: 1 };
  if (config.mode === "soft") {
    return { skip: false, chanceMultiplier: Math.max(0.1, config.softChanceMultiplier) };
  }
  return { skip: false, chanceMultiplier: 1 };
}

/**
 * Computes bay carving policy parameters for a tile.
 */
export function resolveBayPolicy(params: {
  bay: BayConfig;
  plateBias: PlateBiasConfig;
  closenessNorm: number;
  boundaryType: number;
  activeMargin: boolean;
  chanceMultiplier: number;
}): { noiseGate: number; rollDen: number; bias: number } {
  const { bay, plateBias, closenessNorm, boundaryType, activeMargin, chanceMultiplier } = params;
  const bias = computePlateBias(closenessNorm, boundaryType, plateBias);
  const isActive = activeMargin || closenessNorm >= plateBias.threshold;
  const noiseGateBonus = bias > 0 ? Math.round(bias * plateBias.bayNoiseBonus) : 0;
  const noiseGate = 2 + bay.noiseGateAdd + (isActive ? 1 : 0) + noiseGateBonus;

  let rollDen = isActive ? bay.rollDenActive : bay.rollDenDefault;
  if (plateBias.bayWeight > 0 && bias !== 0) {
    const scale = clamp(1 + bias * plateBias.bayWeight, 0.25, 4);
    rollDen = Math.max(1, Math.round(rollDen / scale));
  }
  rollDen = Math.max(1, Math.round(rollDen / chanceMultiplier));
  return { noiseGate, rollDen, bias };
}

/**
 * Computes fjord carving denominator after boundary and sea-lane adjustments.
 */
export function resolveFjordDenom(params: {
  fjord: FjordConfig;
  plateBias: PlateBiasConfig;
  bias: number;
  nearActive: boolean;
  nearPassive: boolean;
  chanceMultiplier: number;
}): number {
  const { fjord, plateBias, bias, nearActive, nearPassive, chanceMultiplier } = params;
  const denom = fjord.baseDenom - (nearPassive ? fjord.passiveBonus : 0) - (nearActive ? fjord.activeBonus : 0);
  let denomUsed = Math.max(1, Math.round(denom / chanceMultiplier));

  if (plateBias.fjordWeight > 0 && bias !== 0) {
    const fjScale = clamp(1 + bias * plateBias.fjordWeight, 0.2, 5);
    denomUsed = Math.max(1, Math.round(denomUsed / fjScale));
  }

  return denomUsed;
}

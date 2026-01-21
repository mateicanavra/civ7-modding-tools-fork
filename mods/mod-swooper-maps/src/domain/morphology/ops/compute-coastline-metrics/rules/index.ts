import { clamp } from "@swooper/mapgen-core/lib/math";

import type { ComputeCoastlineMetricsTypes } from "../types.js";

type CoastConfig = ComputeCoastlineMetricsTypes["config"]["default"]["coast"];
type PlateBiasConfig = CoastConfig["plateBias"];

type BayConfig = CoastConfig["bay"];
type FjordConfig = CoastConfig["fjord"];

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
 * Computes bay carving policy parameters for a tile.
 */
export function resolveBayPolicy(params: {
  bay: BayConfig;
  plateBias: PlateBiasConfig;
  closenessNorm: number;
  boundaryType: number;
  activeMargin: boolean;
}): { noiseGate: number; rollDen: number; bias: number } {
  const { bay, plateBias, closenessNorm, boundaryType, activeMargin } = params;
  const bias = computePlateBias(closenessNorm, boundaryType, plateBias);
  const isActive = activeMargin || closenessNorm >= plateBias.threshold;
  const noiseGateBonus = bias > 0 ? Math.round(bias * plateBias.bayNoiseBonus) : 0;
  const noiseGate = 2 + bay.noiseGateAdd + (isActive ? 1 : 0) + noiseGateBonus;

  let rollDen = isActive ? bay.rollDenActive : bay.rollDenDefault;
  if (plateBias.bayWeight > 0 && bias !== 0) {
    const scale = clamp(1 + bias * plateBias.bayWeight, 0.25, 4);
    rollDen = Math.max(1, Math.round(rollDen / scale));
  }
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
}): number {
  const { fjord, plateBias, bias, nearActive, nearPassive } = params;
  const denom = fjord.baseDenom - (nearPassive ? fjord.passiveBonus : 0) - (nearActive ? fjord.activeBonus : 0);
  let denomUsed = Math.max(1, Math.round(denom));

  if (plateBias.fjordWeight > 0 && bias !== 0) {
    const fjScale = clamp(1 + bias * plateBias.fjordWeight, 0.2, 5);
    denomUsed = Math.max(1, Math.round(denomUsed / fjScale));
  }

  return denomUsed;
}

import type { PlanIslandChainsTypes } from "../types.js";

type LabelRng = (range: number, label: string) => number;

type IslandConfig = PlanIslandChainsTypes["config"]["default"]["islands"];
type HotspotConfig = PlanIslandChainsTypes["config"]["default"]["hotspot"];

/**
 * Ensures island-chain inputs match the expected map size.
 */
export function validateIslandInputs(
  input: PlanIslandChainsTypes["input"]
): {
  size: number;
  landMask: Uint8Array;
  seaLaneMask: Uint8Array;
  activeMarginMask: Uint8Array;
  passiveShelfMask: Uint8Array;
  hotspotMask: Uint8Array;
  fractal: Int16Array;
} {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const landMask = input.landMask as Uint8Array;
  const seaLaneMask = input.seaLaneMask as Uint8Array;
  const activeMarginMask = input.activeMarginMask as Uint8Array;
  const passiveShelfMask = input.passiveShelfMask as Uint8Array;
  const hotspotMask = input.hotspotMask as Uint8Array;
  const fractal = input.fractal as Int16Array;
  if (
    landMask.length !== size ||
    seaLaneMask.length !== size ||
    activeMarginMask.length !== size ||
    passiveShelfMask.length !== size ||
    hotspotMask.length !== size ||
    fractal.length !== size
  ) {
    throw new Error("[IslandChains] Input tensors must match width*height.");
  }
  return { size, landMask, seaLaneMask, activeMarginMask, passiveShelfMask, hotspotMask, fractal };
}

/**
 * Normalizes island placement tunables from authored config.
 */
export function normalizeIslandTunables(config: PlanIslandChainsTypes["config"]["default"]): {
  threshold: number;
  minDist: number;
  seaLaneRadius: number;
  baseDenActive: number;
  baseDenElse: number;
  hotspotDenom: number;
  microcontinentChance: number;
} {
  const islandsCfg = config.islands;
  return {
    threshold: islandsCfg.fractalThresholdPercent / 100,
    minDist: Math.max(0, islandsCfg.minDistFromLandRadius | 0),
    seaLaneRadius: Math.max(0, config.seaLaneAvoidRadius | 0),
    baseDenActive: Math.max(1, islandsCfg.baseIslandDenNearActive | 0),
    baseDenElse: Math.max(1, islandsCfg.baseIslandDenElse | 0),
    hotspotDenom: Math.max(1, islandsCfg.hotspotSeedDenom | 0),
    microcontinentChance: islandsCfg.microcontinentChance,
  };
}

/**
 * Checks whether any mask tile is within a square radius.
 */
export function isWithinRadius(
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
  mask: Uint8Array
): boolean {
  if (radius <= 0) return false;
  const r = Math.max(0, radius | 0);
  for (let dy = -r; dy <= r; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    const row = ny * width;
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx;
      if (nx < 0 || nx >= width) continue;
      if (mask[row + nx] === 1) return true;
    }
  }
  return false;
}

/**
 * Determines whether a tile can seed an island chain.
 */
export function shouldSeedIsland(params: {
  fractalNorm: number;
  threshold: number;
  baseDenom: number;
  hotspotMask: boolean;
  hotspotDenom: number;
  microcontinentChance: number;
  rng: LabelRng;
}): boolean {
  const { fractalNorm, threshold, baseDenom, hotspotMask, hotspotDenom, microcontinentChance, rng } = params;
  const baseAllowed = fractalNorm >= threshold && rng(baseDenom, "island-seed") === 0;
  const hotspotAllowed = hotspotMask && rng(hotspotDenom, "hotspot-seed") === 0;
  const microAllowed =
    microcontinentChance > 0 && rng(1000, "microcontinent") / 1000 < microcontinentChance;
  return baseAllowed || hotspotAllowed || microAllowed;
}

/**
 * Chooses island terrain kind based on hotspot biases.
 */
export function selectIslandKind(params: {
  hotspotMask: boolean;
  hotspotConfig: HotspotConfig;
  rng: LabelRng;
}): "coast" | "peak" {
  const { hotspotMask, hotspotConfig, rng } = params;
  if (!hotspotMask) return "coast";

  const paradiseWeight = Math.max(0, hotspotConfig.paradiseBias);
  const volcanicWeight = Math.max(0, hotspotConfig.volcanicBias);
  const peakPercent = Math.max(
    0,
    Math.min(100, Math.round(hotspotConfig.volcanicPeakChance * 100) + 10)
  );

  const bucket = paradiseWeight + volcanicWeight;
  const roll = rng(Math.max(1, Math.round(bucket)), "hotspot-kind");
  const isParadise = roll < paradiseWeight;
  if (!isParadise && rng(100, "hotspot-peak") < peakPercent) {
    return "peak";
  }
  return "coast";
}

/**
 * Resolves cluster size for island seeds.
 */
export function resolveClusterCount(islands: IslandConfig, rng: LabelRng): number {
  const clusterMax = Math.max(1, islands.clusterMax | 0);
  return 1 + rng(clusterMax, "island-cluster");
}

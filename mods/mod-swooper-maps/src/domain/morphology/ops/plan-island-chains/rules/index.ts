import type { PlanIslandChainsTypes } from "../types.js";

type LabelRng = (range: number, label: string) => number;

type IslandConfig = PlanIslandChainsTypes["config"]["default"]["islands"];

/**
 * Ensures island-chain inputs match the expected map size.
 */
export function validateIslandInputs(
  input: PlanIslandChainsTypes["input"]
): {
  size: number;
  landMask: Uint8Array;
  boundaryCloseness: Uint8Array;
  boundaryType: Uint8Array;
  volcanism: Uint8Array;
} {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const landMask = input.landMask as Uint8Array;
  const boundaryCloseness = input.boundaryCloseness as Uint8Array;
  const boundaryType = input.boundaryType as Uint8Array;
  const volcanism = input.volcanism as Uint8Array;
  if (
    landMask.length !== size ||
    boundaryCloseness.length !== size ||
    boundaryType.length !== size ||
    volcanism.length !== size
  ) {
    throw new Error("[IslandChains] Input tensors must match width*height.");
  }
  return { size, landMask, boundaryCloseness, boundaryType, volcanism };
}

/**
 * Normalizes island placement tunables from authored config.
 */
export function normalizeIslandTunables(config: PlanIslandChainsTypes["config"]["default"]): {
  threshold: number;
  minDist: number;
  baseDenActive: number;
  baseDenElse: number;
  hotspotDenom: number;
  microcontinentChance: number;
} {
  const islandsCfg = config.islands;
  return {
    threshold: islandsCfg.fractalThresholdPercent / 100,
    minDist: Math.max(0, islandsCfg.minDistFromLandRadius | 0),
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
  noiseValue: number;
  threshold: number;
  baseDenom: number;
  hotspotSignal: number;
  hotspotDenom: number;
  rng: LabelRng;
}): boolean {
  const { noiseValue, threshold, baseDenom, hotspotSignal, hotspotDenom, rng } = params;
  const baseAllowed = noiseValue >= threshold && rng(baseDenom, "island-seed") === 0;
  const hotspotWeight = Math.max(0, Math.min(1, hotspotSignal));
  const hotspotDenomUsed = Math.max(1, Math.round(hotspotDenom / Math.max(0.1, hotspotWeight)));
  const hotspotAllowed = hotspotWeight > 0 && rng(hotspotDenomUsed, "hotspot-seed") === 0;
  return baseAllowed || hotspotAllowed;
}

/**
 * Chooses island terrain kind based on volcanism signal.
 */
export function selectIslandKind(params: {
  hotspotSignal: number;
  rng: LabelRng;
}): "coast" | "peak" {
  const { hotspotSignal, rng } = params;
  if (hotspotSignal <= 0) return "coast";
  const peakChance = Math.max(0, Math.min(1, 0.15 + hotspotSignal * 0.55));
  return rng(1000, "hotspot-peak") / 1000 < peakChance ? "peak" : "coast";
}

/**
 * Resolves cluster size for island seeds.
 */
export function resolveClusterCount(islands: IslandConfig, rng: LabelRng): number {
  const clusterMax = Math.max(1, islands.clusterMax | 0);
  return 1 + rng(clusterMax, "island-cluster");
}

import { clamp } from "@swooper/mapgen-core/lib/math";

import type { PlanVolcanoesTypes } from "../types.js";

type LabelRng = (range: number, label: string) => number;

type VolcanoConfig = PlanVolcanoesTypes["config"]["default"];

const BOUNDARY_CONVERGENT = 1;
const BOUNDARY_DIVERGENT = 2;
const BOUNDARY_TRANSFORM = 3;

/**
 * Ensures volcano inputs match the expected map size.
 */
export function validateVolcanoInputs(
  input: PlanVolcanoesTypes["input"]
): {
  size: number;
  landMask: Uint8Array;
  boundaryCloseness: Uint8Array;
  boundaryType: Uint8Array;
  shieldStability: Uint8Array;
  hotspotMask: Uint8Array;
} {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const landMask = input.landMask as Uint8Array;
  const boundaryCloseness = input.boundaryCloseness as Uint8Array;
  const boundaryType = input.boundaryType as Uint8Array;
  const shieldStability = input.shieldStability as Uint8Array;
  const hotspotMask = input.hotspotMask as Uint8Array;

  if (
    landMask.length !== size ||
    boundaryCloseness.length !== size ||
    boundaryType.length !== size ||
    shieldStability.length !== size ||
    hotspotMask.length !== size
  ) {
    throw new Error("[Volcanoes] Input tensors must match width*height.");
  }

  return { size, landMask, boundaryCloseness, boundaryType, shieldStability, hotspotMask };
}

/**
 * Computes the desired volcano count from land coverage and config.
 */
export function resolveTargetVolcanoes(landTiles: number, config: VolcanoConfig): number {
  const rawDesired = Math.round(landTiles * Math.max(0, config.baseDensity));
  const minVolcanoes = Math.max(0, Math.round(config.minVolcanoes));
  const maxVolcanoes =
    config.maxVolcanoes > 0 ? Math.max(0, Math.round(config.maxVolcanoes)) : rawDesired;
  return clamp(
    Math.max(minVolcanoes, rawDesired),
    minVolcanoes,
    maxVolcanoes > 0 ? maxVolcanoes : rawDesired
  );
}

/**
 * Normalizes placement tuning values used by the volcano planner.
 */
export function normalizeVolcanoTuning(config: VolcanoConfig): {
  hotspotBase: number;
  threshold: number;
  shieldWeight: number;
  jitter: number;
  minSpacing: number;
} {
  return {
    hotspotBase: Math.max(0, config.hotspotWeight),
    threshold: clamp(config.boundaryThreshold, 0, 1),
    shieldWeight: clamp(config.shieldPenalty, 0, 1),
    jitter: Math.max(0, config.randomJitter),
    minSpacing: Math.max(1, Math.round(config.minSpacing)),
  };
}

/**
 * Scores a tile for volcano placement based on boundary type and hotspot bias.
 */
export function scoreVolcanoWeight(params: {
  closeness: number;
  boundaryType: number;
  hotspotBase: number;
  hotspotBoost: number;
  threshold: number;
  boundaryWeight: number;
  convergentMultiplier: number;
  transformMultiplier: number;
  divergentMultiplier: number;
}): number {
  const {
    closeness,
    boundaryType,
    hotspotBase,
    hotspotBoost,
    threshold,
    boundaryWeight,
    convergentMultiplier,
    transformMultiplier,
    divergentMultiplier,
  } = params;

  let weight = 0;

  if (closeness >= threshold) {
    const boundaryBand = (closeness - threshold) / Math.max(1e-3, 1 - threshold);
    const base = boundaryBand * Math.max(0, boundaryWeight);
    let multiplier = 1;
    if (boundaryType === BOUNDARY_CONVERGENT) multiplier = Math.max(0, convergentMultiplier);
    else if (boundaryType === BOUNDARY_TRANSFORM) multiplier = Math.max(0, transformMultiplier);
    else if (boundaryType === BOUNDARY_DIVERGENT) multiplier = Math.max(0, divergentMultiplier);
    weight += base * multiplier;
  } else {
    const interiorBand = 1 - closeness;
    weight += hotspotBase * interiorBand;
  }

  if (hotspotBoost > 0) {
    weight += hotspotBoost;
  }

  return weight;
}

/**
 * Applies shield stability penalty and jitter to a candidate weight.
 */
export function applyVolcanoWeightAdjustments(params: {
  weight: number;
  shield: number;
  shieldPenalty: number;
  jitter: number;
  rng: LabelRng;
}): number {
  const { weight, shield, shieldPenalty, jitter, rng } = params;
  let adjusted = weight;
  if (shieldPenalty > 0) {
    const penalty = shield * shieldPenalty;
    adjusted *= Math.max(0, 1 - penalty);
  }
  if (jitter > 0) {
    const randomScale = rng(1000, "volcano-jitter") / 1000;
    adjusted += randomScale * jitter;
  }
  return adjusted;
}

/**
 * Checks whether a candidate is too close to an existing placement.
 */
export function isTooClose(
  x: number,
  y: number,
  placed: Array<{ x: number; y: number }>,
  minSpacing: number
): boolean {
  for (const entry of placed) {
    const dx = Math.abs(x - entry.x);
    const dy = Math.abs(y - entry.y);
    const dist = Math.max(dx, dy);
    if (dist < minSpacing) return true;
  }
  return false;
}

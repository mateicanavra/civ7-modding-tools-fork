import { clamp } from "@swooper/mapgen-core/lib/math";
import { normalizeFractal } from "@swooper/mapgen-core/lib/noise";

import type { PlanRidgesAndFoothillsTypes } from "../types.js";

const BOUNDARY_CONVERGENT = 1;
const BOUNDARY_DIVERGENT = 2;
const BOUNDARY_TRANSFORM = 3;

/**
 * Ensures ridge/foothill inputs match the expected map size.
 */
export function validateRidgesInputs(
  input: PlanRidgesAndFoothillsTypes["input"]
): {
  size: number;
  landMask: Uint8Array;
  boundaryCloseness: Uint8Array;
  boundaryType: Uint8Array;
  upliftPotential: Uint8Array;
  riftPotential: Uint8Array;
  tectonicStress: Uint8Array;
  fractalMountain: Int16Array;
  fractalHill: Int16Array;
} {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const landMask = input.landMask as Uint8Array;
  const boundaryCloseness = input.boundaryCloseness as Uint8Array;
  const boundaryType = input.boundaryType as Uint8Array;
  const upliftPotential = input.upliftPotential as Uint8Array;
  const riftPotential = input.riftPotential as Uint8Array;
  const tectonicStress = input.tectonicStress as Uint8Array;
  const fractalMountain = input.fractalMountain as Int16Array;
  const fractalHill = input.fractalHill as Int16Array;

  if (
    landMask.length !== size ||
    boundaryCloseness.length !== size ||
    boundaryType.length !== size ||
    upliftPotential.length !== size ||
    riftPotential.length !== size ||
    tectonicStress.length !== size ||
    fractalMountain.length !== size ||
    fractalHill.length !== size
  ) {
    throw new Error("[RidgesFoothills] Input tensors must match width*height.");
  }

  return {
    size,
    landMask,
    boundaryCloseness,
    boundaryType,
    upliftPotential,
    riftPotential,
    tectonicStress,
    fractalMountain,
    fractalHill,
  };
}

/**
 * Converts boundary proximity into a normalized boundary strength.
 */
export function resolveBoundaryStrength(
  closenessNorm: number,
  boundaryGate: number,
  exponent: number
): number {
  const normalized =
    closenessNorm <= boundaryGate
      ? 0
      : (closenessNorm - boundaryGate) / Math.max(1e-6, 1 - boundaryGate);
  return Math.pow(normalized, exponent);
}

/**
 * Computes mountain score from tectonic signals and fractal noise.
 */
export function computeMountainScore(params: {
  boundaryStrength: number;
  boundaryType: number;
  uplift: number;
  stress: number;
  rift: number;
  fractal: number;
  config: PlanRidgesAndFoothillsTypes["config"]["default"];
}): number {
  const { boundaryStrength, boundaryType, uplift, stress, rift, fractal, config } = params;

  const scaledConvergenceBonus = config.convergenceBonus * config.tectonicIntensity;
  const scaledBoundaryWeight = config.boundaryWeight * config.tectonicIntensity;
  const scaledUpliftWeight = config.upliftWeight * config.tectonicIntensity;

  const collision = boundaryType === BOUNDARY_CONVERGENT ? boundaryStrength : 0;
  const transform = boundaryType === BOUNDARY_TRANSFORM ? boundaryStrength : 0;
  const divergence = boundaryType === BOUNDARY_DIVERGENT ? boundaryStrength : 0;

  let mountainScore =
    collision * scaledBoundaryWeight * (0.5 * stress + 0.5 * uplift) +
    uplift * scaledUpliftWeight * 0.5 +
    fractal * config.fractalWeight * 0.3;

  if (collision > 0) {
    mountainScore += collision * scaledConvergenceBonus * (0.6 + fractal * 0.4);
  }

  if (config.interiorPenaltyWeight > 0) {
    const penalty = clamp((1 - boundaryStrength) * config.interiorPenaltyWeight, 0, 1);
    mountainScore *= Math.max(0, 1 - penalty);
  }

  if (divergence > 0) {
    mountainScore *= Math.max(0, 1 - divergence * config.riftPenalty);
  }
  if (transform > 0) {
    mountainScore *= Math.max(0, 1 - transform * config.transformPenalty);
  }

  if (config.riftDepth > 0 && boundaryType === BOUNDARY_DIVERGENT) {
    mountainScore = Math.max(0, mountainScore - rift * config.riftDepth);
  }

  return Math.max(0, mountainScore);
}

/**
 * Computes hill score from tectonic signals and fractal noise.
 */
export function computeHillScore(params: {
  boundaryStrength: number;
  boundaryType: number;
  uplift: number;
  rift: number;
  fractal: number;
  config: PlanRidgesAndFoothillsTypes["config"]["default"];
}): number {
  const { boundaryStrength, boundaryType, uplift, rift, fractal, config } = params;

  const scaledHillBoundaryWeight = config.hillBoundaryWeight * config.tectonicIntensity;
  const scaledHillConvergentFoothill = config.hillConvergentFoothill * config.tectonicIntensity;

  const collision = boundaryType === BOUNDARY_CONVERGENT ? boundaryStrength : 0;
  const divergence = boundaryType === BOUNDARY_DIVERGENT ? boundaryStrength : 0;

  const hillIntensity = Math.sqrt(boundaryStrength);
  const foothillExtent = 0.5 + fractal * 0.5;
  let hillScore = fractal * config.fractalWeight * 0.8 + uplift * config.hillUpliftWeight * 0.3;

  if (collision > 0 && config.hillBoundaryWeight > 0) {
    hillScore += hillIntensity * scaledHillBoundaryWeight * foothillExtent;
    hillScore += hillIntensity * scaledHillConvergentFoothill * foothillExtent;
  }

  if (divergence > 0) {
    hillScore += hillIntensity * rift * config.hillRiftBonus * foothillExtent * 0.5;
  }

  if (config.hillInteriorFalloff > 0) {
    const penalty = clamp((1 - hillIntensity) * config.hillInteriorFalloff, 0, 1);
    hillScore *= Math.max(0, 1 - penalty);
  }

  if (config.riftDepth > 0 && boundaryType === BOUNDARY_DIVERGENT) {
    hillScore = Math.max(0, hillScore - rift * config.riftDepth * 0.5);
  }

  return Math.max(0, hillScore);
}

/**
 * Normalizes fractal values to a 0..1 range.
 */
export function normalizeRidgeFractal(value: number): number {
  return normalizeFractal(value);
}

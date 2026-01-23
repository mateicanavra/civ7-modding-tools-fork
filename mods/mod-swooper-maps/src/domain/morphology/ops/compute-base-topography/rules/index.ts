import { clamp } from "@swooper/mapgen-core/lib/math";

import type { ComputeBaseTopographyTypes } from "../types.js";

/**
 * Ensures base-topography inputs match the expected map size.
 */
export function validateBaseTopographyInputs(
  input: ComputeBaseTopographyTypes["input"]
): {
  size: number;
  crustBaseElevation: Float32Array;
  uplift: Uint8Array;
  rift: Uint8Array;
  closeness: Uint8Array;
} {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const crustBaseElevation = input.crustBaseElevation as Float32Array;
  const uplift = input.upliftPotential as Uint8Array;
  const rift = input.riftPotential as Uint8Array;
  const closeness = input.boundaryCloseness as Uint8Array;
  if (crustBaseElevation.length !== size || uplift.length !== size || rift.length !== size || closeness.length !== size) {
    throw new Error("[BaseTopography] Input tensors must match width*height.");
  }
  return { size, crustBaseElevation, uplift, rift, closeness };
}

/**
 * Converts uplift + boundary proximity into a blended uplift intensity.
 */
export function computeUpliftBlend(params: {
  upliftNorm: number;
  closenessNorm: number;
  interiorNoiseWeight: number;
  boundaryArcWeight: number;
  clusteringBias: number;
}): number {
  const { upliftNorm, closenessNorm, interiorNoiseWeight, boundaryArcWeight, clusteringBias } = params;
  const interiorBoost = clusteringBias * (1 - closenessNorm) * 0.2;
  return clamp(upliftNorm * (interiorNoiseWeight + closenessNorm * boundaryArcWeight) + interiorBoost, 0, 1);
}

/**
 * Computes a raw elevation sample before edge blending and scaling.
 */
export function computeElevationRaw(params: {
  crustBaseElevation01: number;
  upliftNorm: number;
  riftNorm: number;
  closenessNorm: number;
  noise: number;
  arcNoise: number;
  config: ComputeBaseTopographyTypes["config"]["default"];
}): number {
  const { crustBaseElevation01, upliftNorm, riftNorm, closenessNorm, noise, arcNoise, config } = params;
  const upliftBlend = computeUpliftBlend({
    upliftNorm,
    closenessNorm,
    interiorNoiseWeight: config.tectonics.interiorNoiseWeight,
    boundaryArcWeight: config.tectonics.boundaryArcWeight,
    clusteringBias: config.clusteringBias,
  });
  const reliefSpan = config.continentalHeight - config.oceanicHeight;
  const crust01 = clamp(crustBaseElevation01, 0, 1);
  const base = config.oceanicHeight + reliefSpan * crust01;
  const boundaryBoost = config.boundaryBias * closenessNorm;
  const upliftEffect = upliftBlend * reliefSpan * 0.25;
  const riftPenalty = riftNorm * reliefSpan * 0.15;
  return base + upliftEffect + boundaryBoost - riftPenalty + noise + arcNoise * closenessNorm;
}

/**
 * Blends elevation toward neighborhood averages near boundaries.
 */
export function blendBoundaryElevation(params: {
  base: number;
  neighborAverage: number;
  closenessNorm: number;
  edgeBlend: number;
}): number {
  const { base, neighborAverage, closenessNorm, edgeBlend } = params;
  const blend = clamp(edgeBlend * closenessNorm, 0, 1);
  return base * (1 - blend) + neighborAverage * blend;
}

const DEFAULT_ELEVATION_SCALE = 100;

/**
 * Quantizes a raw elevation sample into the canonical Int16 elevation scale.
 */
export function quantizeElevation(value: number): number {
  return clamp(Math.round(value * DEFAULT_ELEVATION_SCALE), -32768, 32767);
}

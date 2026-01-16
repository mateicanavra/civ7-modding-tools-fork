import type { ComputeSubstrateTypes } from "../types.js";

/**
 * Ensures substrate inputs match the expected map size.
 */
export function validateSubstrateInputs(input: ComputeSubstrateTypes["input"]): number {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const uplift = input.upliftPotential as Uint8Array;
  const rift = input.riftPotential as Uint8Array;
  if (uplift.length !== size || rift.length !== size) {
    throw new Error("[Substrate] Input tensors must match width*height.");
  }
  return size;
}

/**
 * Computes erodibility from uplift potential and tuned scaling.
 */
export function erodibilityForTile(
  config: ComputeSubstrateTypes["config"]["default"],
  upliftValue: number
): number {
  return config.baseErodibility + (upliftValue / 255) * config.upliftErodibilityBoost;
}

/**
 * Computes sediment depth from rift potential and tuned scaling.
 */
export function sedimentDepthForTile(
  config: ComputeSubstrateTypes["config"]["default"],
  riftValue: number
): number {
  return config.baseSediment + (riftValue / 255) * config.riftSedimentBoost;
}

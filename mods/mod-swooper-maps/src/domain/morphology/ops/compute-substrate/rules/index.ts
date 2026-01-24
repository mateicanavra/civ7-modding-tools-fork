import type { ComputeSubstrateTypes } from "../types.js";

/**
 * Ensures substrate inputs match the expected map size.
 */
export function validateSubstrateInputs(input: ComputeSubstrateTypes["input"]): number {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const uplift = input.upliftPotential as Uint8Array;
  const rift = input.riftPotential as Uint8Array;
  const boundaryCloseness = input.boundaryCloseness as Uint8Array;
  const boundaryType = input.boundaryType as Uint8Array;
  const crustType = input.crustType as Uint8Array;
  const crustAge = input.crustAge as Uint8Array;
  if (
    uplift.length !== size ||
    rift.length !== size ||
    boundaryCloseness.length !== size ||
    boundaryType.length !== size ||
    crustType.length !== size ||
    crustAge.length !== size
  ) {
    throw new Error("[Substrate] Input tensors must match width*height.");
  }
  return size;
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function boundaryErodibilityBoost(
  config: ComputeSubstrateTypes["config"]["default"],
  boundaryType: number
): number {
  switch (boundaryType | 0) {
    case 1:
      return config.convergentBoundaryErodibilityBoost;
    case 2:
      return config.divergentBoundaryErodibilityBoost;
    case 3:
      return config.transformBoundaryErodibilityBoost;
    default:
      // boundaryType is only defined on the boundary itself, but boundaryCloseness
      // is a distance falloff field. For interior tiles, apply a generic proximity
      // boost so closeness affects non-boundary tiles too.
      return clampNonNegative(
        (config.convergentBoundaryErodibilityBoost +
          config.divergentBoundaryErodibilityBoost +
          config.transformBoundaryErodibilityBoost) /
          3
      );
  }
}

function boundarySedimentBoost(
  config: ComputeSubstrateTypes["config"]["default"],
  boundaryType: number
): number {
  switch (boundaryType | 0) {
    case 1:
      return config.convergentBoundarySedimentBoost;
    case 2:
      return config.divergentBoundarySedimentBoost;
    case 3:
      return config.transformBoundarySedimentBoost;
    default:
      return clampNonNegative(
        (config.convergentBoundarySedimentBoost +
          config.divergentBoundarySedimentBoost +
          config.transformBoundarySedimentBoost) /
          3
      );
  }
}

/**
 * Computes erodibility from crust/material and tectonic drivers.
 */
export function erodibilityForTile(
  config: ComputeSubstrateTypes["config"]["default"],
  upliftValue: number,
  boundaryClosenessValue: number,
  boundaryTypeValue: number,
  crustTypeValue: number,
  crustAgeValue: number
): number {
  const uplift01 = (upliftValue ?? 0) / 255;
  const closeness01 = (boundaryClosenessValue ?? 0) / 255;
  const age01 = (crustAgeValue ?? 0) / 255;
  const isContinental = (crustTypeValue | 0) === 1;

  const base = isContinental ? config.continentalBaseErodibility : config.oceanicBaseErodibility;
  const aged = base * (1 - age01 * config.ageErodibilityReduction);
  const boundary = closeness01 * boundaryErodibilityBoost(config, boundaryTypeValue ?? 0);
  const uplift = uplift01 * config.upliftErodibilityBoost;

  return clampNonNegative(aged + boundary + uplift);
}

/**
 * Computes sediment depth from crust/material and tectonic drivers.
 */
export function sedimentDepthForTile(
  config: ComputeSubstrateTypes["config"]["default"],
  riftValue: number,
  boundaryClosenessValue: number,
  boundaryTypeValue: number,
  crustTypeValue: number,
  crustAgeValue: number
): number {
  const rift01 = (riftValue ?? 0) / 255;
  const closeness01 = (boundaryClosenessValue ?? 0) / 255;
  const age01 = (crustAgeValue ?? 0) / 255;
  const isContinental = (crustTypeValue | 0) === 1;

  const base = isContinental ? config.continentalBaseSediment : config.oceanicBaseSediment;
  const aged = base + age01 * config.ageSedimentBoost;
  const boundary = closeness01 * boundarySedimentBoost(config, boundaryTypeValue ?? 0);
  const rift = rift01 * config.riftSedimentBoost;

  return clampNonNegative(aged + boundary + rift);
}

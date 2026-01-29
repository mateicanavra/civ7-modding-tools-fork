import { clamp } from "@swooper/mapgen-core/lib/math";

import type { ComputeSeaLevelTypes } from "../types.js";

type LabelRng = (range: number, label: string) => number;

const DEFAULT_BOUNDARY_THRESHOLD = 200;
const DEFAULT_TARGET_STEP = 5;
const MAX_ITERATIONS = 8;

/**
 * Ensures sea-level inputs match the expected map size.
 */
export function validateSeaLevelInputs(
  input: ComputeSeaLevelTypes["input"]
): {
  size: number;
  elevation: Int16Array;
  crustType: Uint8Array;
  boundaryCloseness: Uint8Array;
} {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const elevation = input.elevation as Int16Array;
  const crustType = input.crustType as Uint8Array;
  const boundaryCloseness = input.boundaryCloseness as Uint8Array;
  if (elevation.length !== size || crustType.length !== size || boundaryCloseness.length !== size) {
    throw new Error("[SeaLevel] Input tensors must match width*height.");
  }
  return { size, elevation, crustType, boundaryCloseness };
}

/**
 * Applies variance to the target water percent using a deterministic RNG.
 */
export function resolveTargetPercent(
  config: ComputeSeaLevelTypes["config"]["default"],
  rng: LabelRng
): number {
  const targetBase = config.targetWaterPercent;
  const targetScaled = targetBase * config.targetScalar;
  const variance = config.variance;
  const jitter = variance > 0 ? ((rng(1000, "sea-level") / 1000) * 2 - 1) * variance : 0;
  return clamp(targetScaled + jitter, 0, 100);
}

/**
 * Chooses a sea level that satisfies boundary/continental targets when provided.
 */
export function resolveSeaLevel(params: {
  values: number[];
  targetPct: number;
  elevation: Int16Array;
  crustType: Uint8Array;
  boundaryCloseness: Uint8Array;
  boundaryTarget: number | null;
  continentalTarget: number | null;
  boundaryThreshold?: number;
}): number {
  const {
    values,
    targetPct: initialTarget,
    elevation,
    crustType,
    boundaryCloseness,
    boundaryTarget,
    continentalTarget,
    boundaryThreshold = DEFAULT_BOUNDARY_THRESHOLD,
  } = params;

  if (values.length === 0) return 0;

  const targetPctStep = DEFAULT_TARGET_STEP;
  const clampPct = (pct: number): number => clamp(pct, 0, 100);
  const resolveSeaLevelAtPct = (pct: number): number => {
    const clamped = clampPct(pct);
    const idx = Math.min(values.length - 1, Math.max(0, Math.floor((clamped / 100) * values.length)));
    return values[idx] ?? 0;
  };

  const evaluate = (candidateSeaLevel: number): { error: number; seaLevel: number } => {
    let landCount = 0;
    let boundaryLand = 0;
    let continentalLand = 0;
    const size = elevation.length;
    for (let i = 0; i < size; i++) {
      if (elevation[i] <= candidateSeaLevel) continue;
      landCount++;
      if (boundaryCloseness[i] >= boundaryThreshold) boundaryLand++;
      if ((crustType[i] ?? 0) === 1) continentalLand++;
    }

    const boundaryShare = landCount > 0 ? boundaryLand / landCount : 0;
    const continentalShare = landCount > 0 ? continentalLand / landCount : 0;
    const boundaryOk = boundaryTarget == null || boundaryShare >= boundaryTarget;
    const continentalOk = continentalTarget == null || continentalShare >= continentalTarget;

    const boundaryErr = boundaryTarget == null ? 0 : Math.max(0, boundaryTarget - boundaryShare);
    const continentalErr = continentalTarget == null ? 0 : Math.max(0, continentalTarget - continentalShare);
    const error = boundaryErr + continentalErr;

    return { error, seaLevel: candidateSeaLevel };
  };

  let targetPct = clampPct(initialTarget);
  let seaLevel = resolveSeaLevelAtPct(targetPct);
  let current = evaluate(seaLevel);

  for (let iter = 0; iter <= MAX_ITERATIONS; iter++) {
    if (current.error <= 0) break;

    const downPct = clampPct(targetPct - targetPctStep);
    const upPct = clampPct(targetPct + targetPctStep);

    const downSea = resolveSeaLevelAtPct(downPct);
    const upSea = resolveSeaLevelAtPct(upPct);

    const down = evaluate(downSea);
    const up = evaluate(upSea);

    // Pick the direction that best reduces constraint error; stop if we can't improve.
    let nextPct = targetPct;
    let next = current;
    if (down.error < next.error || up.error < next.error) {
      if (up.error <= down.error) {
        nextPct = upPct;
        next = up;
      } else {
        nextPct = downPct;
        next = down;
      }
    } else {
      break;
    }

    targetPct = nextPct;
    seaLevel = next.seaLevel;
    current = next;
  }

  return seaLevel;
}

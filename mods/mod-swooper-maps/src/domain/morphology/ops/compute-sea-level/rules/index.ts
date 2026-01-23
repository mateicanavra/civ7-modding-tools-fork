import { clamp } from "@swooper/mapgen-core/lib/math";

import type { ComputeSeaLevelTypes } from "../types.js";

type LabelRng = (range: number, label: string) => number;

const DEFAULT_BOUNDARY_THRESHOLD = 200;
const DEFAULT_UPLIFT_THRESHOLD = 128;
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
  boundaryCloseness: Uint8Array;
  upliftPotential: Uint8Array;
} {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const elevation = input.elevation as Int16Array;
  const boundaryCloseness = input.boundaryCloseness as Uint8Array;
  const upliftPotential = input.upliftPotential as Uint8Array;
  if (elevation.length !== size || boundaryCloseness.length !== size || upliftPotential.length !== size) {
    throw new Error("[SeaLevel] Input tensors must match width*height.");
  }
  return { size, elevation, boundaryCloseness, upliftPotential };
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
  boundaryCloseness: Uint8Array;
  upliftPotential: Uint8Array;
  boundaryTarget: number | null;
  continentalTarget: number | null;
  boundaryThreshold?: number;
  upliftThreshold?: number;
}): number {
  const {
    values,
    targetPct: initialTarget,
    elevation,
    boundaryCloseness,
    upliftPotential,
    boundaryTarget,
    continentalTarget,
    boundaryThreshold = DEFAULT_BOUNDARY_THRESHOLD,
    upliftThreshold = DEFAULT_UPLIFT_THRESHOLD,
  } = params;

  if (values.length === 0) return 0;

  function clampPct(value: number): number {
    return clamp(value, 0, 100);
  }

  function seaLevelAtTargetPct(targetPct: number): number {
    const pct = clampPct(targetPct);
    const targetIndex = Math.min(values.length - 1, Math.max(0, Math.floor((pct / 100) * values.length)));
    return values[targetIndex] ?? 0;
  }

  function scoreCandidate(params: {
    seaLevel: number;
    targetPct: number;
  }): {
    ok: boolean;
    satisfaction: number;
    delta: number;
  } {
    const seaLevel = params.seaLevel;
    let landCount = 0;
    let boundaryLand = 0;
    let upliftLand = 0;
    const size = elevation.length;
    for (let i = 0; i < size; i++) {
      if (elevation[i] <= seaLevel) continue;
      landCount++;
      if (boundaryCloseness[i] >= boundaryThreshold) boundaryLand++;
      if (upliftPotential[i] >= upliftThreshold) upliftLand++;
    }

    const boundaryShare = landCount > 0 ? boundaryLand / landCount : 0;
    const continentalShare = landCount > 0 ? upliftLand / landCount : 0;
    const boundaryOk = boundaryTarget == null || boundaryShare >= boundaryTarget;
    const continentalOk = continentalTarget == null || continentalShare >= continentalTarget;

    const boundarySat =
      boundaryTarget == null ? 1 : boundaryTarget <= 0 ? 1 : boundaryShare / Math.max(1e-6, boundaryTarget);
    const continentalSat =
      continentalTarget == null
        ? 1
        : continentalTarget <= 0
          ? 1
          : continentalShare / Math.max(1e-6, continentalTarget);
    const satisfaction = Math.min(boundarySat, continentalSat);

    return {
      ok: boundaryOk && continentalOk,
      satisfaction,
      delta: Math.abs(clampPct(params.targetPct) - clampPct(initialTarget)),
    };
  }

  const maxDelta = DEFAULT_TARGET_STEP * MAX_ITERATIONS;
  const targetPcts: number[] = [];
  const seen = new Set<number>();

  const addPct = (v: number) => {
    const pct = clampPct(v);
    // Keep the candidate grid stable at step resolution.
    const key = Math.round(pct / DEFAULT_TARGET_STEP) * DEFAULT_TARGET_STEP;
    const normalized = clampPct(key);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    targetPcts.push(normalized);
  };

  addPct(initialTarget);
  for (let delta = DEFAULT_TARGET_STEP; delta <= maxDelta; delta += DEFAULT_TARGET_STEP) {
    addPct(initialTarget + delta);
    addPct(initialTarget - delta);
  }

  let bestOk: { seaLevel: number; score: ReturnType<typeof scoreCandidate> } | null = null;
  let bestAny: { seaLevel: number; score: ReturnType<typeof scoreCandidate> } | null = null;

  for (const targetPct of targetPcts) {
    const seaLevel = seaLevelAtTargetPct(targetPct);
    const score = scoreCandidate({ seaLevel, targetPct });

    if (bestAny == null) {
      bestAny = { seaLevel, score };
    } else {
      const a = score;
      const b = bestAny.score;
      if (a.satisfaction > b.satisfaction || (a.satisfaction === b.satisfaction && a.delta < b.delta)) {
        bestAny = { seaLevel, score };
      }
    }

    if (!score.ok) continue;
    if (bestOk == null) {
      bestOk = { seaLevel, score };
      continue;
    }

    const a = score;
    const b = bestOk.score;
    if (a.delta < b.delta || (a.delta === b.delta && a.satisfaction > b.satisfaction)) {
      bestOk = { seaLevel, score };
    }
  }

  return (bestOk ?? bestAny)?.seaLevel ?? 0;
}

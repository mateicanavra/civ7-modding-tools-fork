import { clamp01 } from "@swooper/mapgen-core";

import type { PedologyClassifyInput } from "../types.js";

export function ensureSize(array: ArrayLike<number>, expected: number, label: string): void {
  if (array.length !== expected) {
    throw new Error(`Pedology classify: expected ${label} length ${expected}, got ${array.length}.`);
  }
}

export function computeReliefProxy(
  slope: Float32Array | undefined,
  elevation: Int16Array,
  size: number
): Float32Array {
  if (slope && slope.length === size) {
    return slope;
  }
  // Fallback: normalize elevation magnitude as a proxy for relief.
  let maxAbs = 1;
  for (let i = 0; i < size; i++) {
    const value = Math.abs(elevation[i] ?? 0);
    if (value > maxAbs) maxAbs = value;
  }
  const result = new Float32Array(size);
  const inv = 1 / maxAbs;
  for (let i = 0; i < size; i++) {
    result[i] = clamp01(Math.abs(elevation[i] ?? 0) * inv);
  }
  return result;
}

export function fertilityForTile({
  rainfall,
  humidity,
  relief,
  sedimentDepth,
  bedrockAge,
  weights,
}: {
  rainfall: number;
  humidity: number;
  relief: number;
  sedimentDepth: number;
  bedrockAge: number;
  weights: {
    climateWeight: number;
    reliefWeight: number;
    sedimentWeight: number;
    bedrockWeight: number;
    fertilityCeiling: number;
  };
}): number {
  const moisture = clamp01((rainfall + humidity) / 510);
  const sedimentSignal = clamp01(sedimentDepth);
  const reliefPenalty = 1 - clamp01(relief);
  const bedrockSignal = clamp01(bedrockAge);

  const weighted =
    moisture * weights.climateWeight +
    reliefPenalty * weights.reliefWeight +
    sedimentSignal * weights.sedimentWeight +
    bedrockSignal * weights.bedrockWeight;

  const normalized = weighted / (weights.climateWeight + weights.reliefWeight + weights.sedimentWeight + weights.bedrockWeight || 1);
  return Math.min(weights.fertilityCeiling, clamp01(normalized));
}

export function soilPaletteIndex(fertility: number, relief: number, moisture: number): number {
  if (relief > 0.75) return 0; // rocky
  if (fertility > 0.7 && moisture > 0.5) return 2; // loam
  if (moisture > 0.65) return 3; // clayish / wet
  if (fertility < 0.35) return 1; // sandy
  return 2;
}

export function normalizeOptionalField(field: Float32Array | Int16Array | undefined, size: number): Float32Array {
  if (!field || field.length !== size) return new Float32Array(size);
  let max = 1;
  for (let i = 0; i < size; i++) {
    const value = Math.abs(field[i] ?? 0);
    if (value > max) max = value;
  }
  const inv = max === 0 ? 1 : 1 / max;
  const result = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    result[i] = clamp01(Math.abs(field[i] ?? 0) * inv);
  }
  return result;
}

export function validateInput(input: PedologyClassifyInput): number {
  const { width, height, landMask, elevation, rainfall, humidity } = input;
  const size = width * height;
  ensureSize(landMask, size, "landMask");
  ensureSize(elevation, size, "elevation");
  ensureSize(rainfall, size, "rainfall");
  ensureSize(humidity, size, "humidity");
  if (input.sedimentDepth) ensureSize(input.sedimentDepth, size, "sedimentDepth");
  if (input.bedrockAge) ensureSize(input.bedrockAge, size, "bedrockAge");
  if (input.slope) ensureSize(input.slope, size, "slope");
  return size;
}

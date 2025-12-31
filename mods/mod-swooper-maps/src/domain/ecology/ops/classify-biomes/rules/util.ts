export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function ensureSize(buffer: { length: number }, expected: number, label: string): void {
  if (buffer.length !== expected) {
    throw new Error(`classifyBiomes: ${label} length ${buffer.length} != expected ${expected}`);
  }
}

export function computeMaxLatitude(latitude: Float32Array): number {
  let max = 0;
  for (let i = 0; i < latitude.length; i++) {
    const val = Math.abs(latitude[i]!);
    if (val > max) max = val;
  }
  return Math.max(1, max);
}

/**
 * Returns a deterministic pseudo-random value in the 0..1 range.
 */
export function pseudoRandom01(index: number, seed: number): number {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Normalize fractal output to 0..1, adapting to engines that emit 8, 16, or 32-bit heights.
 * - Values > 65535 are treated as 32-bit; use the top 8 bits (>>> 24)
 * - Values > 255 are treated as 16-bit; use the top 8 bits (>>> 8)
 * - Values <= 255 are treated as 8-bit
 * - Negative values are clamped to 0 to avoid wrapping artifacts
 */
export function normalizeFractal(raw: number): number {
  const val = Math.trunc(raw);
  if (val <= 0) return 0;

  if (val > 65535) {
    return (val >>> 24) / 255;
  }
  if (val > 255) {
    return (val >>> 8) / 255;
  }
  return val / 255;
}


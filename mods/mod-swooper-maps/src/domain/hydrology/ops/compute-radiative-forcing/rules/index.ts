export function computeInsolationByLatitude(
  absLatDeg: number,
  options: { equator: number; pole: number; exponent: number }
): number {
  const t = Math.max(0, Math.min(1, absLatDeg / 90));
  const curve = Math.pow(t, Math.max(0.0001, options.exponent));
  return options.equator * (1 - curve) + options.pole * curve;
}

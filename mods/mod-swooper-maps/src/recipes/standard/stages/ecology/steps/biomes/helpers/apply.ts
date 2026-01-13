/**
 * Clamps a value to a 0..255 integer for engine byte fields.
 */
export function clampToByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

export const HEX_WIDTH = Math.sqrt(3);
export const HEX_HEIGHT = 1.5;
export const HALF_HEX_HEIGHT = HEX_HEIGHT / 2;

/**
 * Convert odd-q offset coordinates (tile space) to "hex space" coordinates.
 *
 * This is the canonical coordinate system for mesh-first computations:
 * - X scaled by `HEX_WIDTH`
 * - Y scaled by `HEX_HEIGHT` and offset by `HALF_HEX_HEIGHT` for odd columns
 */
export function projectOddqToHexSpace(x: number, y: number): { x: number; y: number } {
  const hx = x * HEX_WIDTH;
  const hy = y * HEX_HEIGHT + ((Math.floor(x) & 1) ? HALF_HEX_HEIGHT : 0);
  return { x: hx, y: hy };
}


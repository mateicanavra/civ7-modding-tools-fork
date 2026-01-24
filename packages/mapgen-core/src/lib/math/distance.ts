import { wrapDeltaPeriodic } from "@mapgen/lib/math/wrap.js";

export function distanceSqWrapped(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  wrapWidth: number
): number {
  const dx = wrapDeltaPeriodic(ax - bx, wrapWidth);
  const dy = ay - by;
  return dx * dx + dy * dy;
}


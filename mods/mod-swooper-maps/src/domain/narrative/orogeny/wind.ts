import type { ExtendedMapContext } from "@swooper/mapgen-core";

export function zonalWindStep(
  ctx: ExtendedMapContext,
  x: number,
  y: number
): { dx: number; dy: number } {
  const lat = Math.abs(ctx.adapter.getLatitude(x, y));
  return { dx: lat < 30 || lat >= 60 ? -1 : 1, dy: 0 };
}

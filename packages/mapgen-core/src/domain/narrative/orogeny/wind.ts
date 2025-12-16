import type { ExtendedMapContext } from "../../../core/types.js";

export function zonalWindStep(
  ctx: ExtendedMapContext | null | undefined,
  x: number,
  y: number
): { dx: number; dy: number } {
  try {
    const lat = Math.abs(ctx?.adapter?.getLatitude?.(x, y) ?? GameplayMap?.getPlotLatitude?.(x, y) ?? 0);
    return { dx: lat < 30 || lat >= 60 ? -1 : 1, dy: 0 };
  } catch {
    return { dx: 1, dy: 0 };
  }
}

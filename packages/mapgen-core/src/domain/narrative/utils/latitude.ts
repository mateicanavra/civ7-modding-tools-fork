import type { ExtendedMapContext } from "../../../core/types.js";

export function latitudeAbsDeg(
  ctx: ExtendedMapContext | null | undefined,
  x: number,
  y: number,
  height: number
): number {
  const adapter = ctx?.adapter;
  if (adapter?.getLatitude) {
    return Math.abs(adapter.getLatitude(x, y));
  }
  const norm = height > 0 ? y / height : 0;
  return Math.abs(90 - norm * 180);
}


import type { ExtendedMapContext } from "@mapgen/core/types.js";

export function isWaterAt(ctx: ExtendedMapContext | null | undefined, x: number, y: number): boolean {
  if (ctx?.adapter) return ctx.adapter.isWater(x, y);
  if (typeof GameplayMap !== "undefined" && GameplayMap?.isWater) return GameplayMap.isWater(x, y);
  return true;
}


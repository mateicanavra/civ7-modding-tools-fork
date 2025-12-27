import type { ExtendedMapContext } from "@mapgen/core/types.js";

export function isWaterAt(ctx: ExtendedMapContext, x: number, y: number): boolean {
  return ctx.adapter.isWater(x, y);
}

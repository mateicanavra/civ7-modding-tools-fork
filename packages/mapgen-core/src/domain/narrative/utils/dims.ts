import type { ExtendedMapContext } from "@mapgen/core/types.js";

export function getDims(ctx: ExtendedMapContext): { width: number; height: number } {
  return { width: ctx.dimensions.width, height: ctx.dimensions.height };
}

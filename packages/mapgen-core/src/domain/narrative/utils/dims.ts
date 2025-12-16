import type { ExtendedMapContext } from "../../../core/types.js";

export function getDims(ctx: ExtendedMapContext | null | undefined): { width: number; height: number } {
  if (ctx?.dimensions) {
    return { width: ctx.dimensions.width, height: ctx.dimensions.height };
  }
  const width = typeof GameplayMap !== "undefined" ? GameplayMap.getGridWidth() : 0;
  const height = typeof GameplayMap !== "undefined" ? GameplayMap.getGridHeight() : 0;
  return { width, height };
}


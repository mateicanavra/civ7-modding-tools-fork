import type { ExtendedMapContext } from "@swooper/mapgen-core";

export function getDims(ctx: ExtendedMapContext): { width: number; height: number } {
  return { width: ctx.dimensions.width, height: ctx.dimensions.height };
}

import type { ExtendedMapContext } from "../../../core/types.js";
import { ctxRandom } from "../../../core/types.js";

export function rand(ctx: ExtendedMapContext | null | undefined, label: string, max: number): number {
  const m = Math.max(1, max | 0);
  const lab = label || "Rand";

  if (ctx) return ctxRandom(ctx, lab, m);
  if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.getRandomNumber) {
    return TerrainBuilder.getRandomNumber(m, lab);
  }
  return Math.floor(Math.random() * m);
}


import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { ctxRandom } from "@swooper/mapgen-core";

export function rand(ctx: ExtendedMapContext | null | undefined, label: string, max: number): number {
  const m = Math.max(1, max | 0);
  const lab = label || "Rand";

  if (!ctx) {
    throw new Error("Narrative RNG requires MapContext (legacy fallback removed).");
  }
  return ctxRandom(ctx, lab, m);
}

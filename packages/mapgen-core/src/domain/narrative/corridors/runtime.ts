import type { ExtendedMapContext } from "../../../core/types.js";
import { isAdjacentToLand, isAdjacentToShallowWater, isCoastalLand } from "../utils/adjacency.js";
import { getDims } from "../utils/dims.js";
import { rand as baseRand } from "../utils/rng.js";
import { isWaterAt } from "../utils/water.js";

export { getDims, isAdjacentToLand, isAdjacentToShallowWater, isCoastalLand, isWaterAt };

export function rand(ctx: ExtendedMapContext | null | undefined, max: number, label: string): number {
  return baseRand(ctx, label, max);
}

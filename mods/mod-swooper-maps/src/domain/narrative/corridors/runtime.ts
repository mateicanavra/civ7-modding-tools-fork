import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { isAdjacentToLand, isAdjacentToShallowWater, isCoastalLand } from "@mapgen/domain/narrative/utils/adjacency.js";
import { getDims } from "@mapgen/domain/narrative/utils/dims.js";
import { rand as baseRand } from "@mapgen/domain/narrative/utils/rng.js";
import { isWaterAt } from "@mapgen/domain/narrative/utils/water.js";

export { getDims, isAdjacentToLand, isAdjacentToShallowWater, isCoastalLand, isWaterAt };

export function rand(ctx: ExtendedMapContext | null | undefined, max: number, label: string): number {
  return baseRand(ctx, label, max);
}

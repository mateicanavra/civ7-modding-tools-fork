import { createStrategy } from "@swooper/mapgen-core/authoring";
import { FeaturesApplyContract } from "../contract.js";

type Placement = { x: number; y: number; feature: string; weight?: number };

export const defaultStrategy = createStrategy(FeaturesApplyContract, "default", {
  run: (input, config) => {
    const seen = new Map<number, Placement[]>();
    const merge = (placements: Placement[]) => {
      for (const placement of placements) {
        const key = placement.y * 65536 + placement.x;
        const list = seen.get(key) ?? [];
        if (list.length >= config.maxPerTile) continue;
        list.push(placement);
        seen.set(key, list);
      }
    };
    merge(input.ice);
    merge(input.reefs);
    merge(input.wetlands);
    merge(input.vegetation);

    const merged: Placement[] = [];
    for (const values of seen.values()) {
      merged.push(...values);
    }

    return { placements: merged };
  },
});

import { createStrategy } from "@swooper/mapgen-core/authoring";

import { PlanStartsContract } from "../contract.js";

export const defaultStrategy = createStrategy(PlanStartsContract, "default", {
  run: (input, config) => {
    const baseStarts = input.baseStarts;
    const overrides = config.overrides;

    if (!overrides) {
      return { ...baseStarts, startSectors: [...baseStarts.startSectors] };
    }

    return {
      ...baseStarts,
      ...overrides,
      startSectors: [...(overrides.startSectors ?? baseStarts.startSectors)],
    };
  },
});

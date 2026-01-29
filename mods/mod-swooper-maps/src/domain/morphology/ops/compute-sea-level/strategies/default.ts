import { createStrategy } from "@swooper/mapgen-core/authoring";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import ComputeSeaLevelContract from "../contract.js";
import { resolveSeaLevel, resolveTargetPercent, validateSeaLevelInputs } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeSeaLevelContract, "default", {
  run: (input, config) => {
    const { elevation, crustType, boundaryCloseness } = validateSeaLevelInputs(input);
    const rng = createLabelRng(input.rngSeed | 0);
    const targetPct = resolveTargetPercent(config, rng);

    const values = Array.from(elevation);
    values.sort((a, b) => a - b);
    if (values.length === 0) return { seaLevel: 0 };

    const seaLevel = resolveSeaLevel({
      values,
      targetPct,
      elevation,
      crustType,
      boundaryCloseness,
      boundaryTarget: config.boundaryShareTarget,
      continentalTarget: config.continentalFraction ?? null,
    });

    return { seaLevel };
  },
});

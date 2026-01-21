import {
  COAST_TERRAIN,
  FLAT_TERRAIN,
  writeHeightfield,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import IslandsStepContract from "./islands.contract.js";
import { deriveStepSeed } from "../../ecology/steps/helpers/seed.js";

export default createStep(IslandsStepContract, {
  run: (context, config, ops, deps) => {
    const { width, height } = context.dimensions;
    const plates = deps.artifacts.foundationPlates.read(context);
    const heightfield = context.buffers.heightfield;
    const rngSeed = deriveStepSeed(context.env.seed, "morphology:planIslandChains");

    const plan = ops.islands(
      {
        width,
        height,
        landMask: heightfield.landMask,
        boundaryCloseness: plates.boundaryCloseness,
        boundaryType: plates.boundaryType,
        volcanism: plates.volcanism,
        rngSeed,
      },
      config.islands
    );

    for (const edit of plan.edits) {
      const index = edit.index | 0;
      const y = (index / width) | 0;
      const x = index - y * width;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const terrain = edit.kind === "peak" ? FLAT_TERRAIN : COAST_TERRAIN;
      const isLand = edit.kind === "peak";
      writeHeightfield(context, x, y, { terrain, isLand });
    }
  },
});

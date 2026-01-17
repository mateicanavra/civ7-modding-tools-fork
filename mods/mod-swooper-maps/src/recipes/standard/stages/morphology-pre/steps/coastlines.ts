import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import CoastlinesStepContract from "./coastlines.contract.js";

export default createStep(CoastlinesStepContract, {
  artifacts: implementArtifacts(CoastlinesStepContract.artifacts!.provides!, {
    coastlinesExpanded: {},
  }),
  run: (context, _config, _ops, deps) => {
    const { width, height } = context.dimensions;
    context.adapter.expandCoasts(width, height);

    const heightfield = context.buffers.heightfield;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const terrain = context.adapter.getTerrainType(x, y);
        if (terrain != null) {
          heightfield.terrain[i] = terrain & 0xff;
        }
        heightfield.landMask[i] = context.adapter.isWater(x, y) ? 0 : 1;
      }
    }

    deps.artifacts.coastlinesExpanded.publish(context, {});
  },
});

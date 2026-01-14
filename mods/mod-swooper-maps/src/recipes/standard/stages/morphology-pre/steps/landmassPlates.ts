import {
  devWarn,
  logLandmassAscii,
} from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import type { LandmassConfig } from "@mapgen/domain/config";
import {
  applyLandmassPostAdjustments,
  applyPlateAwareOceanSeparation,
  createPlateDrivenLandmasses,
} from "@mapgen/domain/morphology/landmass/index.js";
import { morphologyArtifacts } from "../artifacts.js";
import LandmassPlatesStepContract from "./landmassPlates.contract.js";

export default createStep(LandmassPlatesStepContract, {
  artifacts: implementArtifacts([morphologyArtifacts.topography], {
    topography: {},
  }),
  run: (context, config, _ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const { width, height } = context.dimensions;
    const landmassCfg = config.landmass as LandmassConfig;
    const oceanSeparationCfg = config.oceanSeparation;

    const plateResult = createPlateDrivenLandmasses(width, height, context, plates, {
      landmassCfg,
      geometry: landmassCfg.geometry,
    });

    if (!plateResult?.windows?.length) {
      throw new Error("Plate-driven landmass generation failed (no windows)");
    }

    let windows = plateResult.windows.slice();

    const separationResult = applyPlateAwareOceanSeparation({
      width,
      height,
      windows,
      landMask: plateResult.landMask,
      context,
      adapter: context.adapter,
      policy: oceanSeparationCfg,
    });
    windows = separationResult.windows;

    windows = applyLandmassPostAdjustments(windows, landmassCfg.geometry, width, height);

    if (windows.length < 2) {
      devWarn(
        context.trace,
        `[smoke] landmass-plates produced ${windows.length} window(s); expected >= 2 for west/east continents.`
      );
    }

    context.adapter.validateAndFixTerrain();
    context.adapter.recalculateAreas();
    context.adapter.stampContinents();

    logLandmassAscii(context.trace, context.adapter, width, height);
    deps.artifacts.topography.publish(context, context.buffers.heightfield);
  },
});

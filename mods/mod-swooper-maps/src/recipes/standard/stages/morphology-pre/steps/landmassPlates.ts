import type { ContinentBounds } from "@civ7/adapter";
import {
  assertFoundationPlates,
  devWarn,
  logLandmassAscii,
  markLandmassId,
  resolveLandmassIds,
  type ExtendedMapContext,
} from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import type { LandmassConfig } from "@mapgen/domain/config";
import {
  applyLandmassPostAdjustments,
  applyPlateAwareOceanSeparation,
  createPlateDrivenLandmasses,
  type LandmassWindow,
} from "@mapgen/domain/morphology/landmass/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { LandmassPlatesStepContract } from "./landmassPlates.contract.js";

type LandmassStepConfig = Static<typeof LandmassPlatesStepContract.schema>;

function windowToContinentBounds(window: LandmassWindow, continent: number): ContinentBounds {
  return {
    west: window.west,
    east: window.east,
    south: window.south,
    north: window.north,
    continent: window.continent ?? continent,
  };
}

function assignContinentBounds(target: ContinentBounds, src: ContinentBounds): void {
  target.west = src.west;
  target.east = src.east;
  target.south = src.south;
  target.north = src.north;
  target.continent = src.continent;
}

export default createStep(LandmassPlatesStepContract, {
  run: (context: ExtendedMapContext, config: LandmassStepConfig) => {
    assertFoundationPlates(context, "landmassPlates");
    const runtime = getStandardRuntime(context);
    const { width, height } = context.dimensions;
    const landmassCfg = config.landmass as LandmassConfig;
    const oceanSeparationCfg = config.oceanSeparation;

    const plateResult = createPlateDrivenLandmasses(width, height, context, {
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
        `[smoke] landmassPlates produced ${windows.length} window(s); expected >= 2 for west/east continents.`
      );
    }

    if (windows.length >= 2) {
      const first = windows[0];
      const last = windows[windows.length - 1];
      if (first && last) {
        assignContinentBounds(runtime.westContinent, windowToContinentBounds(first, 0));
        assignContinentBounds(runtime.eastContinent, windowToContinentBounds(last, 1));
      }
    }

    const landmassIds = resolveLandmassIds(context.adapter);
    const westMarked = markLandmassId(
      runtime.westContinent,
      landmassIds.WEST,
      context.adapter
    );
    const eastMarked = markLandmassId(
      runtime.eastContinent,
      landmassIds.EAST,
      context.adapter
    );
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "landmass.regionIds",
        westMarked,
        eastMarked,
        ids: { west: landmassIds.WEST, east: landmassIds.EAST },
      }));
    }

    context.adapter.validateAndFixTerrain();
    context.adapter.recalculateAreas();
    context.adapter.stampContinents();

    logLandmassAscii(context.trace, context.adapter, width, height);
  },
});

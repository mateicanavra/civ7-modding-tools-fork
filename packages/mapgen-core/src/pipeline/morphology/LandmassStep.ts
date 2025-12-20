import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import {
  addPlotTagsSimple,
  LANDMASS_REGION,
  markLandmassRegionId,
  type TerrainBuilderLike,
} from "@mapgen/core/plot-tags.js";
import { DEV, devWarn, logLandmassAscii } from "@mapgen/dev/index.js";
import type { ContinentBounds, LandmassConfig } from "@mapgen/bootstrap/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import {
  applyLandmassPostAdjustments,
  applyPlateAwareOceanSeparation,
  createPlateDrivenLandmasses,
  type LandmassWindow,
} from "@mapgen/domain/morphology/landmass/index.js";

export interface LandmassStepRuntime {
  landmassCfg: LandmassConfig;
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
}

export interface LandmassStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

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

export function createLandmassPlatesStep(
  runtime: LandmassStepRuntime,
  options: LandmassStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "landmassPlates",
    phase: M3_STANDARD_STAGE_PHASE.landmassPlates,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      assertFoundationContext(context, "landmassPlates");
      const { width, height } = context.dimensions;

      const plateResult = createPlateDrivenLandmasses(width, height, context, {
        landmassCfg: runtime.landmassCfg as LandmassConfig,
        geometry: runtime.landmassCfg.geometry,
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
        crustMode: runtime.landmassCfg.crustMode,
      });
      windows = separationResult.windows;

      windows = applyLandmassPostAdjustments(windows, runtime.landmassCfg.geometry, width, height);

      if (DEV.ENABLED && windows.length < 2) {
        devWarn(
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

      const westMarked = markLandmassRegionId(runtime.westContinent, LANDMASS_REGION.WEST, context.adapter);
      const eastMarked = markLandmassRegionId(runtime.eastContinent, LANDMASS_REGION.EAST, context.adapter);
      console.log(
        `[landmass-plate] LandmassRegionId marked: ${westMarked} west (ID=${LANDMASS_REGION.WEST}), ${eastMarked} east (ID=${LANDMASS_REGION.EAST})`
      );

      context.adapter.validateAndFixTerrain();
      context.adapter.recalculateAreas();
      context.adapter.stampContinents();

      const terrainBuilder: TerrainBuilderLike = {
        setPlotTag: (x, y, tag) => context.adapter.setPlotTag(x, y, tag),
        addPlotTag: (x, y, tag) => context.adapter.addPlotTag(x, y, tag),
      };
      addPlotTagsSimple(height, width, runtime.eastContinent.west, context.adapter, terrainBuilder);

      if (DEV.ENABLED && context?.adapter) {
        logLandmassAscii(context.adapter, width, height);
      }
    },
  };
}

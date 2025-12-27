import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import {
  markLandmassId,
  resolveLandmassIds,
} from "@mapgen/core/plot-tags.js";
import { DEV, devWarn, logLandmassAscii } from "@mapgen/dev/index.js";
import type { ContinentBounds, LandmassConfig } from "@mapgen/bootstrap/types.js";
import { LandmassConfigSchema, OceanSeparationConfigSchema } from "@mapgen/config/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import {
  applyLandmassPostAdjustments,
  applyPlateAwareOceanSeparation,
  createPlateDrivenLandmasses,
  type LandmassWindow,
} from "@mapgen/domain/morphology/landmass/index.js";

export interface LandmassStepRuntime {
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
}

export interface LandmassStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const LandmassStepConfigSchema = Type.Object(
  {
    landmass: LandmassConfigSchema,
    oceanSeparation: OceanSeparationConfigSchema,
  },
  { additionalProperties: false, default: { landmass: {}, oceanSeparation: {} } }
);

type LandmassStepConfig = Static<typeof LandmassStepConfigSchema>;

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
): MapGenStep<ExtendedMapContext, LandmassStepConfig> {
  return {
    id: "landmassPlates",
    phase: M3_STANDARD_STAGE_PHASE.landmassPlates,
    requires: options.requires,
    provides: options.provides,
    configSchema: LandmassStepConfigSchema,
    run: (context, config) => {
      assertFoundationContext(context, "landmassPlates");
      const { width, height } = context.dimensions;
      const landmassCfg = (config.landmass ?? {}) as LandmassConfig;
      const oceanSeparationCfg = config.oceanSeparation ?? {};

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
        crustMode: landmassCfg.crustMode,
        policy: oceanSeparationCfg,
      });
      windows = separationResult.windows;

      windows = applyLandmassPostAdjustments(windows, landmassCfg.geometry, width, height);

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
      console.log(
        `[landmass-plate] Region IDs marked: ${westMarked} west (ID=${landmassIds.WEST}), ${eastMarked} east (ID=${landmassIds.EAST})`
      );

      context.adapter.validateAndFixTerrain();
      context.adapter.recalculateAreas();
      context.adapter.stampContinents();

      if (DEV.ENABLED && context?.adapter) {
        logLandmassAscii(context.adapter, width, height);
      }
    },
  };
}

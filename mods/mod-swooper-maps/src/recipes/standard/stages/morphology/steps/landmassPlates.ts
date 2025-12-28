import { Type, type Static } from "typebox";
import type { ContinentBounds } from "@civ7/adapter";
import {
  DEV,
  assertFoundationPlates,
  devWarn,
  logLandmassAscii,
  markLandmassId,
  resolveLandmassIds,
  type ExtendedMapContext,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import type { LandmassConfig } from "@swooper/mapgen-core/config";
import { LandmassConfigSchema, OceanSeparationConfigSchema } from "@swooper/mapgen-core/config";
import {
  applyLandmassPostAdjustments,
  applyPlateAwareOceanSeparation,
  createPlateDrivenLandmasses,
  type LandmassWindow,
} from "@mapgen/domain/morphology/landmass/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

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

export default createStep({
  id: "landmassPlates",
  phase: "morphology",
  requires: [M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1],
  provides: [M4_EFFECT_TAGS.engine.landmassApplied],
  schema: LandmassStepConfigSchema,
  run: (context: ExtendedMapContext, config: LandmassStepConfig) => {
    assertFoundationPlates(context, "landmassPlates");
    const runtime = getStandardRuntime(context);
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
} as const);

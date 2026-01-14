import type { ContinentBounds } from "@civ7/adapter";
import {
  devWarn,
  logLandmassAscii,
  markLandmassId,
  resolveLandmassIds,
} from "@swooper/mapgen-core";
import type { MapDimensions } from "@civ7/adapter";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import type { LandmassConfig } from "@mapgen/domain/config";
import {
  applyLandmassPostAdjustments,
  applyPlateAwareOceanSeparation,
  createPlateDrivenLandmasses,
  type LandmassWindow,
} from "@mapgen/domain/morphology/landmass/index.js";
import { getStandardRuntime } from "../../../runtime.js";
import LandmassPlatesStepContract from "./landmassPlates.contract.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectedSize(dimensions: MapDimensions): number {
  return Math.max(0, (dimensions.width | 0) * (dimensions.height | 0));
}

function validateTypedArray(
  errors: ArtifactValidationIssue[],
  label: string,
  value: unknown,
  ctor: { new (...args: any[]): { length: number } },
  expectedLength?: number
): value is { length: number } {
  if (!(value instanceof ctor)) {
    errors.push({ message: `Expected ${label} to be ${ctor.name}.` });
    return false;
  }
  if (expectedLength != null && value.length !== expectedLength) {
    errors.push({
      message: `Expected ${label} length ${expectedLength} (received ${value.length}).`,
    });
  }
  return true;
}

function validateHeightfieldBuffer(value: unknown, dimensions: MapDimensions): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing heightfield buffer." });
    return errors;
  }
  const size = expectedSize(dimensions);
  const candidate = value as {
    elevation?: unknown;
    terrain?: unknown;
    landMask?: unknown;
  };
  validateTypedArray(errors, "topography.elevation", candidate.elevation, Int16Array, size);
  validateTypedArray(errors, "topography.terrain", candidate.terrain, Uint8Array, size);
  validateTypedArray(errors, "topography.landMask", candidate.landMask, Uint8Array, size);
  return errors;
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

export default createStep(LandmassPlatesStepContract, {
  artifacts: implementArtifacts(LandmassPlatesStepContract.artifacts!.provides!, {
    topography: {
      validate: (value, context) => validateHeightfieldBuffer(value, context.dimensions),
    },
  }),
  run: (context, config, _ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const runtime = getStandardRuntime(context);
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

    deps.artifacts.topography.publish(context, context.buffers.heightfield);
  },
});

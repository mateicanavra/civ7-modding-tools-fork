import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { ContinentBounds } from "@civ7/adapter";
import type { Static, StepRuntimeOps } from "@swooper/mapgen-core/authoring";
import type { PlacementInputsV1 } from "../../placement-inputs.js";
import { getStandardRuntime } from "../../../../runtime.js";

import DerivePlacementInputsContract from "./contract.js";

type DerivePlacementInputsConfig = Static<typeof DerivePlacementInputsContract.schema>;
type DerivePlacementInputsOps = StepRuntimeOps<NonNullable<typeof DerivePlacementInputsContract.ops>>;

type MorphologyLandmassesSnapshot = Static<
  (typeof import("../../../morphology-pre/artifacts.js").morphologyArtifacts)["landmasses"]["schema"]
>;

function computeWrappedIntervalCenter(west: number, east: number, width: number): number {
  if (width <= 0) return 0;
  const w = ((west % width) + width) % width;
  const e = ((east % width) + width) % width;
  if (w <= e) return Math.floor((w + e) / 2);
  const length = width - w + (e + 1);
  return (w + Math.floor(length / 2)) % width;
}

/**
 * DEPRECATED: Continent bounds are a downstream-only shim kept for legacy
 * config compatibility. Placement no longer uses these bounds for start
 * assignment and will remove them by Slice 6.
 */
function createDefaultContinentBounds(width: number, height: number, side: "west" | "east"): ContinentBounds {
  const avoidSeamOffset = 4;
  const polarWaterRows = 2;

  if (side === "west") {
    return {
      west: avoidSeamOffset,
      east: Math.floor(width / 2) - avoidSeamOffset,
      south: polarWaterRows,
      north: height - polarWaterRows,
      continent: 0,
    };
  }

  return {
    west: Math.floor(width / 2) + avoidSeamOffset,
    east: width - avoidSeamOffset,
    south: polarWaterRows,
    north: height - polarWaterRows,
    continent: 1,
  };
}

function deriveDeprecatedContinentBounds(
  width: number,
  height: number,
  landmasses: MorphologyLandmassesSnapshot
): { westContinent: ContinentBounds; eastContinent: ContinentBounds } {
  const defaults = {
    west: createDefaultContinentBounds(width, height, "west"),
    east: createDefaultContinentBounds(width, height, "east"),
  };

  const westY: number[] = [];
  const eastY: number[] = [];
  for (const mass of landmasses.landmasses) {
    const cx = computeWrappedIntervalCenter(mass.bbox.west, mass.bbox.east, width);
    const target = cx < width / 2 ? westY : eastY;
    target.push(mass.bbox.south, mass.bbox.north);
  }

  const clampY = (y: number) => Math.max(0, Math.min(height - 1, y | 0));

  const westContinent: ContinentBounds = {
    ...defaults.west,
    south: westY.length ? clampY(Math.min(...westY)) : defaults.west.south,
    north: westY.length ? clampY(Math.max(...westY)) : defaults.west.north,
  };
  const eastContinent: ContinentBounds = {
    ...defaults.east,
    south: eastY.length ? clampY(Math.min(...eastY)) : defaults.east.south,
    north: eastY.length ? clampY(Math.max(...eastY)) : defaults.east.north,
  };

  return { westContinent, eastContinent };
}

export function buildPlacementInputs(
  context: ExtendedMapContext,
  landmasses: MorphologyLandmassesSnapshot,
  config: DerivePlacementInputsConfig,
  ops: DerivePlacementInputsOps
): PlacementInputsV1 {
  const runtime = getStandardRuntime(context);
  const { width, height } = context.dimensions;
  const { westContinent, eastContinent } = deriveDeprecatedContinentBounds(width, height, landmasses);
  const baseStarts = {
    playersLandmass1: runtime.playersLandmass1,
    playersLandmass2: runtime.playersLandmass2,
    westContinent,
    eastContinent,
    startSectorRows: runtime.startSectorRows,
    startSectorCols: runtime.startSectorCols,
    startSectors: runtime.startSectors,
  };
  const startsPlan = ops.starts({ baseStarts }, config.starts);
  const wondersPlan = ops.wonders({ mapInfo: runtime.mapInfo }, config.wonders);
  const floodplainsPlan = ops.floodplains({}, config.floodplains);

  return {
    mapInfo: runtime.mapInfo,
    starts: startsPlan,
    wonders: wondersPlan,
    floodplains: floodplainsPlan,
    placementConfig: config,
  };
}

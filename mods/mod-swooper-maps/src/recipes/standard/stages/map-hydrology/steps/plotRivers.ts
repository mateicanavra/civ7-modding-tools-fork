import {
  HILL_TERRAIN,
  MOUNTAIN_TERRAIN,
  NAVIGABLE_RIVER_TERRAIN,
  syncHeightfield,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import PlotRiversStepContract from "./plotRivers.contract.js";
import {
  HYDROLOGY_RIVERS_DEFAULT_MAX_LENGTH,
  HYDROLOGY_RIVERS_DEFAULT_MIN_LENGTH,
} from "@mapgen/domain/hydrology/shared/knob-multipliers.js";

export function applyNavigableRiverTerrain(
  adapter: {
    isWater(x: number, y: number): boolean;
    isMountain(x: number, y: number): boolean;
    setTerrainType(x: number, y: number, terrainType: number): void;
  },
  width: number,
  height: number,
  navigableMask: Uint8Array
): number {
  const size = Math.max(0, (width | 0) * (height | 0));
  if (navigableMask.length !== size) {
    throw new Error("[plot-rivers] navigableMask length mismatch.");
  }

  let stamped = 0;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const i = rowOffset + x;
      if (navigableMask[i] !== 1) continue;
      if (adapter.isWater(x, y)) continue;
      if (adapter.isMountain(x, y)) continue;
      adapter.setTerrainType(x, y, NAVIGABLE_RIVER_TERRAIN);
      stamped += 1;
    }
  }

  return stamped;
}

export default createStep(PlotRiversStepContract, {
  run: (context, _config, _ops, deps) => {
    const hydrography = deps.artifacts.hydrography.read(context) as {
      riverClass: Uint8Array;
      navigableMask?: Uint8Array;
    };
    const { width, height } = context.dimensions;
    const size = width * height;

    const logStats = (label: string) => {
      if (!context.trace.isVerbose) return;
      let flat = 0,
        hill = 0,
        mtn = 0,
        water = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (context.adapter.isWater(x, y)) {
            water++;
            continue;
          }
          const t = context.adapter.getTerrainType(x, y);
          if (t === MOUNTAIN_TERRAIN) mtn++;
          else if (t === HILL_TERRAIN) hill++;
          else flat++;
        }
      }
      const total = width * height;
      const land = Math.max(1, flat + hill + mtn);
      context.trace.event(() => ({
        type: "rivers.terrainStats",
        label,
        totals: {
          land,
          water,
          landShare: Number(((land / total) * 100).toFixed(1)),
        },
        shares: {
          mountains: Number(((mtn / land) * 100).toFixed(1)),
          hills: Number(((hill / land) * 100).toFixed(1)),
          flat: Number(((flat / land) * 100).toFixed(1)),
        },
      }));
    };

    logStats("PRE-RIVERS");
    const preTerrain = new Uint8Array(size);
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        preTerrain[rowOffset + x] = context.adapter.getTerrainType(x, y) & 0xff;
      }
    }

    context.adapter.modelRivers(HYDROLOGY_RIVERS_DEFAULT_MIN_LENGTH, HYDROLOGY_RIVERS_DEFAULT_MAX_LENGTH, NAVIGABLE_RIVER_TERRAIN);
    logStats("POST-MODELRIVERS");
    context.adapter.validateAndFixTerrain();

    // Clear any engine-stamped navigable terrain that is not supported by Hydrography truth,
    // restoring the pre-model terrain types for those tiles.
    const desiredMask =
      hydrography.navigableMask ??
      (() => {
        const mask = new Uint8Array(size);
        for (let i = 0; i < size; i++) mask[i] = hydrography.riverClass[i] === 2 ? 1 : 0;
        return mask;
      })();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = context.adapter.getTerrainType(x, y);
        if (t !== NAVIGABLE_RIVER_TERRAIN) continue;
        const i = y * width + x;
        if (desiredMask[i] === 1) continue;
        context.adapter.setTerrainType(x, y, preTerrain[i] ?? 0);
      }
    }

    const stamped = applyNavigableRiverTerrain(context.adapter, width, height, desiredMask);
    context.adapter.validateAndFixTerrain();
    logStats("POST-VALIDATE");

    syncHeightfield(context);
    context.adapter.defineNamedRivers();

    context.trace.event(() => ({
      type: "rivers.navigableStamp",
      stampedTiles: stamped,
    }));
  },
});

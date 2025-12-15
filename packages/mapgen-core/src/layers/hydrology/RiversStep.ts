import type { ExtendedMapContext } from "../../core/types.js";
import { HILL_TERRAIN, MOUNTAIN_TERRAIN, NAVIGABLE_RIVER_TERRAIN } from "../../core/terrain-constants.js";
import { syncHeightfield } from "../../core/types.js";
import {
  computeRiverAdjacencyMask,
  publishClimateFieldArtifact,
  publishHeightfieldArtifact,
  publishRiverAdjacencyArtifact,
} from "../../pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../pipeline/index.js";
import { storyTagClimatePaleo } from "../../story/swatches.js";

export interface RiversStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
  shouldRunPaleo?: (context: ExtendedMapContext) => boolean;
  logPrefix?: string;
}

export function createRiversStep(options: RiversStepOptions): MapGenStep<ExtendedMapContext> {
  return {
    id: "rivers",
    phase: M3_STANDARD_STAGE_PHASE.rivers,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      const navigableRiverTerrain = NAVIGABLE_RIVER_TERRAIN;
      const { width, height } = context.dimensions;
      const logStats = (label: string) => {
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
        console.log(
          `[Rivers] ${label}: Land=${land} (${((land / total) * 100).toFixed(1)}%) ` +
            `Mtn=${((mtn / land) * 100).toFixed(1)}% ` +
            `Hill=${((hill / land) * 100).toFixed(1)}% ` +
            `Flat=${((flat / land) * 100).toFixed(1)}%`
        );
      };

      logStats("PRE-RIVERS");
      context.adapter.modelRivers(5, 15, navigableRiverTerrain);
      logStats("POST-MODELRIVERS");
      context.adapter.validateAndFixTerrain();
      logStats("POST-VALIDATE");
      syncHeightfield(context);
      publishHeightfieldArtifact(context);
      context.adapter.defineNamedRivers();

      if (options.shouldRunPaleo?.(context) === true) {
        console.log(`${options.logPrefix ?? ""} Applying paleo hydrology (post-rivers)...`);
        storyTagClimatePaleo(context);
        publishClimateFieldArtifact(context);
      }

      const riverAdjacency = computeRiverAdjacencyMask(context);
      publishRiverAdjacencyArtifact(context, riverAdjacency);
    },
  };
}

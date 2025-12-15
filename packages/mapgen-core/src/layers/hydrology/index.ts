import type { ExtendedMapContext } from "../../core/types.js";
import { assertFoundationContext } from "../../core/assertions.js";
import { LANDMASS_REGION, markLandmassRegionId } from "../../core/plot-tags.js";
import { HILL_TERRAIN, MOUNTAIN_TERRAIN, NAVIGABLE_RIVER_TERRAIN } from "../../core/terrain-constants.js";
import { syncHeightfield } from "../../core/types.js";
import { DEV, logRainfallStats } from "../../dev/index.js";
import type { ContinentBounds } from "../../bootstrap/types.js";
import type { MapInfo } from "@civ7/adapter";
import { computeRiverAdjacencyMask, publishClimateFieldArtifact, publishHeightfieldArtifact, publishRiverAdjacencyArtifact } from "../../pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type StepRegistry } from "../../pipeline/index.js";
import { applyClimateBaseline, refineClimateEarthlike } from "./climate.js";

export interface HydrologyLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  stageFlags: Record<string, boolean>;
  logPrefix: string;
  mapInfo: MapInfo;
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
}

export function registerHydrologyLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: HydrologyLayerRuntime
): void {
  const stageFlags = runtime.stageFlags;

  registry.register({
    id: "lakes",
    phase: M3_STANDARD_STAGE_PHASE.lakes,
    ...runtime.getStageDescriptor("lakes"),
    shouldRun: () => stageFlags.lakes,
    run: (context) => {
      const { width, height } = context.dimensions;
      const iTilesPerLake = Math.max(10, (runtime.mapInfo.LakeGenerationFrequency ?? 5) * 2);
      context.adapter.generateLakes(width, height, iTilesPerLake);
      syncHeightfield(context);
      publishHeightfieldArtifact(context);
    },
  });

  registry.register({
    id: "climateBaseline",
    phase: M3_STANDARD_STAGE_PHASE.climateBaseline,
    ...runtime.getStageDescriptor("climateBaseline"),
    shouldRun: () => stageFlags.climateBaseline,
    run: (context) => {
      const { width, height } = context.dimensions;

      context.adapter.recalculateAreas();
      context.adapter.buildElevation();

      const westRestamped = markLandmassRegionId(runtime.westContinent, LANDMASS_REGION.WEST, context.adapter);
      const eastRestamped = markLandmassRegionId(runtime.eastContinent, LANDMASS_REGION.EAST, context.adapter);
      context.adapter.recalculateAreas();
      context.adapter.stampContinents();
      console.log(
        `[landmass-plate] LandmassRegionId refreshed post-terrain: ${westRestamped} west (ID=${LANDMASS_REGION.WEST}), ${eastRestamped} east (ID=${LANDMASS_REGION.EAST})`
      );

      assertFoundationContext(context, "climateBaseline");
      syncHeightfield(context);
      publishHeightfieldArtifact(context);
      applyClimateBaseline(width, height, context);
      publishClimateFieldArtifact(context);
    },
  });

  registry.register({
    id: "rivers",
    phase: M3_STANDARD_STAGE_PHASE.rivers,
    ...runtime.getStageDescriptor("rivers"),
    shouldRun: () => stageFlags.rivers,
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

      const riverAdjacency = computeRiverAdjacencyMask(context);
      publishRiverAdjacencyArtifact(context, riverAdjacency);
    },
  });

  registry.register({
    id: "climateRefine",
    phase: M3_STANDARD_STAGE_PHASE.climateRefine,
    ...runtime.getStageDescriptor("climateRefine"),
    shouldRun: () => stageFlags.climateRefine,
    run: (context) => {
      assertFoundationContext(context, "climateRefine");
      const { width, height } = context.dimensions;
      refineClimateEarthlike(width, height, context);
      publishClimateFieldArtifact(context);

      if (DEV.ENABLED && context?.adapter) {
        logRainfallStats(context.adapter, width, height, "post-climate");
      }
    },
  });
}


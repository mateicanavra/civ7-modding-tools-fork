import type { ExtendedMapContext } from "../../core/types.js";
import { assertFoundationContext } from "../../core/assertions.js";
import {
  addPlotTagsSimple,
  LANDMASS_REGION,
  markLandmassRegionId,
  type TerrainBuilderLike,
} from "../../core/plot-tags.js";
import { DEV, devLogIf, devWarn, logLandmassAscii, logMountainSummary, logReliefAscii, logVolcanoSummary } from "../../dev/index.js";
import type { ContinentBounds, LandmassConfig, MountainsConfig, VolcanoesConfig } from "../../bootstrap/types.js";
import { M3_STANDARD_STAGE_PHASE, type StepRegistry } from "../../pipeline/index.js";
import { createPlateDrivenLandmasses } from "./landmass-plate.js";
import {
  applyLandmassPostAdjustments,
  applyPlateAwareOceanSeparation,
  type LandmassWindow,
} from "./landmass-utils.js";
import { addRuggedCoasts } from "./coastlines.js";
import { addIslandChains } from "./islands.js";
import { layerAddMountainsPhysics } from "./mountains.js";
import { layerAddVolcanoesPlateAware } from "./volcanoes.js";

export interface MorphologyLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  stageFlags: Record<string, boolean>;
  logPrefix: string;
  landmassCfg: LandmassConfig;
  mountainOptions: MountainsConfig;
  volcanoOptions: VolcanoesConfig;
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
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

export function registerMorphologyLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: MorphologyLayerRuntime
): void {
  const stageFlags = runtime.stageFlags;

  registry.register({
    id: "landmassPlates",
    phase: M3_STANDARD_STAGE_PHASE.landmassPlates,
    ...runtime.getStageDescriptor("landmassPlates"),
    shouldRun: () => stageFlags.landmassPlates,
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
  });

  registry.register({
    id: "coastlines",
    phase: M3_STANDARD_STAGE_PHASE.coastlines,
    ...runtime.getStageDescriptor("coastlines"),
    shouldRun: () => stageFlags.coastlines,
    run: (context) => {
      const { width, height } = context.dimensions;
      context.adapter.expandCoasts(width, height);
    },
  });

  registry.register({
    id: "ruggedCoasts",
    phase: M3_STANDARD_STAGE_PHASE.ruggedCoasts,
    ...runtime.getStageDescriptor("ruggedCoasts"),
    shouldRun: () => stageFlags.ruggedCoasts,
    run: (context) => {
      const { width, height } = context.dimensions;
      addRuggedCoasts(width, height, context);
    },
  });

  registry.register({
    id: "islands",
    phase: M3_STANDARD_STAGE_PHASE.islands,
    ...runtime.getStageDescriptor("islands"),
    shouldRun: () => stageFlags.islands,
    run: (context) => {
      const { width, height } = context.dimensions;
      addIslandChains(width, height, context);
    },
  });

  registry.register({
    id: "mountains",
    phase: M3_STANDARD_STAGE_PHASE.mountains,
    ...runtime.getStageDescriptor("mountains"),
    shouldRun: () => stageFlags.mountains,
    run: (context) => {
      assertFoundationContext(context, "mountains");
      const { width, height } = context.dimensions;

      devLogIf(
        "LOG_MOUNTAINS",
        `${runtime.logPrefix} [Mountains] thresholds ` +
          `mountain=${runtime.mountainOptions.mountainThreshold}, ` +
          `hill=${runtime.mountainOptions.hillThreshold}, ` +
          `tectonicIntensity=${runtime.mountainOptions.tectonicIntensity}, ` +
          `boundaryWeight=${runtime.mountainOptions.boundaryWeight}, ` +
          `boundaryExponent=${runtime.mountainOptions.boundaryExponent}, ` +
          `interiorPenaltyWeight=${runtime.mountainOptions.interiorPenaltyWeight}`
      );

      layerAddMountainsPhysics(context, runtime.mountainOptions);

      if (DEV.ENABLED && context?.adapter) {
        logMountainSummary(context.adapter, width, height);
        logReliefAscii(context.adapter, width, height);
      }
    },
  });

  registry.register({
    id: "volcanoes",
    phase: M3_STANDARD_STAGE_PHASE.volcanoes,
    ...runtime.getStageDescriptor("volcanoes"),
    shouldRun: () => stageFlags.volcanoes,
    run: (context) => {
      assertFoundationContext(context, "volcanoes");
      const { width, height } = context.dimensions;

      layerAddVolcanoesPlateAware(context, runtime.volcanoOptions);

      if (DEV.ENABLED && context?.adapter) {
        const volcanoId = context.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
        logVolcanoSummary(context.adapter, width, height, volcanoId);
      }
    },
  });
}

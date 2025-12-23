import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { HILL_TERRAIN, MOUNTAIN_TERRAIN, NAVIGABLE_RIVER_TERRAIN } from "@mapgen/core/terrain-constants.js";
import { syncHeightfield } from "@mapgen/core/types.js";
import {
  computeRiverAdjacencyMask,
  /** Why are these all standalone functions? Shouldn't they be methods on ExtendedMapContext or similar?
   *  Or at least grouped into a hydrology utility module?
   *  Could we just have a publishArtifact function that takes the context and artifact type as parameters?
   *  Maybe it MapContext.publishArtifact(artifactType, data)?
  */
  publishClimateFieldArtifact,
  publishHeightfieldArtifact,
  publishRiverAdjacencyArtifact,
} from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { ClimateStoryPaleoSchema } from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
import { storyTagClimatePaleo } from "@mapgen/domain/narrative/swatches.js";

export interface RiversStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  storyEnabled: boolean;
  logPrefix?: string;
}

const RiversStepConfigSchema = Type.Object(
  {
    climate: Type.Object(
      {
        story: Type.Object(
          {
            paleo: ClimateStoryPaleoSchema,
          },
          { additionalProperties: false, default: {} }
        ),
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { climate: {} } }
);

export function createRiversStep(options: RiversStepOptions): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "rivers",
    phase: M3_STANDARD_STAGE_PHASE.rivers,
    requires: options.requires,
    provides: options.provides,
    configSchema: RiversStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
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

        if (options.storyEnabled && context.config.climate?.story?.paleo != null) {
          console.log(`${options.logPrefix ?? ""} Applying paleo hydrology (post-rivers)...`);
          storyTagClimatePaleo(context);
          publishClimateFieldArtifact(context);
        }

        const riverAdjacency = computeRiverAdjacencyMask(context);
        publishRiverAdjacencyArtifact(context, riverAdjacency);
      });
    },
  };
}

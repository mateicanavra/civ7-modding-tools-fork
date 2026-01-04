import { Type, type Static } from "typebox";
import {
  HILL_TERRAIN,
  MOUNTAIN_TERRAIN,
  NAVIGABLE_RIVER_TERRAIN,
  syncHeightfield,
  type ExtendedMapContext,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";
import {
  computeRiverAdjacencyMask,
  publishClimateFieldArtifact,
  publishHeightfieldArtifact,
  publishRiverAdjacencyArtifact,
} from "../../../artifacts.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";
import { storyTagClimatePaleo } from "@mapgen/domain/narrative/swatches.js";

const RiversStepConfigSchema = Type.Object(
  {
    climate: Type.Object(
      {
        story: Type.Object(
      {
        paleo: Type.Optional(ClimateConfigSchema.properties.story.properties.paleo),
      },
      { additionalProperties: false, default: {} }
    ),
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { climate: {} } }
);

type RiversStepConfig = Static<typeof RiversStepConfigSchema>;

export default createStep({
  id: "rivers",
  phase: "hydrology",
  requires: [M3_DEPENDENCY_TAGS.artifact.heightfield],
  provides: [
    M4_EFFECT_TAGS.engine.riversModeled,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
  ],
  schema: RiversStepConfigSchema,
  run: (context: ExtendedMapContext, config: RiversStepConfig) => {
    const runtime = getStandardRuntime(context);
    const navigableRiverTerrain = NAVIGABLE_RIVER_TERRAIN;
    const { width, height } = context.dimensions;
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
    context.adapter.modelRivers(5, 15, navigableRiverTerrain);
    logStats("POST-MODELRIVERS");
    context.adapter.validateAndFixTerrain();
    logStats("POST-VALIDATE");
    syncHeightfield(context);
    publishHeightfieldArtifact(context);
    context.adapter.defineNamedRivers();

    if (runtime.storyEnabled && config.climate?.story?.paleo != null) {
      if (context.trace.isVerbose) {
        context.trace.event(() => ({
          type: "rivers.paleo.start",
          message: `${runtime.logPrefix} Applying paleo hydrology (post-rivers)...`,
        }));
      }
      storyTagClimatePaleo(context, config.climate);
      publishClimateFieldArtifact(context);
    }

    const riverAdjacency = computeRiverAdjacencyMask(context);
    publishRiverAdjacencyArtifact(context, riverAdjacency);
  },
} as const);

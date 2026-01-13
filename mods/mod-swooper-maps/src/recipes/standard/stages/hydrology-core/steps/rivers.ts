import type { MapDimensions } from "@civ7/adapter";
import {
  HILL_TERRAIN,
  MOUNTAIN_TERRAIN,
  NAVIGABLE_RIVER_TERRAIN,
  syncHeightfield,
} from "@swooper/mapgen-core";
import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { computeRiverAdjacencyMask } from "../river-adjacency.js";
import { getStandardRuntime } from "../../../runtime.js";
import { storyTagClimatePaleo } from "@mapgen/domain/narrative/swatches.js";
import { hydrologyCoreArtifacts } from "../artifacts.js";
import RiversStepContract from "./rivers.contract.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

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

function validateRiverAdjacencyMask(
  value: unknown,
  dimensions: MapDimensions
): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  const size = expectedSize(dimensions);
  validateTypedArray(errors, "riverAdjacency", value, Uint8Array, size);
  return errors;
}

export default createStep(RiversStepContract, {
  artifacts: implementArtifacts([hydrologyCoreArtifacts.riverAdjacency], {
    riverAdjacency: {
      validate: (value, context) => validateRiverAdjacencyMask(value, context.dimensions),
    },
  }),
  run: (context, config, _ops, deps) => {
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
    context.adapter.defineNamedRivers();

    if (runtime.storyEnabled && config.climate?.story?.paleo != null) {
      if (context.trace.isVerbose) {
        context.trace.event(() => ({
          type: "rivers.paleo.start",
          message: `${runtime.logPrefix} Applying paleo hydrology (post-rivers)...`,
        }));
      }
      storyTagClimatePaleo(context, config.climate);
    }

    const riverAdjacency = computeRiverAdjacencyMask(context);
    deps.artifacts.riverAdjacency.publish(context, riverAdjacency);
  },
});

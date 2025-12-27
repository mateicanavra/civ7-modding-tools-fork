import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { HeightfieldBuffer } from "@mapgen/core/types.js";
import { ctxRandom, writeClimateField } from "@mapgen/core/types.js";
import { MOUNTAIN_TERRAIN } from "@mapgen/core/terrain-constants.js";
import { idx } from "@mapgen/lib/grid/index.js";
import { clamp } from "@mapgen/lib/math/clamp.js";
import { M3_DEPENDENCY_TAGS } from "@mapgen/base/tags.js";
import type { ClimateAdapter, ClimateRuntime } from "@mapgen/domain/hydrology/climate/types.js";

function getPublishedHeightfield(
  ctx: ExtendedMapContext,
  expectedSize: number
): HeightfieldBuffer {
  const value = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
  if (!value || typeof value !== "object") {
    throw new Error("ClimateEngine: Missing artifact:heightfield (required for climate).");
  }
  const candidate = value as HeightfieldBuffer;
  if (!(candidate.elevation instanceof Int16Array) || candidate.elevation.length !== expectedSize) {
    throw new Error("ClimateEngine: Invalid artifact:heightfield.elevation payload.");
  }
  if (!(candidate.terrain instanceof Uint8Array) || candidate.terrain.length !== expectedSize) {
    throw new Error("ClimateEngine: Invalid artifact:heightfield.terrain payload.");
  }
  if (!(candidate.landMask instanceof Uint8Array) || candidate.landMask.length !== expectedSize) {
    throw new Error("ClimateEngine: Invalid artifact:heightfield.landMask payload.");
  }
  return candidate;
}

/**
 * Resolve an engine adapter for rainfall operations.
 */
export function resolveAdapter(ctx: ExtendedMapContext): ClimateAdapter {
  if (!ctx?.adapter) {
    throw new Error(
      "ClimateEngine: MapContext adapter is required (legacy direct-engine fallback removed)."
    );
  }

  const engineAdapter = ctx.adapter;
  const width = ctx.dimensions.width | 0;
  const height = ctx.dimensions.height | 0;
  const expectedSize = Math.max(0, width * height) | 0;
  const heightfield = getPublishedHeightfield(ctx, expectedSize);
  const riverAdjacency = ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.riverAdjacency);
  const hasRiverAdjacencyArtifact =
    riverAdjacency instanceof Uint8Array && riverAdjacency.length === expectedSize;
  return {
    isWater: (x, y) => heightfield.landMask[idx(x, y, width)] === 0,
    isMountain: (x, y) => heightfield.terrain[idx(x, y, width)] === MOUNTAIN_TERRAIN,
    // NOTE: isCoastalLand intentionally omitted.
    // These are not on the base EngineAdapter interface. By leaving them
    // undefined, the climate code's local fallbacks will execute instead of
    // receiving stubbed `() => false` values that block the fallback path.
    isAdjacentToRivers: (x, y, radius) => {
      if (radius !== 1) {
        throw new Error(
          "ClimateEngine: isAdjacentToRivers only supports radius=1 via artifact:riverAdjacency."
        );
      }
      if (!hasRiverAdjacencyArtifact) {
        throw new Error(
          "ClimateEngine: Missing artifact:riverAdjacency (required for climate refinement)."
        );
      }
      return (riverAdjacency as Uint8Array)[idx(x, y, width)] === 1;
    },
    getRainfall: (x, y) => engineAdapter.getRainfall(x, y),
    setRainfall: (x, y, rf) => engineAdapter.setRainfall(x, y, rf),
    getElevation: (x, y) => heightfield.elevation[idx(x, y, width)] | 0,
    getLatitude: (x, y) => engineAdapter.getLatitude(x, y),
    getRandomNumber: (max, label) => engineAdapter.getRandomNumber(max, label),
  } as ClimateAdapter;
}

/**
 * Create shared IO helpers for rainfall passes.
 */
export function createClimateRuntime(
  width: number,
  height: number,
  ctx: ExtendedMapContext | null
): ClimateRuntime {
  if (!ctx) {
    throw new Error(
      "ClimateEngine: MapContext is required (legacy direct-engine fallback removed)."
    );
  }

  const adapter = resolveAdapter(ctx);
  const climate = ctx.buffers?.climate;
  const rainfallBuf = climate?.rainfall || null;
  const expectedSize = Math.max(0, (width | 0) * (height | 0)) | 0;
  if (!(rainfallBuf instanceof Uint8Array) || rainfallBuf.length !== expectedSize) {
    throw new Error(
      `ClimateEngine: Missing or invalid climate rainfall buffer (expected ${expectedSize}).`
    );
  }

  const idxAt = (x: number, y: number): number => idx(x, y, width);

  const readRainfall = (x: number, y: number): number => {
    return rainfallBuf[idxAt(x, y)] | 0;
  };

  const writeRainfall = (x: number, y: number, rainfall: number): void => {
    const clamped = clamp(rainfall, 0, 200);
    writeClimateField(ctx, x, y, { rainfall: clamped });
  };

  const rand = (max: number, label: string): number => {
    return ctxRandom(ctx, label || "ClimateRand", max);
  };

  return {
    adapter,
    readRainfall,
    writeRainfall,
    rand,
    idx: idxAt,
  };
}

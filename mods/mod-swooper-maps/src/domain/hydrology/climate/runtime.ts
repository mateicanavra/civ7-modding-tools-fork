import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { HeightfieldBuffer } from "@swooper/mapgen-core";
import { ctxRandom, writeClimateField } from "@swooper/mapgen-core";
import { MOUNTAIN_TERRAIN } from "@swooper/mapgen-core";
import { idx } from "@swooper/mapgen-core/lib/grid";
import { clamp } from "@swooper/mapgen-core/lib/math";
import type { ClimateAdapter, ClimateRuntime } from "@mapgen/domain/hydrology/climate/types.js";

function getHeightfield(
  ctx: ExtendedMapContext,
  expectedSize: number,
  heightfield?: HeightfieldBuffer | null
): HeightfieldBuffer {
  const value = heightfield ?? ctx.buffers?.heightfield;
  if (!value || typeof value !== "object") {
    throw new Error("ClimateEngine: Missing heightfield buffer (required for climate).");
  }
  const candidate = value as HeightfieldBuffer;
  if (!(candidate.elevation instanceof Int16Array) || candidate.elevation.length !== expectedSize) {
    throw new Error("ClimateEngine: Invalid heightfield.elevation payload.");
  }
  if (!(candidate.terrain instanceof Uint8Array) || candidate.terrain.length !== expectedSize) {
    throw new Error("ClimateEngine: Invalid heightfield.terrain payload.");
  }
  if (!(candidate.landMask instanceof Uint8Array) || candidate.landMask.length !== expectedSize) {
    throw new Error("ClimateEngine: Invalid heightfield.landMask payload.");
  }
  return candidate;
}

/**
 * Resolve an engine adapter for rainfall operations.
 */
export function resolveAdapter(
  ctx: ExtendedMapContext,
  options: { heightfield?: HeightfieldBuffer | null; riverAdjacency?: Uint8Array | null } = {}
): ClimateAdapter {
  if (!ctx?.adapter) {
    throw new Error(
      "ClimateEngine: MapContext adapter is required (legacy direct-engine fallback removed)."
    );
  }

  const engineAdapter = ctx.adapter;
  const width = ctx.dimensions.width | 0;
  const height = ctx.dimensions.height | 0;
  const expectedSize = Math.max(0, width * height) | 0;
  const heightfield = getHeightfield(ctx, expectedSize, options.heightfield);
  const riverAdjacency = options.riverAdjacency ?? null;
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
          "ClimateEngine: isAdjacentToRivers only supports radius=1 via the river adjacency mask."
        );
      }
      if (!hasRiverAdjacencyArtifact) {
        throw new Error(
          "ClimateEngine: Missing river adjacency mask (required for climate refinement)."
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
  ctx: ExtendedMapContext | null,
  options: { heightfield?: HeightfieldBuffer | null; riverAdjacency?: Uint8Array | null } = {}
): ClimateRuntime {
  if (!ctx) {
    throw new Error(
      "ClimateEngine: MapContext is required (legacy direct-engine fallback removed)."
    );
  }

  const adapter = resolveAdapter(ctx, options);
  const climate = ctx.buffers?.climate;
  const rainfallBuf = climate?.rainfall || null;
  const humidityBuf = climate?.humidity || null;
  const expectedSize = Math.max(0, (width | 0) * (height | 0)) | 0;
  if (!(rainfallBuf instanceof Uint8Array) || rainfallBuf.length !== expectedSize) {
    throw new Error(
      `ClimateEngine: Missing or invalid climate rainfall buffer (expected ${expectedSize}).`
    );
  }
  if (!(humidityBuf instanceof Uint8Array) || humidityBuf.length !== expectedSize) {
    throw new Error(
      `ClimateEngine: Missing or invalid climate humidity buffer (expected ${expectedSize}).`
    );
  }

  const idxAt = (x: number, y: number): number => idx(x, y, width);

  const readRainfall = (x: number, y: number): number => {
    return rainfallBuf[idxAt(x, y)] | 0;
  };

  const writeRainfall = (x: number, y: number, rainfall: number): void => {
    const clamped = clamp(rainfall, 0, 200);
    const humidity = Math.round((clamped / 200) * 255);
    writeClimateField(ctx, x, y, { rainfall: clamped, humidity });
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

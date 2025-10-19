/**
 * Core Types — MapContext, EngineAdapter, and data contracts
 *
 * Purpose:
 * - Define the seam between pure logic and engine coupling
 * - MapContext holds all data dependencies for passes (fields, worldModel, rng, config)
 * - EngineAdapter abstracts read/write operations (enables testing, replay, diffing)
 *
 * Invariants:
 * - Passes should ONLY access engine APIs via the adapter
 * - RNG calls should go through ctx.rng() for deterministic replay
 * - Context is immutable reference (but fields are mutable for performance)
 */

/**
 * @typedef {Object} MapDimensions
 * @property {number} width - Map width in tiles
 * @property {number} height - Map height in tiles
 */

/**
 * @typedef {Object} MapFields
 * @property {Uint8Array|null} rainfall - Rainfall per tile (0..200)
 * @property {Int16Array|null} elevation - Elevation per tile
 * @property {Uint8Array|null} temperature - Temperature per tile (0..255)
 * @property {Uint8Array|null} biomeId - Biome type ID per tile
 * @property {Int16Array|null} featureType - Feature type ID per tile
 * @property {Uint8Array|null} terrainType - Terrain type ID per tile
 */

/**
 * Primary morphology staging buffer.
 *
 * These arrays capture the heightfield (terrain + elevation) before it is
 * flushed back to the engine so plates/coastlines/mountains operate on a
 * consistent in-memory surface.
 *
 * @typedef {Object} HeightfieldBuffer
 * @property {Int16Array} elevation - Elevation values staged for morphology
 * @property {Uint8Array} terrain - Terrain type IDs staged for morphology
 * @property {Uint8Array} landMask - Binary land/water mask derived from the heightfield (1 = land)
 */

/**
 * Collection of reusable buffers shared across morphology stages.
 * Additional staging arrays (shore masks, coast metrics, etc.) can be added in
 * later phases.
 *
 * @typedef {Object} MorphologyBuffers
 * @property {HeightfieldBuffer} heightfield - Canonical heightfield staging buffers
 * @property {Map<string, Uint8Array>} scratchMasks - Named scratch masks reused across stages
 */

/**
 * @typedef {Object} RNGState
 * @property {Map<string, number>} callCounts - Tracks RNG calls per label for determinism
 * @property {number|null} seed - Optional seed for replay
 */

/**
 * @typedef {Object} GenerationMetrics
 * @property {Map<string, number>} timings - Pass execution times (ms)
 * @property {Map<string, any>} histograms - Field histograms for validation
 * @property {Array<string>} warnings - Validation warnings
 */

/**
 * MapContext — unified data container passed through the generation pipeline
 *
 * All passes receive a MapContext and may:
 * - Read fields (rainfall, elevation, worldModel data)
 * - Write fields (via adapter)
 * - Call rng() for deterministic randomness
 * - Log metrics
 *
 * @typedef {Object} MapContext
 * @property {MapDimensions} dimensions - Map size
 * @property {MapFields} fields - Typed arrays for terrain data
 * @property {import('../world/model.js').WorldModel|null} worldModel - Physics/tectonics model (attached after init)
 * @property {RNGState} rng - RNG state tracker
 * @property {any} config - Resolved configuration object
 * @property {GenerationMetrics} metrics - Performance and validation metrics
 * @property {EngineAdapter} adapter - Abstraction layer for engine operations
 * @property {{ plateSeed: Readonly<any>|null }} foundation - Shared world foundations (e.g., plate seed metadata)
 * @property {MorphologyBuffers} buffers - Shared morphology buffers
 */

/**
 * EngineAdapter — abstraction for all engine/surface interactions
 *
 * All terrain/feature reads and writes MUST go through this interface.
 * Two implementations:
 * - CivEngineAdapter: uses GameplayMap, TerrainBuilder, etc. (production)
 *
 * @interface
 * @typedef {Object} EngineAdapter
 *
 * === TERRAIN READS ===
 * @property {(x: number, y: number) => boolean} isWater - Check if tile is water
 * @property {(x: number, y: number) => boolean} isMountain - Check if tile is mountain
 * @property {(x: number, y: number, radius: number) => boolean} isAdjacentToRivers - Check if tile is near rivers
 * @property {(x: number, y: number) => number} getElevation - Get tile elevation
 * @property {(x: number, y: number) => number} getTerrainType - Get terrain type ID
 * @property {(x: number, y: number) => number} getRainfall - Get rainfall (0..200)
 * @property {(x: number, y: number) => number} getTemperature - Get temperature
 * @property {(x: number, y: number) => number} getLatitude - Get latitude in degrees
 *
 * === TERRAIN WRITES ===
 * @property {(x: number, y: number, terrainTypeId: number) => void} setTerrainType - Set terrain type
 * @property {(x: number, y: number, rainfall: number) => void} setRainfall - Set rainfall (0..200)
 * @property {(x: number, y: number, elevation: number) => void} setElevation - Set elevation
 *
 * === FEATURE READS/WRITES ===
 * @property {(x: number, y: number) => number} getFeatureType - Get feature type ID
 * @property {(x: number, y: number, featureData: {Feature: number, Direction: number, Elevation: number}) => void} setFeatureType - Set feature
 * @property {(x: number, y: number, featureTypeId: number) => boolean} canHaveFeature - Validate feature placement
 *
 * === RANDOM NUMBER GENERATION ===
 * @property {(max: number, label: string) => number} getRandomNumber - Seeded RNG (0..max-1)
 *
 * === UTILITIES ===
 * @property {() => void} validateAndFixTerrain - Run engine validation pass
 * @property {() => void} recalculateAreas - Rebuild continent/area data
 * @property {(fractalId: number, width: number, height: number, grain: number, flags: number) => void} createFractal - Initialize fractal
 * @property {(fractalId: number, x: number, y: number) => number} getFractalHeight - Sample fractal value
 */

/**
 * Create a new MapContext with default/empty fields.
 *
 * @param {MapDimensions} dimensions
 * @param {EngineAdapter} adapter
 * @param {any} config
 * @returns {MapContext}
 */
export function createMapContext(dimensions, adapter, config) {
  const { width, height } = dimensions;
  const size = width * height;

  const heightfield = {
    elevation: new Int16Array(size),
    terrain: new Uint8Array(size),
    landMask: new Uint8Array(size),
  };

  return {
    dimensions,
    fields: {
      rainfall: new Uint8Array(size),
      elevation: new Int16Array(size),
      temperature: new Uint8Array(size),
      biomeId: new Uint8Array(size),
      featureType: new Int16Array(size),
      terrainType: new Uint8Array(size),
    },
    worldModel: null, // Initialized later if enabled
    rng: {
      callCounts: new Map(),
      seed: null,
    },
    config,
    metrics: {
      timings: new Map(),
      histograms: new Map(),
      warnings: [],
    },
    adapter,
    foundation: {
      plateSeed: null,
    },
    buffers: {
      heightfield,
      scratchMasks: new Map(),
    },
  };
}

/**
 * Deterministic RNG helper for MapContext.
 * Tracks call counts per label for debugging and replay.
 *
 * @param {MapContext} ctx
 * @param {string} label - Unique label for this RNG call site
 * @param {number} max - Return value in [0, max)
 * @returns {number}
 */
export function ctxRandom(ctx, label, max) {
  const count = ctx.rng.callCounts.get(label) || 0;
  ctx.rng.callCounts.set(label, count + 1);

  // Delegate to adapter (which may use seed or engine RNG)
  return ctx.adapter.getRandomNumber(max, `${label}_${count}`);
}

/**
 * Utility: Get linear index from (x, y) coordinates.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @returns {number}
 */
export function idx(x, y, width) {
  return y * width + x;
}

/**
 * Utility: Check if coordinates are in bounds.
 *
 * @param {number} x
 * @param {number} y
 * @param {MapDimensions} dimensions
 * @returns {boolean}
 */
export function inBounds(x, y, dimensions) {
  return x >= 0 && x < dimensions.width && y >= 0 && y < dimensions.height;
}

/**
 * Write staged heightfield values (terrain/elevation/landMask) and mirror the
 * change to the engine adapter when provided.
 *
 * @param {MapContext} ctx
 * @param {number} x
 * @param {number} y
 * @param {{ terrain?: number, elevation?: number, isLand?: boolean }} options
 */
export function writeHeightfield(ctx, x, y, options) {
  if (!ctx || !options) return;
  const { width } = ctx.dimensions;
  const idxValue = y * width + x;
  const hf = ctx.buffers?.heightfield;

  if (hf) {
    if (typeof options.terrain === "number") {
      hf.terrain[idxValue] = options.terrain & 0xff;
    }
    if (typeof options.elevation === "number") {
      hf.elevation[idxValue] = options.elevation | 0;
    }
    if (typeof options.isLand === "boolean") {
      hf.landMask[idxValue] = options.isLand ? 1 : 0;
    }
  }

  if (typeof options.terrain === "number" && ctx.adapter?.setTerrainType) {
    ctx.adapter.setTerrainType(x, y, options.terrain);
  }

  if (typeof options.elevation === "number" && ctx.adapter?.setElevation) {
    ctx.adapter.setElevation(x, y, options.elevation);
  }
}

/**
 * Convenience helper to fill an entire buffer with a value (used for resets).
 *
 * @param {TypedArray} buffer
 * @param {number} value
 */
export function fillBuffer(buffer, value) {
  if (!buffer || typeof buffer.fill !== "function") return;
  buffer.fill(value);
}

/**
 * Synchronize the staged heightfield buffers from the current engine surface.
 * Useful after invoking legacy generators (lakes, rivers) that mutate the
 * gameplay surface directly.
 *
 * @param {MapContext} ctx
 */
export function syncHeightfield(ctx) {
  if (!ctx || !ctx.adapter) return;
  const hf = ctx.buffers?.heightfield;
  if (!hf) return;
  const { width, height } = ctx.dimensions;
  const hasElevation = typeof ctx.adapter.getElevation === "function";
  const hasWaterCheck = typeof ctx.adapter.isWater === "function";
  const hasTerrainGetter = typeof ctx.adapter.getTerrainType === "function";

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxValue = y * width + x;
      if (hasTerrainGetter) {
        const terrain = ctx.adapter.getTerrainType(x, y);
        if (terrain != null) {
          hf.terrain[idxValue] = terrain & 0xff;
        }
      }
      if (hasElevation) {
        const elevation = ctx.adapter.getElevation(x, y);
        if (Number.isFinite(elevation)) {
          hf.elevation[idxValue] = elevation | 0;
        }
      }
      if (hasWaterCheck) {
        hf.landMask[idxValue] = ctx.adapter.isWater(x, y) ? 0 : 1;
      }
    }
  }
}

export default {
  createMapContext,
  ctxRandom,
  idx,
  inBounds,
  writeHeightfield,
  fillBuffer,
  syncHeightfield,
};

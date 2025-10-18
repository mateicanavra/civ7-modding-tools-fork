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
 * @property {import('../world/model.js').WorldModel} worldModel - Physics/tectonics model
 * @property {RNGState} rng - RNG state tracker
 * @property {any} config - Resolved configuration object
 * @property {GenerationMetrics} metrics - Performance and validation metrics
 * @property {EngineAdapter} adapter - Abstraction layer for engine operations
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

export default {
  createMapContext,
  ctxRandom,
  idx,
  inBounds,
};

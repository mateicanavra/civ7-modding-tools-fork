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
 * Staged climate buffer for rainfall and humidity fields. Mirrors the heightfield
 * staging approach so climate passes can operate without mutating GameplayMap
 * directly.
 *
 * @typedef {Object} ClimateFieldBuffer
 * @property {Uint8Array} rainfall - Rainfall values staged for climate passes (0..200)
 * @property {Uint8Array} humidity - Relative humidity or derived moisture metrics (0..255)
 */

/**
 * Collection of reusable buffers shared across generation stages.
 * Additional staging arrays (shore masks, coast metrics, etc.) can be added in
 * later phases.
 *
 * @typedef {Object} MapBuffers
 * @property {HeightfieldBuffer} heightfield - Canonical heightfield staging buffers
 * @property {ClimateFieldBuffer} climate - Staged rainfall/humidity buffers for climate + narrative
 * @property {Map<string, Uint8Array>} scratchMasks - Named scratch masks reused across stages
 */

/**
 * Immutable snapshot describing a sparse narrative overlay.
 * Overlays capture derived storytelling metadata (margins, corridors, etc.)
 * produced during generation so downstream stages can consume consistent
 * products without rerunning expensive passes.
 *
 * @typedef {Object} StoryOverlaySnapshot
 * @property {string} key - Overlay registry key (e.g., "margins")
 * @property {string} kind - Overlay kind identifier
 * @property {number} version - Schema version for the overlay payload
 * @property {number} width - Map width in tiles
 * @property {number} height - Map height in tiles
 * @property {ReadonlyArray<string>} [active] - Active tile identifiers ("x,y" form) when applicable
 * @property {ReadonlyArray<string>} [passive] - Passive tile identifiers ("x,y" form) when applicable
 * @property {Readonly<Record<string, any>>} summary - Overlay summary metadata (counts, thresholds, etc.)
 */

/**
 * Registry of immutable story overlays published during generation.
 * Keys map to overlay snapshots (see StoryOverlaySnapshot).
 *
 * @typedef {Map<string, StoryOverlaySnapshot>} StoryOverlayRegistry
 */

/**
 * Snapshot of the configuration objects that informed the current foundation run.
 * Mirrors come from the resolved tunables so downstream consumers can reason
 * about the knobs that produced the published tensors.
 *
 * @typedef {Object} FoundationConfigSnapshot
 * @property {Readonly<any>} seed
 * @property {Readonly<any>} plates
 * @property {Readonly<any>} dynamics
 * @property {Readonly<any>} surface
 * @property {Readonly<any>} policy
 * @property {Readonly<any>} diagnostics
 */

/**
 * Plate-centric tensors emitted by the WorldModel. All arrays share the map
 * dimensions (width × height) and are treated as read-only snapshots.
 *
 * @typedef {Object} FoundationPlateFields
 * @property {Int16Array} id
 * @property {Uint8Array} boundaryCloseness
 * @property {Uint8Array} boundaryType
 * @property {Uint8Array} tectonicStress
 * @property {Uint8Array} upliftPotential
 * @property {Uint8Array} riftPotential
 * @property {Uint8Array} shieldStability
 * @property {Int8Array} movementU
 * @property {Int8Array} movementV
 * @property {Int8Array} rotation
 */

/**
 * Atmospheric and oceanic tensors emitted by the WorldModel.
 *
 * @typedef {Object} FoundationDynamicsFields
 * @property {Int8Array} windU
 * @property {Int8Array} windV
 * @property {Int8Array} currentU
 * @property {Int8Array} currentV
 * @property {Uint8Array} pressure
 */

/**
 * Diagnostics payload accompanying the foundation tensors.
 *
 * @typedef {Object} FoundationDiagnosticsFields
 * @property {any|null} boundaryTree
 */

/**
 * Immutable data product emitted by the foundation stage.
 * Downstream stages rely on this object instead of touching WorldModel directly.
 *
 * @typedef {Object} FoundationContext
 * @property {{ width: number, height: number, size: number }} dimensions
 * @property {Readonly<any>|null} plateSeed
 * @property {FoundationPlateFields} plates
 * @property {FoundationDynamicsFields} dynamics
 * @property {FoundationDiagnosticsFields} diagnostics
 * @property {FoundationConfigSnapshot} config
 */

const EMPTY_FROZEN_OBJECT = Object.freeze({});

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
 * @property {FoundationContext|null} foundation - Shared world foundations (immutable data product)
 * @property {MapBuffers} buffers - Shared staging buffers
 * @property {StoryOverlayRegistry} overlays - Published story overlays keyed by overlay id
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

  const rainfall = new Uint8Array(size);
  const climate = {
    rainfall,
    humidity: new Uint8Array(size),
  };

  return {
    dimensions,
    fields: {
      rainfall,
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
    foundation: null,
    buffers: {
      heightfield,
      climate,
      scratchMasks: new Map(),
    },
    overlays: new Map(),
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
 * Write staged climate values (rainfall/humidity) and mirror the
 * change to the engine adapter when provided.
 *
 * @param {MapContext} ctx
 * @param {number} x
 * @param {number} y
 * @param {{ rainfall?: number, humidity?: number }} options
 */
export function writeClimateField(ctx, x, y, options) {
  if (!ctx || !options) return;
  const { width } = ctx.dimensions;
  const idxValue = y * width + x;
  const climate = ctx.buffers?.climate;

  if (climate) {
    if (typeof options.rainfall === "number") {
      const rf = Math.max(0, Math.min(200, options.rainfall)) | 0;
      climate.rainfall[idxValue] = rf & 0xff;
      if (ctx.fields?.rainfall) {
        ctx.fields.rainfall[idxValue] = rf & 0xff;
      }
    }
    if (typeof options.humidity === "number") {
      const hum = Math.max(0, Math.min(255, options.humidity)) | 0;
      climate.humidity[idxValue] = hum & 0xff;
    }
  }

  if (typeof options.rainfall === "number" && ctx.adapter?.setRainfall) {
    ctx.adapter.setRainfall(x, y, Math.max(0, Math.min(200, options.rainfall)) | 0);
  }
}

function freezeConfigSnapshot(value) {
  if (!value || typeof value !== "object") return EMPTY_FROZEN_OBJECT;
  try {
    return Object.freeze(value);
  } catch {
    return value;
  }
}

function ensureTensor(name, tensor, size) {
  if (!tensor || typeof tensor.length !== "number") {
    throw new Error(`[FoundationContext] Missing ${name} tensor.`);
  }
  if (tensor.length !== size) {
    throw new Error(
      `[FoundationContext] ${name} tensor length mismatch (expected ${size}, received ${tensor.length}).`
    );
  }
  return tensor;
}

/**
 * Create an immutable FoundationContext snapshot from the active WorldModel.
 *
 * @param {import('../world/model.js').WorldModel} worldModel
 * @param {{ dimensions: MapDimensions, config?: Partial<FoundationConfigSnapshot> }} options
 * @returns {FoundationContext}
 */
export function createFoundationContext(worldModel, options) {
  if (!worldModel || typeof worldModel.isEnabled !== "function" || !worldModel.isEnabled()) {
    throw new Error("[FoundationContext] WorldModel is not initialized or disabled.");
  }
  if (!options || !options.dimensions) {
    throw new Error("[FoundationContext] Map dimensions are required to build the context.");
  }
  const width = options.dimensions.width | 0;
  const height = options.dimensions.height | 0;
  const size = Math.max(0, width * height) | 0;
  if (size <= 0) {
    throw new Error("[FoundationContext] Invalid map dimensions.");
  }

  const plateId = ensureTensor("plateId", worldModel.plateId, size);
  const boundaryCloseness = ensureTensor("boundaryCloseness", worldModel.boundaryCloseness, size);
  const boundaryType = ensureTensor("boundaryType", worldModel.boundaryType, size);
  const tectonicStress = ensureTensor("tectonicStress", worldModel.tectonicStress, size);
  const upliftPotential = ensureTensor("upliftPotential", worldModel.upliftPotential, size);
  const riftPotential = ensureTensor("riftPotential", worldModel.riftPotential, size);
  const shieldStability = ensureTensor("shieldStability", worldModel.shieldStability, size);
  const plateMovementU = ensureTensor("plateMovementU", worldModel.plateMovementU, size);
  const plateMovementV = ensureTensor("plateMovementV", worldModel.plateMovementV, size);
  const plateRotation = ensureTensor("plateRotation", worldModel.plateRotation, size);
  const windU = ensureTensor("windU", worldModel.windU, size);
  const windV = ensureTensor("windV", worldModel.windV, size);
  const currentU = ensureTensor("currentU", worldModel.currentU, size);
  const currentV = ensureTensor("currentV", worldModel.currentV, size);
  const pressure = ensureTensor("pressure", worldModel.pressure, size);

  const configInput = options.config || {};
  const configSnapshot = {
    seed: freezeConfigSnapshot(configInput.seed),
    plates: freezeConfigSnapshot(configInput.plates),
    dynamics: freezeConfigSnapshot(configInput.dynamics),
    surface: freezeConfigSnapshot(configInput.surface),
    policy: freezeConfigSnapshot(configInput.policy),
    diagnostics: freezeConfigSnapshot(configInput.diagnostics),
  };

  return Object.freeze({
    dimensions: Object.freeze({ width, height, size }),
    plateSeed: worldModel.plateSeed || null,
    plates: Object.freeze({
      id: plateId,
      boundaryCloseness,
      boundaryType,
      tectonicStress,
      upliftPotential,
      riftPotential,
      shieldStability,
      movementU: plateMovementU,
      movementV: plateMovementV,
      rotation: plateRotation,
    }),
    dynamics: Object.freeze({ windU, windV, currentU, currentV, pressure }),
    diagnostics: Object.freeze({ boundaryTree: worldModel.boundaryTree || null }),
    config: Object.freeze(configSnapshot),
  });
}

/**
 * Check whether the provided MapContext already carries a FoundationContext.
 *
 * @param {MapContext} ctx
 * @returns {ctx is MapContext & { foundation: FoundationContext }}
 */
export function hasFoundationContext(ctx) {
  return !!(ctx && ctx.foundation && typeof ctx.foundation === "object");
}

/**
 * Assert that a FoundationContext exists on the provided MapContext.
 * Throws when absent so stages fail loudly instead of running with stale data.
 *
 * @param {MapContext} ctx
 * @param {string} [stage]
 * @returns {FoundationContext}
 */
export function assertFoundationContext(ctx, stage) {
  if (hasFoundationContext(ctx)) {
    return /** @type {FoundationContext} */ (ctx.foundation);
  }
  const message = stage
    ? `[StageManifest] Stage "${stage}" requires FoundationContext but it is unavailable.`
    : "[StageManifest] Required FoundationContext is unavailable.";
  console.error(message);
  throw new Error(message);
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

/**
 * Synchronize the staged climate buffers from the current engine surface.
 * Useful after invoking legacy generators (rivers, swatches) that mutate the
 * gameplay surface directly.
 *
 * @param {MapContext} ctx
 */
export function syncClimateField(ctx) {
  if (!ctx || !ctx.adapter) return;
  const climate = ctx.buffers?.climate;
  if (!climate) return;
  const { width, height } = ctx.dimensions;
  const hasRainfall = typeof ctx.adapter.getRainfall === "function";

  if (!hasRainfall) return;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxValue = y * width + x;
      const rf = ctx.adapter.getRainfall(x, y);
      if (Number.isFinite(rf)) {
        const rfClamped = Math.max(0, Math.min(200, rf)) | 0;
        climate.rainfall[idxValue] = rfClamped & 0xff;
        if (ctx.fields?.rainfall) {
          ctx.fields.rainfall[idxValue] = rfClamped & 0xff;
        }
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
  writeClimateField,
  createFoundationContext,
  hasFoundationContext,
  assertFoundationContext,
  fillBuffer,
  syncHeightfield,
  syncClimateField,
};

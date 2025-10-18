/**
 * Engine Adapters — CivEngineAdapter and InMemoryAdapter
 *
 * Purpose:
 * - CivEngineAdapter: production adapter using Civ7 engine APIs (GameplayMap, TerrainBuilder, etc.)
 * - InMemoryAdapter: testing adapter using only typed arrays (headless, deterministic)
 *
 * All passes should interact with the map ONLY via these adapters, never directly.
 */

import { idx } from "./types.js";

/**
 * CivEngineAdapter — production implementation using Civ7 engine APIs
 *
 * Wraps all GameplayMap, TerrainBuilder, FeatureTypes, and other engine calls.
 * This is the adapter used during actual map generation in the game.
 *
 * @implements {import('./types.js').EngineAdapter}
 */
export class CivEngineAdapter {
  /**
   * @param {number} width
   * @param {number} height
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  // ==================== TERRAIN READS ====================

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isWater(x, y) {
    return GameplayMap.isWater(x, y);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isMountain(x, y) {
    if (typeof GameplayMap.isMountain === "function") {
      return GameplayMap.isMountain(x, y);
    }
    // Fallback: check elevation >= 500
    return GameplayMap.getElevation(x, y) >= 500;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @returns {boolean}
   */
  isAdjacentToRivers(x, y, radius) {
    return GameplayMap.isAdjacentToRivers(x, y, radius);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getElevation(x, y) {
    return GameplayMap.getElevation(x, y);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getTerrainType(x, y) {
    return GameplayMap.getTerrainType(x, y);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getRainfall(x, y) {
    return GameplayMap.getRainfall(x, y);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getTemperature(x, y) {
    return GameplayMap.getTemperature(x, y);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getLatitude(x, y) {
    return GameplayMap.getPlotLatitude(x, y);
  }

  // ==================== TERRAIN WRITES ====================

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} terrainTypeId
   */
  setTerrainType(x, y, terrainTypeId) {
    TerrainBuilder.setTerrainType(x, y, terrainTypeId);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} rainfall
   */
  setRainfall(x, y, rainfall) {
    TerrainBuilder.setRainfall(x, y, rainfall);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} elevation
   */
  setElevation(x, y, elevation) {
    // Note: Engine may not expose direct elevation setter; use with caution
    if (typeof TerrainBuilder.setElevation === "function") {
      TerrainBuilder.setElevation(x, y, elevation);
    }
  }

  // ==================== FEATURE READS/WRITES ====================

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getFeatureType(x, y) {
    return GameplayMap.getFeatureType(x, y);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {{Feature: number, Direction: number, Elevation: number}} featureData
   */
  setFeatureType(x, y, featureData) {
    TerrainBuilder.setFeatureType(x, y, featureData);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} featureTypeId
   * @returns {boolean}
   */
  canHaveFeature(x, y, featureTypeId) {
    return TerrainBuilder.canHaveFeature(x, y, featureTypeId);
  }

  // ==================== RANDOM NUMBER GENERATION ====================

  /**
   * @param {number} max
   * @param {string} label
   * @returns {number}
   */
  getRandomNumber(max, label) {
    return TerrainBuilder.getRandomNumber(max, label);
  }

  // ==================== UTILITIES ====================

  validateAndFixTerrain() {
    TerrainBuilder.validateAndFixTerrain();
  }

  recalculateAreas() {
    AreaBuilder.recalculateAreas();
  }

  /**
   * @param {number} fractalId
   * @param {number} width
   * @param {number} height
   * @param {number} grain
   * @param {number} flags
   */
  createFractal(fractalId, width, height, grain, flags) {
    FractalBuilder.create(fractalId, width, height, grain, flags);
  }

  /**
   * @param {number} fractalId
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getFractalHeight(fractalId, x, y) {
    return FractalBuilder.getHeight(fractalId, x, y);
  }

  // ==================== BIOME/CONTINENTS ====================

  stampContinents() {
    TerrainBuilder.stampContinents();
  }

  buildElevation() {
    TerrainBuilder.buildElevation();
  }

  /**
   * @param {number} minLength
   * @param {number} maxLength
   * @param {number} navigableTerrain
   */
  modelRivers(minLength, maxLength, navigableTerrain) {
    TerrainBuilder.modelRivers(minLength, maxLength, navigableTerrain);
  }

  defineNamedRivers() {
    TerrainBuilder.defineNamedRivers();
  }

  storeWaterData() {
    TerrainBuilder.storeWaterData();
  }
}

/**
 * InMemoryAdapter — testing implementation using typed arrays only
 *
 * All state lives in memory; no engine calls. Useful for:
 * - Headless testing (CI)
 * - Golden tests (diff outputs)
 * - Deterministic replay
 * - Performance profiling
 *
 * @implements {import('./types.js').EngineAdapter}
 */
export class InMemoryAdapter {
  /**
   * @param {number} width
   * @param {number} height
   * @param {number|null} seed - Optional RNG seed
   */
  constructor(width, height, seed = null) {
    this.width = width;
    this.height = height;
    this.seed = seed;

    const size = width * height;

    // State arrays
    this.terrainType = new Uint8Array(size); // 0=ocean, 1=flat, etc.
    this.elevation = new Int16Array(size);
    this.rainfall = new Uint8Array(size);
    this.temperature = new Uint8Array(size);
    this.featureType = new Int16Array(size).fill(-1); // -1 = no feature
    this.latitude = new Float32Array(size); // Precomputed latitude per tile

    // Precompute latitudes (mimic Civ7's cylindrical projection)
    for (let y = 0; y < height; y++) {
      // Map y=0 (south pole) to -90°, y=height-1 (north pole) to +90°
      const lat = -90 + (180 * y) / Math.max(1, height - 1);
      for (let x = 0; x < width; x++) {
        this.latitude[idx(x, y, width)] = lat;
      }
    }

    // Simple LCG RNG for deterministic testing
    this.rngState = seed !== null ? seed : 12345;
  }

  // ==================== TERRAIN READS ====================

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isWater(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    const i = idx(x, y, this.width);
    return this.terrainType[i] === 0; // 0 = ocean terrain
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isMountain(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const i = idx(x, y, this.width);
    return this.elevation[i] >= 500;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @returns {boolean}
   */
  isAdjacentToRivers(x, y, radius) {
    // In-memory adapter doesn't track rivers yet
    // Return false for now (rivers are placed by base game)
    return false;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getElevation(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.elevation[idx(x, y, this.width)];
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getTerrainType(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.terrainType[idx(x, y, this.width)];
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getRainfall(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.rainfall[idx(x, y, this.width)];
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getTemperature(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 128;
    return this.temperature[idx(x, y, this.width)];
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getLatitude(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.latitude[idx(x, y, this.width)];
  }

  // ==================== TERRAIN WRITES ====================

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} terrainTypeId
   */
  setTerrainType(x, y, terrainTypeId) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.terrainType[idx(x, y, this.width)] = terrainTypeId;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} rainfall
   */
  setRainfall(x, y, rainfall) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.rainfall[idx(x, y, this.width)] = Math.max(
      0,
      Math.min(200, rainfall | 0)
    );
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} elevation
   */
  setElevation(x, y, elevation) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.elevation[idx(x, y, this.width)] = elevation | 0;
  }

  // ==================== FEATURE READS/WRITES ====================

  /**
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getFeatureType(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
    return this.featureType[idx(x, y, this.width)];
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {{Feature: number, Direction: number, Elevation: number}} featureData
   */
  setFeatureType(x, y, featureData) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.featureType[idx(x, y, this.width)] = featureData.Feature;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} _featureTypeId - Feature type (unused in simplified impl)
   * @returns {boolean}
   */
  canHaveFeature(x, y, _featureTypeId) {
    // Simplified validation: land tiles can have land features, water can have water features
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const hasFeature = this.getFeatureType(x, y) !== -1;

    // Basic rule: no stacking (real engine has full validation logic per feature type)
    if (hasFeature) return false;

    return true;
  }

  // ==================== RANDOM NUMBER GENERATION ====================

  /**
   * @param {number} max
   * @param {string} _label - Label for debugging (unused in testing adapter)
   * @returns {number}
   */
  getRandomNumber(max, _label) {
    // Simple LCG: a=1664525, c=1013904223, m=2^32
    this.rngState = (1664525 * this.rngState + 1013904223) >>> 0;
    return (this.rngState >>> 0) % max;
  }

  // ==================== UTILITIES (no-ops or minimal) ====================

  validateAndFixTerrain() {
    // No-op for in-memory; validation happens externally if needed
  }

  recalculateAreas() {
    // No-op for in-memory
  }

  /**
   * @param {number} _fractalId - Fractal ID (unused)
   * @param {number} _width - Width (unused)
   * @param {number} _height - Height (unused)
   * @param {number} _grain - Grain size (unused)
   * @param {number} _flags - Flags (unused)
   */
  createFractal(_fractalId, _width, _height, _grain, _flags) {
    // No-op for in-memory (fractals not implemented in testing adapter)
  }

  /**
   * @param {number} _fractalId - Fractal ID (unused)
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getFractalHeight(_fractalId, x, y) {
    // Placeholder: return pseudo-random value
    const i = idx(x, y, this.width);
    return (i * 2654435761) % 256; // Simple hash for determinism
  }

  stampContinents() {
    // No-op
  }

  buildElevation() {
    // No-op
  }

  /**
   * @param {number} _minLength - Min river length (unused)
   * @param {number} _maxLength - Max river length (unused)
   * @param {number} _navigableTerrain - Navigable terrain type (unused)
   */
  modelRivers(_minLength, _maxLength, _navigableTerrain) {
    // No-op
  }

  defineNamedRivers() {
    // No-op
  }

  storeWaterData() {
    // No-op
  }
}

export default {
  CivEngineAdapter,
  InMemoryAdapter,
};

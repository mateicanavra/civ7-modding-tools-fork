/**
 * Engine Adapter — CivEngineAdapter
 *
 * Purpose:
 * - CivEngineAdapter: production adapter using Civ7 engine APIs (GameplayMap, TerrainBuilder, etc.)
 *
 * All passes should interact with the map ONLY via this adapter, never directly.
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

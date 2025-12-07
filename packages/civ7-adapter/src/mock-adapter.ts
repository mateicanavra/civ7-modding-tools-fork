/**
 * MockAdapter - Test implementation with configurable behavior
 *
 * This module has NO /base-standard/... imports and can be used
 * in unit tests without the Civ7 game engine.
 */

import type { EngineAdapter, FeatureData } from "./types.js";

/**
 * Configuration options for MockAdapter
 */
export interface MockAdapterConfig {
  width?: number;
  height?: number;
  /** Default terrain type for all tiles */
  defaultTerrainType?: number;
  /** Default elevation for all tiles */
  defaultElevation?: number;
  /** Default rainfall for all tiles */
  defaultRainfall?: number;
  /** Default temperature for all tiles */
  defaultTemperature?: number;
  /** Custom RNG function (default: Math.random) */
  rng?: (max: number, label: string) => number;
}

/**
 * Mock adapter for testing map generation logic without Civ7 engine
 */
export class MockAdapter implements EngineAdapter {
  readonly width: number;
  readonly height: number;

  private terrainTypes: Uint8Array;
  private elevations: Int16Array;
  private rainfall: Uint8Array;
  private temperature: Uint8Array;
  private features: Int16Array;
  private waterMask: Uint8Array;
  private mountainMask: Uint8Array;
  private rngFn: (max: number, label: string) => number;

  constructor(config: MockAdapterConfig = {}) {
    this.width = config.width ?? 128;
    this.height = config.height ?? 80;
    const size = this.width * this.height;

    this.terrainTypes = new Uint8Array(size).fill(config.defaultTerrainType ?? 0);
    this.elevations = new Int16Array(size).fill(config.defaultElevation ?? 100);
    this.rainfall = new Uint8Array(size).fill(config.defaultRainfall ?? 50);
    this.temperature = new Uint8Array(size).fill(config.defaultTemperature ?? 15);
    this.features = new Int16Array(size).fill(-1);
    this.waterMask = new Uint8Array(size);
    this.mountainMask = new Uint8Array(size);
    this.rngFn = config.rng ?? ((max) => Math.floor(Math.random() * max));
  }

  private idx(x: number, y: number): number {
    return y * this.width + x;
  }

  // === TERRAIN READS ===

  isWater(x: number, y: number): boolean {
    return this.waterMask[this.idx(x, y)] === 1;
  }

  isMountain(x: number, y: number): boolean {
    return this.mountainMask[this.idx(x, y)] === 1;
  }

  isAdjacentToRivers(_x: number, _y: number, _radius = 1): boolean {
    return false; // Mock: no rivers by default
  }

  getElevation(x: number, y: number): number {
    return this.elevations[this.idx(x, y)];
  }

  getTerrainType(x: number, y: number): number {
    return this.terrainTypes[this.idx(x, y)];
  }

  getRainfall(x: number, y: number): number {
    return this.rainfall[this.idx(x, y)];
  }

  getTemperature(x: number, y: number): number {
    return this.temperature[this.idx(x, y)];
  }

  getLatitude(x: number, y: number): number {
    // Simple latitude calculation: -90 to 90 based on y position
    const normalizedY = y / this.height;
    return 90 - normalizedY * 180;
  }

  // === TERRAIN WRITES ===

  setTerrainType(x: number, y: number, terrainType: number): void {
    this.terrainTypes[this.idx(x, y)] = terrainType;
  }

  setRainfall(x: number, y: number, value: number): void {
    this.rainfall[this.idx(x, y)] = Math.max(0, Math.min(200, value));
  }

  setElevation(x: number, y: number, elevation: number): void {
    this.elevations[this.idx(x, y)] = elevation;
  }

  // === FEATURE READS/WRITES ===

  getFeatureType(x: number, y: number): number {
    return this.features[this.idx(x, y)];
  }

  setFeatureType(x: number, y: number, featureData: FeatureData): void {
    this.features[this.idx(x, y)] = featureData.Feature;
  }

  canHaveFeature(_x: number, _y: number, _featureType: number): boolean {
    return true; // Mock: always allow features
  }

  // === RANDOM NUMBER GENERATION ===

  getRandomNumber(max: number, label: string): number {
    return this.rngFn(max, label);
  }

  // === UTILITIES ===

  validateAndFixTerrain(): void {
    // No-op in mock
  }

  recalculateAreas(): void {
    // No-op in mock
  }

  createFractal(
    _fractalId: number,
    _width: number,
    _height: number,
    _grain: number,
    _flags: number
  ): void {
    // No-op in mock
  }

  getFractalHeight(_fractalId: number, _x: number, _y: number): number {
    return 0; // Mock: flat fractal
  }

  stampContinents(): void {
    // No-op in mock
  }

  buildElevation(): void {
    // No-op in mock
  }

  modelRivers(_minLength: number, _maxLength: number, _navigableTerrain: number): void {
    // No-op in mock
  }

  defineNamedRivers(): void {
    // No-op in mock
  }

  storeWaterData(): void {
    // No-op in mock
  }

  // === MOCK-SPECIFIC HELPERS ===

  /** Set water mask for testing */
  setWater(x: number, y: number, isWater: boolean): void {
    this.waterMask[this.idx(x, y)] = isWater ? 1 : 0;
  }

  /** Set mountain mask for testing */
  setMountain(x: number, y: number, isMountain: boolean): void {
    this.mountainMask[this.idx(x, y)] = isMountain ? 1 : 0;
  }

  /** Fill all tiles with water/land */
  fillWater(isWater: boolean): void {
    this.waterMask.fill(isWater ? 1 : 0);
  }

  /** Reset all data to defaults */
  reset(config: MockAdapterConfig = {}): void {
    this.terrainTypes.fill(config.defaultTerrainType ?? 0);
    this.elevations.fill(config.defaultElevation ?? 100);
    this.rainfall.fill(config.defaultRainfall ?? 50);
    this.temperature.fill(config.defaultTemperature ?? 15);
    this.features.fill(-1);
    this.waterMask.fill(0);
    this.mountainMask.fill(0);
  }
}

/**
 * Create a mock adapter with default configuration
 */
export function createMockAdapter(config?: MockAdapterConfig): MockAdapter {
  return new MockAdapter(config);
}

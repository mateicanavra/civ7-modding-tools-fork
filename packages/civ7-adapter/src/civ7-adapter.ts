/**
 * Civ7Adapter - Production implementation using Civ7 engine APIs
 *
 * This is the ONLY module allowed to import /base-standard/... paths.
 * All other code must consume the EngineAdapter interface.
 */

/// <reference types="@civ7/types" />

import type { EngineAdapter, FeatureData } from "./types.js";

// Import from /base-standard/... — these are external Civ7 runtime paths
// resolved by the game's module loader, not TypeScript
import "/base-standard/maps/map-globals.js";
// @ts-expect-error - Civ7 runtime module
import { designateBiomes as civ7DesignateBiomes } from "/base-standard/maps/biomes.js";
// @ts-expect-error - Civ7 runtime module
import { addFeatures as civ7AddFeatures } from "/base-standard/maps/features.js";

/**
 * Production adapter wrapping GameplayMap, TerrainBuilder, AreaBuilder, FractalBuilder
 */
export class Civ7Adapter implements EngineAdapter {
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  // === TERRAIN READS ===

  isWater(x: number, y: number): boolean {
    return GameplayMap.isWater(x, y);
  }

  isMountain(x: number, y: number): boolean {
    if (typeof GameplayMap.isMountain === "function") {
      return GameplayMap.isMountain(x, y);
    }
    // Fallback: check elevation >= 500
    return GameplayMap.getElevation(x, y) >= 500;
  }

  isAdjacentToRivers(x: number, y: number, radius = 1): boolean {
    return GameplayMap.isAdjacentToRivers(x, y, radius);
  }

  getElevation(x: number, y: number): number {
    return GameplayMap.getElevation(x, y);
  }

  getTerrainType(x: number, y: number): number {
    return GameplayMap.getTerrainType(x, y);
  }

  getRainfall(x: number, y: number): number {
    return GameplayMap.getRainfall(x, y);
  }

  getTemperature(x: number, y: number): number {
    return GameplayMap.getTemperature(x, y);
  }

  getLatitude(x: number, y: number): number {
    return GameplayMap.getPlotLatitude(x, y);
  }

  // === TERRAIN WRITES ===

  setTerrainType(x: number, y: number, terrainType: number): void {
    TerrainBuilder.setTerrainType(x, y, terrainType);
  }

  setRainfall(x: number, y: number, rainfall: number): void {
    TerrainBuilder.setRainfall(x, y, rainfall);
  }

  setElevation(x: number, y: number, elevation: number): void {
    TerrainBuilder.setElevation(x, y, elevation);
  }

  // === FEATURE READS/WRITES ===

  getFeatureType(x: number, y: number): number {
    return GameplayMap.getFeatureType(x, y);
  }

  setFeatureType(x: number, y: number, featureData: FeatureData): void {
    TerrainBuilder.setFeatureType(x, y, featureData);
  }

  canHaveFeature(x: number, y: number, featureType: number): boolean {
    return TerrainBuilder.canHaveFeature(x, y, featureType);
  }

  // === RANDOM NUMBER GENERATION ===

  getRandomNumber(max: number, label: string): number {
    return TerrainBuilder.getRandomNumber(max, label);
  }

  // === UTILITIES ===

  validateAndFixTerrain(): void {
    TerrainBuilder.validateAndFixTerrain();
  }

  recalculateAreas(): void {
    AreaBuilder.recalculateAreas();
  }

  createFractal(
    fractalId: number,
    width: number,
    height: number,
    grain: number,
    flags: number
  ): void {
    FractalBuilder.create(fractalId, width, height, grain, flags);
  }

  getFractalHeight(fractalId: number, x: number, y: number): number {
    return FractalBuilder.getHeight(fractalId, x, y);
  }

  stampContinents(): void {
    TerrainBuilder.stampContinents();
  }

  buildElevation(): void {
    TerrainBuilder.buildElevation();
  }

  modelRivers(minLength: number, maxLength: number, navigableTerrain: number): void {
    TerrainBuilder.modelRivers(minLength, maxLength, navigableTerrain);
  }

  defineNamedRivers(): void {
    TerrainBuilder.defineNamedRivers();
  }

  storeWaterData(): void {
    TerrainBuilder.storeWaterData();
  }

  // === BIOMES ===

  designateBiomes(width: number, height: number): void {
    civ7DesignateBiomes(width, height);
  }

  getBiomeGlobal(name: string): number {
    // Biome globals are exposed as g_<Name>Biome on globalThis
    // e.g., g_TropicalBiome, g_GrasslandBiome, g_TundraBiome, etc.
    const globalName = `g_${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}Biome`;
    const value = (globalThis as Record<string, unknown>)[globalName];
    return typeof value === "number" ? value : -1;
  }

  setBiomeType(x: number, y: number, biomeId: number): void {
    TerrainBuilder.setBiomeType(x, y, biomeId);
  }

  getBiomeType(x: number, y: number): number {
    return GameplayMap.getBiomeType(x, y);
  }

  // === FEATURES (extended) ===

  addFeatures(width: number, height: number): void {
    civ7AddFeatures(width, height);
  }

  getFeatureTypeIndex(name: string): number {
    // GameInfo.Features is an iterable table of feature definitions
    // Each has a FeatureType string and an Index number
    const features = GameInfo?.Features;
    if (!features) return -1;

    // Use the find method from GameInfoTable interface
    const feature = features.find((f) => f.FeatureType === name);
    return feature?.Index ?? -1;
  }

  get NO_FEATURE(): number {
    // Use the engine's actual sentinel value for parity
    // Falls back to -1 if FeatureTypes isn't available (e.g., in tests)
    return typeof FeatureTypes !== "undefined" && "NO_FEATURE" in FeatureTypes
      ? FeatureTypes.NO_FEATURE
      : -1;
  }
}

/**
 * Create a Civ7 adapter from current map dimensions
 */
export function createCiv7Adapter(): Civ7Adapter {
  const width = GameplayMap.getGridWidth();
  const height = GameplayMap.getGridHeight();
  return new Civ7Adapter(width, height);
}

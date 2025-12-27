/**
 * Civ7Adapter - Production implementation using Civ7 engine APIs
 *
 * This is the ONLY module allowed to import /base-standard/... paths.
 * All other code must consume the EngineAdapter interface.
 */

/// <reference types="@civ7/types" />

import type { EngineAdapter, FeatureData, MapInfo, MapInitParams, MapSizeId } from "./types.js";

// Import from /base-standard/... — these are external Civ7 runtime paths
// resolved by the game's module loader, not TypeScript
import "/base-standard/maps/map-globals.js";
// Load Voronoi/kd-tree utilities so global VoronoiUtils is available for plate generation
// @ts-ignore - resolved only at Civ7 runtime
import { VoronoiUtils as CivVoronoiUtils } from "/base-standard/scripts/kd-tree.js";
// Ensure global exposure for mapgen-core's auto-detect
(globalThis as Record<string, unknown>).VoronoiUtils =
  (globalThis as Record<string, unknown>).VoronoiUtils || CivVoronoiUtils;
// Vanilla Civ7 biomes/features live in feature-biome-generator.js
// @ts-ignore - resolved only at Civ7 runtime
import { designateBiomes as civ7DesignateBiomes, addFeatures as civ7AddFeatures } from "/base-standard/maps/feature-biome-generator.js";
// Placement modules
// @ts-ignore - resolved only at Civ7 runtime
import { addNaturalWonders as civ7AddNaturalWonders } from "/base-standard/maps/natural-wonder-generator.js";
// @ts-ignore - resolved only at Civ7 runtime
import { generateSnow as civ7GenerateSnow } from "/base-standard/maps/snow-generator.js";
// @ts-ignore - resolved only at Civ7 runtime
import { generateResources as civ7GenerateResources } from "/base-standard/maps/resource-generator.js";
// @ts-ignore - resolved only at Civ7 runtime
import { assignStartPositions as civ7AssignStartPositions, chooseStartSectors as civ7ChooseStartSectors } from "/base-standard/maps/assign-starting-plots.js";
// @ts-ignore - resolved only at Civ7 runtime
import { needHumanNearEquator as civ7NeedHumanNearEquator } from "/base-standard/maps/map-utilities.js";
// @ts-ignore - resolved only at Civ7 runtime
import { generateDiscoveries as civ7GenerateDiscoveries } from "/base-standard/maps/discovery-generator.js";
// @ts-ignore - resolved only at Civ7 runtime
import { assignAdvancedStartRegions as civ7AssignAdvancedStartRegions } from "/base-standard/maps/assign-advanced-start-region.js";
// Elevation terrain generator (lakes/coasts)
// @ts-ignore - resolved only at Civ7 runtime
import { generateLakes as civ7GenerateLakes, expandCoasts as civ7ExpandCoasts } from "/base-standard/maps/elevation-terrain-generator.js";

const EFFECT_IDS = {
  biomesApplied: "effect:engine.biomesApplied",
  featuresApplied: "effect:engine.featuresApplied",
  placementApplied: "effect:engine.placementApplied",
} as const;

/**
 * Production adapter wrapping GameplayMap, TerrainBuilder, AreaBuilder, FractalBuilder
 */
export class Civ7Adapter implements EngineAdapter {
  readonly width: number;
  readonly height: number;
  private readonly effectEvidence = new Set<string>();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  private recordEffect(effectId: string): void {
    this.effectEvidence.add(effectId);
  }

  private recordPlacementEffect(): void {
    this.recordEffect(EFFECT_IDS.placementApplied);
  }

  verifyEffect(effectId: string): boolean {
    return this.effectEvidence.has(effectId);
  }

  // === MAP INIT / MAP INFO ===

  getMapSizeId(): MapSizeId {
    // GameplayMap.getMapSize() is the canonical map-size selection id from game settings.
    return GameplayMap.getMapSize();
  }

  lookupMapInfo(mapSizeId: MapSizeId): MapInfo | null {
    if (!GameInfo?.Maps?.lookup) return null;

    const key: MapSizeId =
      typeof mapSizeId === "string" && /^[0-9]+$/.test(mapSizeId) ? Number(mapSizeId) : mapSizeId;

    const primary = GameInfo.Maps.lookup(key as any) as unknown;
    const fallback =
      key !== mapSizeId ? (GameInfo.Maps.lookup(mapSizeId as any) as unknown) : undefined;

    return ((primary ?? fallback) as MapInfo | undefined) ?? null;
  }

  setMapInitData(params: MapInitParams): void {
    engine.call("SetMapInitData", params);
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

  setLandmassRegionId(x: number, y: number, regionId: number): void {
    TerrainBuilder.setLandmassRegionId(x, y, regionId);
  }

  addPlotTag(x: number, y: number, plotTag: number): void {
    TerrainBuilder.addPlotTag(x, y, plotTag);
  }

  setPlotTag(x: number, y: number, plotTag: number): void {
    TerrainBuilder.setPlotTag(x, y, plotTag);
  }

  // === FEATURE READS/WRITES ===

  getFeatureType(x: number, y: number): number {
    return GameplayMap.getFeatureType(x, y);
  }

  setFeatureType(x: number, y: number, featureData: FeatureData): void {
    TerrainBuilder.setFeatureType(x, y, featureData);
    this.recordEffect(EFFECT_IDS.featuresApplied);
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

  generateLakes(width: number, height: number, tilesPerLake: number): void {
    civ7GenerateLakes(width, height, tilesPerLake);
  }

  expandCoasts(width: number, height: number): void {
    civ7ExpandCoasts(width, height);
  }

  // === BIOMES ===

  designateBiomes(width: number, height: number): void {
    civ7DesignateBiomes(width, height);
    this.recordEffect(EFFECT_IDS.biomesApplied);
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
    this.recordEffect(EFFECT_IDS.biomesApplied);
  }

  getBiomeType(x: number, y: number): number {
    return GameplayMap.getBiomeType(x, y);
  }

  // === FEATURES (extended) ===

  addFeatures(width: number, height: number): void {
    civ7AddFeatures(width, height);
    this.recordEffect(EFFECT_IDS.featuresApplied);
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

  // === PLACEMENT ===

  addNaturalWonders(width: number, height: number, numWonders: number): void {
    civ7AddNaturalWonders(width, height, numWonders);
    this.recordPlacementEffect();
  }

  generateSnow(width: number, height: number): void {
    civ7GenerateSnow(width, height);
    this.recordPlacementEffect();
  }

  generateResources(width: number, height: number): void {
    civ7GenerateResources(width, height);
    this.recordPlacementEffect();
  }

  assignStartPositions(
    playersLandmass1: number,
    playersLandmass2: number,
    westContinent: { west: number; east: number; south: number; north: number },
    eastContinent: { west: number; east: number; south: number; north: number },
    startSectorRows: number,
    startSectorCols: number,
    startSectors: number[]
  ): number[] {
    this.recordPlacementEffect();
    const result = civ7AssignStartPositions(
      playersLandmass1,
      playersLandmass2,
      westContinent,
      eastContinent,
      startSectorRows,
      startSectorCols,
      startSectors
    );
    return Array.isArray(result) ? result : [];
  }

  chooseStartSectors(
    players1: number,
    players2: number,
    rows: number,
    cols: number,
    humanNearEquator: boolean
  ): unknown[] {
    const result = civ7ChooseStartSectors(players1, players2, rows, cols, humanNearEquator);
    return Array.isArray(result) ? result : [];
  }

  needHumanNearEquator(): boolean {
    return civ7NeedHumanNearEquator();
  }

  generateDiscoveries(width: number, height: number, startPositions: number[]): void {
    civ7GenerateDiscoveries(width, height, startPositions);
    this.recordPlacementEffect();
  }

  assignAdvancedStartRegions(): void {
    civ7AssignAdvancedStartRegions();
    this.recordPlacementEffect();
  }

  addFloodplains(minLength: number, maxLength: number): void {
    // TerrainBuilder.addFloodplains may not exist in all engine versions
    const tb = TerrainBuilder as unknown as { addFloodplains?: (min: number, max: number) => void };
    if (typeof tb.addFloodplains === "function") {
      tb.addFloodplains(minLength, maxLength);
    }
    this.recordPlacementEffect();
  }

  recalculateFertility(): void {
    // FertilityBuilder may not exist in all engine versions
    const fb = (globalThis as unknown as { FertilityBuilder?: { recalculate?: () => void } }).FertilityBuilder;
    if (fb && typeof fb.recalculate === "function") {
      fb.recalculate();
    } else {
      console.log("[Civ7Adapter] FertilityBuilder not available - fertility will be calculated by engine defaults");
    }
    this.recordPlacementEffect();
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

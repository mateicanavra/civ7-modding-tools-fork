import { assignAdvancedStartRegions } from './assign-advanced-start-region.js';
import { PlayerRegion, assignStartPositionsFromTiles, assignStartPositions } from './assign-starting-plots.js';
import { generateDiscoveries } from './discovery-generator.js';
import { generateLakes, addHills, buildRainfallMap } from './elevation-terrain-generator.js';
import { designateBiomes, addFeatures } from './feature-biome-generator.js';
import { dumpContinents, dumpTerrain, dumpElevation, dumpRainfall, dumpBiomes, dumpFeatures, dumpResources } from './map-debug-helpers.js';
import { g_PolarWaterRows, g_FlatTerrain, g_MountainTerrain, g_HillTerrain, g_VolcanoFeature, g_OceanTerrain, g_CoastTerrain, g_NavigableRiverTerrain, g_AvoidSeamOffset } from './map-globals.js';
import { addNaturalWonders } from './natural-wonder-generator.js';
import { generateResources } from './resource-generator.js';
import { generateSnow, dumpPermanentSnow } from './snow-generator.js';
import { kdTree } from '../scripts/kd-tree.js';
import { TerrainType } from '../scripts/voronoi-utils.js';
import { VoronoiContinents } from '../scripts/voronoi_maps/continents.js';
import { RuleAvoidEdge } from '../scripts/voronoi_rules/avoid-edge.js';
import './map-utilities.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import '../scripts/random-pcg-32.js';
import '../scripts/voronoi_generators/map-generator.js';
import '../scripts/voronoi_maps/map-common.js';
import '../scripts/voronoi-builder.js';
import '../scripts/voronoi-hex.js';
import '../../core/scripts/MathHelpers.js';
import '../scripts/heap.js';
import '../scripts/voronoi_generators/continent-generator.js';
import '../scripts/quadtree.js';
import '../scripts/voronoi-region.js';
import '../scripts/voronoi_rules/avoid-other-regions.js';
import '../scripts/voronoi_rules/rules-base.js';
import '../scripts/voronoi_rules/cell-area.js';
import '../scripts/voronoi_rules/near-map-center.js';
import '../scripts/voronoi_rules/near-neighbor.js';
import '../scripts/voronoi_rules/near-plate-boundary.js';
import '../scripts/voronoi_rules/near-region-seed.js';
import '../scripts/voronoi_rules/neighbors-in-region.js';
import '../scripts/voronoi_rules/prefer-latitude.js';

console.log("Generating using script Continents-Voronoi.ts");
function requestMapData(initParams) {
  console.log(initParams.width);
  console.log(initParams.height);
  console.log(initParams.topLatitude);
  console.log(initParams.bottomLatitude);
  console.log(initParams.wrapX);
  console.log(initParams.wrapY);
  console.log(initParams.mapSize);
  engine.call("SetMapInitData", initParams);
}
async function generateMap() {
  console.log("Generating a map!");
  console.log(`Age - ${GameInfo.Ages.lookup(Game.age).AgeType}`);
  const iWidth = GameplayMap.getGridWidth();
  const iHeight = GameplayMap.getGridHeight();
  const uiMapSize = GameplayMap.getMapSize();
  const mapInfo = GameInfo.Maps.lookup(uiMapSize);
  if (mapInfo == null) return;
  const iNumNaturalWonders = mapInfo.NumNaturalWonders;
  const iTilesPerLake = mapInfo.LakeGenerationFrequency;
  const iTotalPlayers = Players.getAliveMajorIds().length;
  const startTime = Date.now();
  const voronoiMap = new VoronoiContinents();
  voronoiMap.init(mapInfo.$index);
  const rules = voronoiMap.getBuilder().getGenerator().getRules();
  for (const value of Object.values(rules)) {
    for (const rule of value) {
      if (rule.name == RuleAvoidEdge.getName()) {
        rule.configValues.poleDistance = g_PolarWaterRows;
      }
    }
  }
  const generatorSettings = voronoiMap.getBuilder().getGenerator().getSettings();
  const sizeRatio = generatorSettings.landmass[0].size / (generatorSettings.landmass[0].size + generatorSettings.landmass[1].size);
  const iNumPlayers1 = Math.round(iTotalPlayers * sizeRatio);
  const iNumPlayers2 = iTotalPlayers - iNumPlayers1;
  generatorSettings.landmass[0].playerAreas = iNumPlayers1;
  generatorSettings.landmass[1].playerAreas = iNumPlayers2;
  voronoiMap.getBuilder().simulate();
  const tiles = voronoiMap.getBuilder().getTiles();
  const landmassKdTree = new kdTree((tile) => tile.pos);
  landmassKdTree.build(tiles.flatMap((row) => row.filter((tile) => tile.landmassId > 0)));
  for (let y = 0; y < tiles.length; ++y) {
    for (let x = 0; x < tiles[y].length; ++x) {
      const tile = tiles[y][x];
      if (tile.isLand()) {
        const type = tile.terrainType === TerrainType.Flat ? g_FlatTerrain : tile.terrainType === TerrainType.Mountainous || tile.terrainType === TerrainType.Volcano ? g_MountainTerrain : tile.terrainType === TerrainType.Rough ? g_HillTerrain : g_FlatTerrain;
        TerrainBuilder.setTerrainType(x, y, type);
        if (tile.terrainType === TerrainType.Volcano) {
          TerrainBuilder.setFeatureType(x, y, {
            Feature: g_VolcanoFeature,
            Direction: -1,
            Elevation: 0
          });
        }
        TerrainBuilder.addPlotTag(x, y, PlotTags.PLOT_TAG_LANDMASS);
        if (tile.landmassId === 1) {
          TerrainBuilder.addPlotTag(x, y, PlotTags.PLOT_TAG_WEST_LANDMASS);
        } else if (tile.landmassId === 2) {
          TerrainBuilder.addPlotTag(x, y, PlotTags.PLOT_TAG_EAST_LANDMASS);
        } else {
          TerrainBuilder.addPlotTag(x, y, PlotTags.PLOT_TAG_ISLAND);
        }
      } else if (tile.isWater()) {
        const type = tile.terrainType === TerrainType.Ocean ? g_OceanTerrain : g_CoastTerrain;
        TerrainBuilder.setTerrainType(x, y, type);
        TerrainBuilder.addPlotTag(x, y, PlotTags.PLOT_TAG_WATER);
        if (tile.terrainType === TerrainType.Coast) {
          const landmassTile = landmassKdTree.search(tile.pos);
          if (landmassTile.landmassId === 1) {
            TerrainBuilder.addPlotTag(x, y, PlotTags.PLOT_TAG_WEST_WATER);
          } else if (landmassTile.landmassId === 2) {
            TerrainBuilder.addPlotTag(x, y, PlotTags.PLOT_TAG_EAST_WATER);
          } else {
            TerrainBuilder.addPlotTag(x, y, PlotTags.PLOT_TAG_ISLAND_WATER);
          }
        }
      }
    }
  }
  const endTime = Date.now();
  console.log(`Initial Voronoi map generation took ${endTime - startTime} ms`);
  TerrainBuilder.validateAndFixTerrain();
  AreaBuilder.recalculateAreas();
  TerrainBuilder.stampContinents();
  const lakeTiles = generateLakes(iWidth, iHeight, iTilesPerLake);
  console.log(`Updating plot tags for ${lakeTiles.length} lakes.`);
  for (const coord of lakeTiles) {
    const tile = tiles[coord.y][coord.x];
    TerrainBuilder.addPlotTag(coord.x, coord.y, PlotTags.PLOT_TAG_WATER);
    if (tile.landmassId === 1) {
      TerrainBuilder.addPlotTag(coord.x, coord.y, PlotTags.PLOT_TAG_WEST_WATER);
    } else if (tile.landmassId === 2) {
      TerrainBuilder.addPlotTag(coord.x, coord.y, PlotTags.PLOT_TAG_EAST_WATER);
    } else {
      TerrainBuilder.addPlotTag(coord.x, coord.y, PlotTags.PLOT_TAG_ISLAND_WATER);
    }
  }
  AreaBuilder.recalculateAreas();
  TerrainBuilder.buildElevation();
  addHills(iWidth, iHeight);
  buildRainfallMap(iWidth, iHeight);
  TerrainBuilder.modelRivers(5, 15, g_NavigableRiverTerrain);
  TerrainBuilder.validateAndFixTerrain();
  TerrainBuilder.defineNamedRivers();
  designateBiomes(iWidth, iHeight);
  addNaturalWonders(iWidth, iHeight, iNumNaturalWonders);
  TerrainBuilder.addFloodplains(4, 10);
  addFeatures(iWidth, iHeight);
  TerrainBuilder.validateAndFixTerrain();
  AreaBuilder.recalculateAreas();
  TerrainBuilder.storeWaterData();
  generateSnow(iWidth, iHeight);
  dumpContinents(iWidth, iHeight);
  dumpTerrain(iWidth, iHeight);
  dumpElevation(iWidth, iHeight);
  dumpRainfall(iWidth, iHeight);
  dumpBiomes(iWidth, iHeight);
  dumpFeatures(iWidth, iHeight);
  dumpPermanentSnow(iWidth, iHeight);
  generateResources(iWidth, iHeight);
  let startPositions = [];
  const USE_VORONOI_START_POSITIONS = true;
  if (USE_VORONOI_START_POSITIONS) {
    const fertilityGetter = (tile) => StartPositioner.getPlotFertilityForCoord(tile.coord.x, tile.coord.y);
    voronoiMap.getBuilder().createMajorPlayerAreas(fertilityGetter);
    const playerRegions = Array.from({ length: iTotalPlayers }, () => new PlayerRegion());
    playerRegions.forEach((region, index) => region.regionId = index);
    console.log(`Creating player regions.. initializing indices: ${playerRegions.map((pr) => pr.regionId)}`);
    let offset = 0;
    const offsets = [0].concat([...generatorSettings.landmass.map((n) => offset += n.playerAreas)]);
    for (const row of tiles) {
      for (const tile of row) {
        if (tile.majorPlayerRegionId >= 0 && tile.landmassId > 0) {
          const regionId = tile.majorPlayerRegionId + offsets[tile.landmassId - 1];
          const playerRegion = playerRegions[regionId];
          playerRegion.landmassId = tile.landmassId - 1;
          playerRegion.tiles.push({ x: tile.coord.x, y: tile.coord.y });
        }
      }
    }
    startPositions = assignStartPositionsFromTiles(playerRegions);
  } else {
    const continent = {
      west: g_AvoidSeamOffset,
      east: iWidth - g_AvoidSeamOffset,
      south: g_PolarWaterRows,
      north: iHeight - g_PolarWaterRows,
      continent: 0
    };
    startPositions = assignStartPositions(iNumPlayers1, iNumPlayers2, continent, continent, 0, 0, []);
  }
  generateDiscoveries(iWidth, iHeight, startPositions);
  dumpResources(iWidth, iHeight);
  FertilityBuilder.recalculate();
  assignAdvancedStartRegions();
}
engine.on("RequestMapInitData", requestMapData);
engine.on("GenerateMap", generateMap);
//# sourceMappingURL=continents-voronoi.js.map

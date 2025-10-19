import { rotate2, add2 } from '../../core/scripts/MathHelpers.js';
import { Heap } from './heap.js';
import { kdTree } from './kd-tree.js';
import { TerrainType, BiomeType, DetailsType, VoronoiUtils } from './voronoi-utils.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import './random-pcg-32.js';

class HexTile {
  pos = { x: 0, y: 0 };
  coord = { x: 0, y: 0 };
  plateId = -1;
  landmassId = -1;
  elevation = 0;
  majorPlayerRegionId = -1;
  terrainType = TerrainType.Unknown;
  biomeType = BiomeType.Unknown;
  detailsType = DetailsType.None;
  visited = 0;
  // used during map creation and processing.
  isLand() {
    return this.terrainType === TerrainType.Flat || this.terrainType === TerrainType.Mountainous || this.terrainType === TerrainType.Volcano || this.terrainType === TerrainType.Rough;
  }
  isWater() {
    return this.terrainType === TerrainType.Ocean || this.terrainType === TerrainType.Coast || this.terrainType === TerrainType.NavRiver;
  }
}
var FloodFillResult = /* @__PURE__ */ ((FloodFillResult2) => {
  FloodFillResult2[FloodFillResult2["Include"] = 0] = "Include";
  FloodFillResult2[FloodFillResult2["Exclude"] = 1] = "Exclude";
  FloodFillResult2[FloodFillResult2["Halt"] = 2] = "Halt";
  return FloodFillResult2;
})(FloodFillResult || {});
class VoronoiHex {
  static POLE_MARGIN = 2;
  // guaranteed rows of ocean near poles.
  m_tiles = [];
  m_wrappedXIndices = [];
  // Saves lots of % calls
  init(generator, width, height) {
    this.m_wrappedXIndices = Array.from({ length: width * 3 }, (_, index) => index % width);
    const tree = generator.getKdTree();
    const yOffset = 0.325;
    this.m_tiles = new Array(height);
    const offsetPoint = { x: 0.736 * 0.5, y: 0 };
    const offsetPoints = [{ x: 0, y: 0 }];
    for (let i = 0; i < 6; ++i) {
      offsetPoints.push(rotate2(offsetPoint, i * Math.PI / 3));
    }
    for (let y = 0; y < height; ++y) {
      this.m_tiles[y] = new Array(width);
      const xOffset = y % 2 == 0 ? 0 : Math.sqrt(3) * 0.25;
      for (let x = 0; x < width; ++x) {
        const center = { x: xOffset + x * Math.sqrt(3) * 0.5, y: yOffset + y * 0.75 };
        const getRegionCellKey = (cell) => {
          return `${cell.terrainType}`;
        };
        const regionCells = /* @__PURE__ */ new Map();
        for (const offsetPos of offsetPoints) {
          const samplePos = add2(offsetPos, center);
          const regionCell = tree.search(samplePos);
          if (regionCell) {
            const regionCellKey = getRegionCellKey(regionCell);
            const entry = regionCells.get(regionCellKey);
            if (entry) {
              entry[0]++;
            } else {
              regionCells.set(regionCellKey, [1, regionCell]);
            }
          }
        }
        let dominantCell = null;
        let maxCount = 0;
        for (const [_key, [count, cell]] of regionCells) {
          if (count > maxCount) {
            dominantCell = cell;
            maxCount = count;
          }
        }
        const hexTile = new HexTile();
        if (dominantCell) {
          hexTile.pos = center;
          hexTile.coord = { x, y };
          hexTile.plateId = dominantCell.plateId;
          hexTile.landmassId = dominantCell.landmassId;
          hexTile.terrainType = dominantCell.terrainType;
          hexTile.biomeType = dominantCell.biomeType;
          hexTile.detailsType = dominantCell.detailsType;
        }
        this.m_tiles[y][x] = hexTile;
      }
    }
  }
  // returns neighbors in clockwise order starting from upper-right. Tiles may be undefined if near poles. Wraps in x.
  getNeighbors(tile) {
    return this.getNeighborsOfArr(tile.coord, this.m_tiles);
  }
  EvenRowDeltas = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1]
  ];
  OddRowDeltas = [
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 0],
    [0, -1]
  ];
  getNeighborsOfArr(coord, arr) {
    const deltas = coord.y % 2 === 0 ? this.EvenRowDeltas : this.OddRowDeltas;
    return deltas.map(([dx, dy]) => {
      const ny = coord.y + dy;
      if (ny < 0 || ny >= arr.length) return void 0;
      const nx = coord.x + dx + arr[0].length;
      return arr[ny][this.m_wrappedXIndices[nx]];
    });
  }
  validate() {
    this.validatePoles();
    this.validateCoasts();
    this.removeLakes();
    this.removeAdjacentVolcanoes();
    this.removeBridgingCoasts();
  }
  validatePoles() {
    for (let y = 0; y < VoronoiHex.POLE_MARGIN; ++y) {
      for (const tile of this.m_tiles[y]) {
        tile.terrainType = TerrainType.Ocean;
      }
    }
    for (let y = this.m_tiles.length - VoronoiHex.POLE_MARGIN; y < this.m_tiles.length; ++y) {
      for (const tile of this.m_tiles[y]) {
        tile.terrainType = TerrainType.Ocean;
      }
    }
  }
  validateCoasts() {
    for (let y = VoronoiHex.POLE_MARGIN; y < this.m_tiles.length - VoronoiHex.POLE_MARGIN; ++y) {
      for (const tile of this.m_tiles[y]) {
        if (tile.terrainType !== TerrainType.Ocean && tile.terrainType !== TerrainType.Coast) {
          const neighbors = this.getNeighbors(tile);
          for (const neighbor of neighbors) {
            if (neighbor && neighbor.terrainType === TerrainType.Ocean) {
              neighbor.terrainType = TerrainType.Coast;
              neighbor.landmassId = tile.landmassId;
            }
          }
        }
      }
    }
  }
  removeLakes() {
    for (let y = VoronoiHex.POLE_MARGIN; y < this.m_tiles.length - VoronoiHex.POLE_MARGIN; ++y) {
      for (const tile of this.m_tiles[y]) {
        if (tile.terrainType === TerrainType.Coast && !tile.visited) {
          let foundOcean = false;
          let landmassId = 0;
          const floodTiles = this.floodFill(tile, (tile2) => {
            if (tile2.terrainType === TerrainType.Coast) {
              return 0 /* Include */;
            } else if (tile2.terrainType === TerrainType.Ocean) {
              foundOcean = true;
            } else if (tile2.terrainType === TerrainType.Flat) {
              landmassId = tile2.landmassId;
            }
            return 1 /* Exclude */;
          });
          if (!foundOcean) {
            for (const tile2 of floodTiles) {
              tile2.terrainType = TerrainType.Flat;
              tile2.landmassId = landmassId;
            }
          }
        }
      }
    }
    this.clearVisited();
  }
  removeAdjacentVolcanoes() {
    for (let y = VoronoiHex.POLE_MARGIN; y < this.m_tiles.length - VoronoiHex.POLE_MARGIN; ++y) {
      for (const tile of this.m_tiles[y]) {
        if (tile.terrainType === TerrainType.Volcano) {
          for (const neighbor of this.getNeighbors(tile)) {
            if (neighbor?.terrainType === TerrainType.Volcano) {
              tile.terrainType = TerrainType.Mountainous;
            }
          }
        }
      }
    }
  }
  removeBridgingCoasts() {
    for (let y = VoronoiHex.POLE_MARGIN; y < this.m_tiles.length - VoronoiHex.POLE_MARGIN; ++y) {
      for (const tile of this.m_tiles[y]) {
        if (tile.terrainType === TerrainType.Coast) {
          let allNeighborsAreWater = true;
          let hasForeignNeighbor = false;
          for (const neighbor of this.getNeighbors(tile)) {
            if (neighbor?.terrainType !== TerrainType.Coast && neighbor?.terrainType !== TerrainType.Ocean) {
              allNeighborsAreWater = false;
              break;
            }
            if (neighbor.landmassId != tile.landmassId && neighbor.landmassId != 0) {
              hasForeignNeighbor = true;
            }
          }
          if (allNeighborsAreWater && hasForeignNeighbor) {
            tile.landmassId = 0;
            tile.terrainType = TerrainType.Ocean;
          }
        }
      }
    }
  }
  createMajorPlayerAreas(landmasses, valueFunction) {
    console.log("Creating major player regions...");
    const detailedLogs = false;
    VoronoiUtils.performanceMarker("createMajorPlayerAreas - Begin");
    for (const landmass of landmasses) {
      console.log(`Requesting ${landmass.playerAreas} player areas on landmass ${landmass.id}`);
      if (landmass.playerAreas == 0) continue;
      let landmassTiles = this.m_tiles.flatMap(
        (row) => row.filter((tile) => tile.landmassId === landmass.id)
      );
      const tileIsPassable = (tile) => {
        return tile.terrainType != TerrainType.Mountainous && tile.terrainType != TerrainType.Volcano && tile.terrainType != TerrainType.Ocean;
      };
      const floodBucket = [];
      for (const tile of landmassTiles) {
        if (!tile.visited) {
          floodBucket.push(
            this.floodFill(
              tile,
              (tile2) => tileIsPassable(tile2) ? 0 /* Include */ : 1 /* Exclude */
            )
          );
        }
      }
      landmassTiles.forEach((tile) => {
        tile.visited = 0;
        tile.majorPlayerRegionId = -1;
      });
      landmassTiles = floodBucket.sort((a, b) => b.length - a.length)[0];
      if (landmass.playerAreas == 1) {
        landmassTiles.forEach((tile) => tile.majorPlayerRegionId = 0);
        continue;
      }
      const landmassKdTree = new kdTree((tile) => tile.pos);
      landmassKdTree.build(landmassTiles);
      class SeedTile {
        tile;
        count;
      }
      const seedTiles = new Array(landmass.playerAreas);
      for (let i = 0; i < landmass.playerAreas; ++i) {
        seedTiles[i] = {
          tile: landmassTiles[i * Math.floor(landmassTiles.length / landmass.playerAreas)],
          count: 0
        };
      }
      const getAverageRegionPositions = (seedTiles2) => {
        for (let j = 0; j < seedTiles2.length; ++j) {
          const totalPos = { x: 0, y: 0 };
          const tilesForSeed = landmassTiles.filter((tile) => tile.majorPlayerRegionId == j);
          tilesForSeed.forEach((tile) => {
            totalPos.x += tile.pos.x;
            totalPos.y += tile.pos.y;
          });
          const averagePos = {
            x: totalPos.x / tilesForSeed.length,
            y: totalPos.y / tilesForSeed.length
          };
          seedTiles2[j] = { tile: landmassKdTree.search(averagePos), count: 0 };
        }
      };
      const relaxationSteps = 10;
      let lastSizeDiff = Infinity;
      for (let i = 0; i < relaxationSteps; ++i) {
        for (const tile of landmassTiles) {
          let bestRegion = 0;
          let closestDistSq = VoronoiUtils.sqDistance(seedTiles[0].tile.pos, tile.pos);
          for (let j = 1; j < seedTiles.length; ++j) {
            const distSq = VoronoiUtils.sqDistance(seedTiles[j].tile.pos, tile.pos);
            if (distSq < closestDistSq) {
              bestRegion = j;
              closestDistSq = distSq;
            }
          }
          tile.majorPlayerRegionId = bestRegion;
          ++seedTiles[bestRegion].count;
        }
        const counts = seedTiles.map((seedTile) => seedTile.count);
        const sizeDiff = Math.max(...counts) - Math.min(...counts);
        if (detailedLogs) {
          console.log("Player region sizes: " + counts.join(", ") + ". Total size difference: " + sizeDiff);
        }
        if (Math.abs(lastSizeDiff - sizeDiff) < 5) {
          break;
        }
        lastSizeDiff = sizeDiff;
        getAverageRegionPositions(seedTiles);
      }
      landmassTiles.forEach((tile) => tile.majorPlayerRegionId = -1);
      VoronoiUtils.performanceMarker("createMajorPlayerAreas - K-means clustering done");
      class ScoredTile {
        tile;
        scores = new Array(playerRegions.length).fill(-1);
        expScores = new Array(playerRegions.length).fill(-1);
        expSum = 0;
        constructor(tile) {
          this.tile = tile;
        }
      }
      class MajorPlayerRegion {
        id = 0;
        totalValue = 0;
        centerPos = { x: 0, y: 0 };
        considerationHeap;
        finalSet = /* @__PURE__ */ new Set();
        borderSet = Array.from({ length: landmass.playerAreas }, () => /* @__PURE__ */ new Set());
      }
      const playerRegions = Array.from({ length: seedTiles.length }, () => new MajorPlayerRegion());
      const scoredTiles = this.m_tiles.map((row) => row.map((item) => new ScoredTile(item)));
      const getScoredTile = (tile) => scoredTiles[tile.coord.y][tile.coord.x];
      const getTileCost = (tile) => {
        return [TerrainType.Coast, TerrainType.NavRiver, TerrainType.Rough].includes(tile.terrainType) ? 2 : 1;
      };
      for (let playerRegionId = 0; playerRegionId < playerRegions.length; ++playerRegionId) {
        const playerRegionBit = 1 << playerRegionId;
        const initialTile = getScoredTile(seedTiles[playerRegionId].tile);
        initialTile.scores[playerRegionId] = 0;
        const considerationHeap = new Heap(
          (a, b) => a.scores[playerRegionId] - b.scores[playerRegionId]
        );
        considerationHeap.push(initialTile);
        while (considerationHeap.size > 0) {
          const bestTile = considerationHeap.pop();
          for (const neighbor of this.getNeighbors(bestTile.tile)) {
            if (neighbor && (neighbor.visited & playerRegionBit) == 0) {
              neighbor.visited |= playerRegionBit;
              const scoredNeighbor = getScoredTile(neighbor);
              scoredNeighbor.scores[playerRegionId] = bestTile.scores[playerRegionId] + getTileCost(neighbor);
              considerationHeap.push(scoredNeighbor);
            }
          }
        }
      }
      landmassTiles.forEach((tile) => {
        tile.visited = 0;
        const scoredTile = getScoredTile(tile);
        const softMaxTemp = 5;
        scoredTile.expScores = scoredTile.scores.map((s) => Math.exp(-s / softMaxTemp));
        scoredTile.expSum = scoredTile.expScores.reduce((a, b) => a + b, 0);
      });
      VoronoiUtils.performanceMarker("createMajorPlayerAreas - Scoring Done");
      let majorPlayerRegionId = 0;
      for (const region of playerRegions) {
        const seedTile = seedTiles[majorPlayerRegionId].tile;
        const scoredSeedTile = getScoredTile(seedTile);
        scoredSeedTile.scores[majorPlayerRegionId] = 0;
        scoredSeedTile.tile.visited = 1 << majorPlayerRegionId;
        region.id = majorPlayerRegionId;
        region.considerationHeap = new Heap((a, b) => {
          const scoreA = a.expScores[region.id] / a.expSum;
          const scoreB = b.expScores[region.id] / b.expSum;
          return scoreB - scoreA;
        });
        region.considerationHeap.push(scoredSeedTile);
        region.centerPos = seedTile.pos;
        ++majorPlayerRegionId;
      }
      const scoringRegions = [...playerRegions];
      while (scoringRegions.length > 0) {
        for (const scoringRegion of scoringRegions) {
          let bestTile = void 0;
          while (bestTile === void 0 && scoringRegion.considerationHeap.size > 0) {
            bestTile = scoringRegion.considerationHeap.pop();
            if (bestTile.tile.majorPlayerRegionId != -1) {
              bestTile = void 0;
            }
          }
          if (bestTile === void 0) {
            scoringRegions.splice(scoringRegions.indexOf(scoringRegion), 1);
            continue;
          }
          bestTile.tile.majorPlayerRegionId = scoringRegion.id;
          scoringRegion.finalSet.add(bestTile.tile);
          const regionBit = 1 << scoringRegion.id;
          for (const neighbor of this.getNeighborsOfArr(bestTile.tile.coord, scoredTiles)) {
            if (neighbor?.tile.majorPlayerRegionId == -1 && (neighbor.tile.visited & regionBit) == 0) {
              neighbor.tile.visited |= regionBit;
              if (tileIsPassable(neighbor.tile)) {
                scoringRegion.considerationHeap.push(neighbor);
              }
            }
          }
        }
      }
      const getTileValue = valueFunction ? valueFunction : (tile) => {
        switch (tile.terrainType) {
          case TerrainType.Coast:
            return 0.5;
          default:
            return 1;
        }
      };
      landmassTiles.forEach((tile) => {
        tile.visited = 0;
        if (tile.majorPlayerRegionId >= 0) {
          playerRegions[tile.majorPlayerRegionId].totalValue += getTileValue(tile);
        }
      });
      VoronoiUtils.performanceMarker("createMajorPlayerAreas - Initial Growth Done");
      console.log(
        `After initial growth, region sizes are: [${playerRegions.map((region) => region.finalSet.size).join(", ")}] and vales are: [${playerRegions.map((region) => region.totalValue).join(", ")}]`
      );
      class Border {
        regionId1 = -1;
        regionId2 = -1;
        count = 1;
        constructor(regionId1, regionId2) {
          [this.regionId1, this.regionId2] = [regionId1, regionId2];
          this.count = 1;
        }
        regionValueDiff() {
          return Math.abs(
            //playerRegions[this.regionId1].finalSet.size - playerRegions[this.regionId2].finalSet.size,
            playerRegions[this.regionId1].totalValue - playerRegions[this.regionId2].totalValue
          );
        }
        isSame(regionId1, regionId2) {
          return this.regionId1 == regionId1 && this.regionId2 == regionId2 || this.regionId2 == regionId1 && this.regionId1 == regionId2;
        }
        getOrderedRegions() {
          return playerRegions[this.regionId1].totalValue < playerRegions[this.regionId2].totalValue ? [this.regionId1, this.regionId2] : [this.regionId2, this.regionId1];
        }
      }
      const borders = [];
      const addBorder = (regionId1, regionId2) => {
        const existingBorder = borders.find(
          (border) => border.isSame(regionId1, regionId2)
        );
        if (existingBorder) {
          ++existingBorder.count;
        } else {
          borders.push(new Border(regionId1, regionId2));
        }
      };
      const getBorderNeighbors = (tile) => {
        const borderNeighbors = [];
        for (const neighbor of this.getNeighbors(tile)) {
          if (neighbor && neighbor.majorPlayerRegionId != -1 && neighbor.majorPlayerRegionId != tile.majorPlayerRegionId) {
            borderNeighbors.push(neighbor);
          }
        }
        return borderNeighbors;
      };
      const isBridgeForRegion = (tile) => {
        const regions = this.getNeighbors(tile).map(
          (n) => n == void 0 || n.majorPlayerRegionId != tile.majorPlayerRegionId ? 0 : 1
        );
        let lastRegionId = regions[0];
        let nonRegionBlobs = 1 - lastRegionId;
        let regionBlobs = lastRegionId;
        for (let i = 1; i < regions.length; ++i) {
          const regionId = regions[i];
          if (lastRegionId == 0 && regionId == 1) ++regionBlobs;
          else if (lastRegionId == 1 && regionId == 0) ++nonRegionBlobs;
          lastRegionId = regionId;
        }
        return nonRegionBlobs > 1 && regionBlobs > 1;
      };
      for (const tile of landmassTiles) {
        if (tile.majorPlayerRegionId == -1) {
          continue;
        }
        const region = playerRegions[tile.majorPlayerRegionId];
        const borderNeighbors = getBorderNeighbors(tile);
        for (const neighbor of borderNeighbors) {
          region.borderSet[neighbor.majorPlayerRegionId].add(tile);
          addBorder(tile.majorPlayerRegionId, neighbor.majorPlayerRegionId);
        }
      }
      const borderSorter = (a, b) => {
        return b.regionValueDiff() - a.regionValueDiff();
      };
      borders.sort(borderSorter);
      if (borders.length === 0) {
        console.warn(
          "No borders found between player regions, unable to balance the size of player starting areas."
        );
        return;
      }
      let count = 0;
      while (borders[0].regionValueDiff() > 1 && count < 100) {
        ++count;
        let bestScore = -Infinity;
        let bestSteal;
        let bestSource;
        let [smallRegionId, bigRegionId] = borders[0].getOrderedRegions();
        let [smallRegion, bigRegion] = [playerRegions[smallRegionId], playerRegions[bigRegionId]];
        let i = 0;
        let border = borders[i];
        while (bestSteal == void 0 && i < borders.length) {
          border = borders[i];
          ++i;
          bestScore = -Infinity;
          [smallRegionId, bigRegionId] = border.getOrderedRegions();
          [smallRegion, bigRegion] = [playerRegions[smallRegionId], playerRegions[bigRegionId]];
          for (const borderTile of smallRegion.borderSet[bigRegionId]) {
            for (const neighbor of getBorderNeighbors(borderTile)) {
              if (neighbor.majorPlayerRegionId == bigRegionId) {
                const neighborPairTile = getScoredTile(neighbor);
                const neighborValue = getTileValue(neighborPairTile.tile);
                const bigRegionScore = neighborPairTile.scores[bigRegionId] - neighborValue;
                const smallRegionScore = neighborPairTile.scores[smallRegionId] - neighborValue;
                const swapScore = bigRegionScore - smallRegionScore;
                if (swapScore > bestScore && !isBridgeForRegion(neighbor) && // doesn't cut region in two
                borders[0].regionValueDiff() - neighborValue > 0) {
                  bestScore = swapScore;
                  bestSteal = neighbor;
                  bestSource = borderTile;
                }
              }
            }
          }
        }
        if (bestSteal != void 0 && bestSource != void 0) {
          if (detailedLogs) {
            console.log(
              `Stealing (${bestSteal.coord.x}, ${bestSteal.coord.y}) from region ${bestSteal.majorPlayerRegionId} to region ${bestSource.majorPlayerRegionId} with score ${bestScore}`
            );
          }
          border.count -= getBorderNeighbors(bestSteal).length;
          {
            const bestStealValue = getTileValue(bestSteal);
            let count2 = 0;
            for (const borderSet of bigRegion.borderSet) {
              count2 += Number(borderSet.delete(bestSteal));
            }
            if (count2 == 0) throw new Error();
            if (!bigRegion.finalSet.delete(bestSteal)) throw new Error();
            bigRegion.totalValue -= bestStealValue;
            bestSteal.majorPlayerRegionId = smallRegionId;
            count2 = 0;
            for (const neighbor of getBorderNeighbors(bestSteal)) {
              if (neighbor.majorPlayerRegionId != smallRegion.id) {
                smallRegion.borderSet[neighbor.majorPlayerRegionId].add(bestSteal);
                ++count2;
              }
            }
            if (count2 == 0) throw new Error();
            smallRegion.finalSet.add(bestSteal);
            smallRegion.totalValue += bestStealValue;
            const borderNeighbors = getBorderNeighbors(bestSteal);
            for (const neighbor of borderNeighbors) {
              addBorder(smallRegionId, neighbor.majorPlayerRegionId);
              bigRegion.borderSet[smallRegionId].add(neighbor);
            }
          }
          if (getBorderNeighbors(bestSource).length == 0) {
            if (!smallRegion.borderSet[bigRegionId].delete(bestSource)) throw new Error();
          }
          if (border.count == 0) {
            VoronoiUtils.swapAndPop(borders, i - 1);
            borders.sort(borderSorter);
          }
          for (let i2 = 0; i2 < borders.length - 1; ++i2) {
            if (borders[i2].regionValueDiff() < borders[i2 + 1].regionValueDiff()) {
              [borders[i2], borders[i2 + 1]] = [borders[i2 + 1], borders[i2]];
            } else {
              break;
            }
          }
        } else {
          break;
        }
        if (detailedLogs) {
          console.log(`  Region sizes: [${playerRegions.map((region) => region.finalSet.size).join(", ")}] `);
          console.log(`  Region values: [${playerRegions.map((region) => region.totalValue).join(", ")}] `);
          console.log(
            `  Borders: [${borders.map((border2) => "([" + border2.getOrderedRegions()[0] + ", " + border2.getOrderedRegions()[1] + "], diff: " + border2.regionValueDiff() + ", count: " + border2.count + ")").join(", ")}] `
          );
        }
      }
      VoronoiUtils.performanceMarker("createMajorPlayerAreas - Region Area Balancing Done");
      for (const region of playerRegions) {
        const inBorderTiles = /* @__PURE__ */ new Set();
        region.finalSet.forEach((tile) => {
          if (getBorderNeighbors(tile).length > 0) inBorderTiles.add(getScoredTile(tile));
        });
        const outBorderTiles = Array.from(
          { length: playerRegions.length },
          () => /* @__PURE__ */ new Set()
        );
        for (const tile of inBorderTiles) {
          for (const neighbor of getBorderNeighbors(tile.tile)) {
            outBorderTiles[neighbor.majorPlayerRegionId].add(getScoredTile(neighbor));
          }
        }
        while (true) {
          const regionPairs = /* @__PURE__ */ new Map();
          for (const inTile2 of inBorderTiles) {
            if (isBridgeForRegion(inTile2.tile)) {
              continue;
            }
            const borderRegions = [];
            for (const neighbor of getBorderNeighbors(inTile2.tile)) {
              if (borderRegions.indexOf(neighbor.majorPlayerRegionId) == -1) {
                borderRegions.push(neighbor.majorPlayerRegionId);
              }
            }
            for (const regionId of borderRegions) {
              let bestTradeScore = 0;
              let bestTradeTile;
              for (const outTile2 of outBorderTiles[regionId]) {
                const inTileValue = getTileValue(inTile2.tile);
                const outTileValue = getTileValue(outTile2.tile);
                const tileValueDiff = inTileValue - outTileValue;
                const scoreBefore = inTile2.scores[region.id] + outTile2.scores[outTile2.tile.majorPlayerRegionId] + tileValueDiff;
                const scoreAfter = inTile2.scores[outTile2.tile.majorPlayerRegionId] + outTile2.scores[region.id] - tileValueDiff;
                const tradeScore = scoreBefore - scoreAfter;
                if (tradeScore > bestTradeScore && !isBridgeForRegion(outTile2.tile)) {
                  bestTradeScore = tradeScore;
                  bestTradeTile = outTile2;
                }
              }
              if (bestTradeTile != void 0) {
                const tradeCandidate = regionPairs.get(regionId);
                if (tradeCandidate == void 0) {
                  regionPairs.set(regionId, {
                    inside: inTile2,
                    outside: bestTradeTile,
                    delta: bestTradeScore
                  });
                } else if (tradeCandidate.delta < bestTradeScore) {
                  tradeCandidate.inside = inTile2;
                  tradeCandidate.outside = bestTradeTile;
                  tradeCandidate.delta = bestTradeScore;
                }
              }
            }
          }
          if (regionPairs.size == 0) {
            break;
          }
          let bestTradeCandidate;
          for (const [_key, value] of regionPairs) {
            if (bestTradeCandidate == void 0 || bestTradeCandidate.delta < value.delta) {
              bestTradeCandidate = value;
            }
          }
          let [inTile, outTile] = [bestTradeCandidate.inside, bestTradeCandidate.outside];
          if (inTile.tile.majorPlayerRegionId == outTile.tile.majorPlayerRegionId) throw new Error("");
          {
            const scoreBefore = inTile.scores[region.id] + outTile.scores[outTile.tile.majorPlayerRegionId];
            const scoreAfter = inTile.scores[outTile.tile.majorPlayerRegionId] + outTile.scores[region.id];
            if (detailedLogs) {
              console.log(
                `Trading (${inTile.tile.coord.x}, ${inTile.tile.coord.y}), region: ${inTile.tile.majorPlayerRegionId} with (${outTile.tile.coord.x}, ${outTile.tile.coord.y}), region: ${outTile.tile.majorPlayerRegionId} to improve total score from ${scoreBefore} to ${scoreAfter} `
              );
            }
          }
          if (!inBorderTiles.delete(inTile)) throw new Error();
          if (!outBorderTiles[outTile.tile.majorPlayerRegionId].delete(outTile)) throw new Error();
          if (!playerRegions[inTile.tile.majorPlayerRegionId].finalSet.delete(inTile.tile)) throw new Error();
          if (!playerRegions[outTile.tile.majorPlayerRegionId].finalSet.delete(outTile.tile))
            throw new Error();
          playerRegions[inTile.tile.majorPlayerRegionId].totalValue -= getTileValue(inTile.tile);
          playerRegions[outTile.tile.majorPlayerRegionId].totalValue -= getTileValue(outTile.tile);
          [inTile.tile.majorPlayerRegionId, outTile.tile.majorPlayerRegionId] = [
            outTile.tile.majorPlayerRegionId,
            inTile.tile.majorPlayerRegionId
          ];
          [inTile, outTile] = [outTile, inTile];
          if (inTile.tile.majorPlayerRegionId != region.id) throw new Error("");
          inBorderTiles.add(inTile);
          outBorderTiles[outTile.tile.majorPlayerRegionId].add(outTile);
          playerRegions[inTile.tile.majorPlayerRegionId].finalSet.add(inTile.tile);
          playerRegions[outTile.tile.majorPlayerRegionId].finalSet.add(outTile.tile);
          playerRegions[inTile.tile.majorPlayerRegionId].totalValue += getTileValue(inTile.tile);
          playerRegions[outTile.tile.majorPlayerRegionId].totalValue += getTileValue(outTile.tile);
          for (const neighbor of this.getNeighbors(inTile.tile)) {
            if (neighbor && getBorderNeighbors(neighbor).length == 0) {
              inBorderTiles.delete(getScoredTile(neighbor));
            }
          }
          for (const neighbor of this.getNeighbors(outTile.tile)) {
            if (neighbor && getBorderNeighbors(neighbor).length == 0) {
              outBorderTiles[neighbor.majorPlayerRegionId].delete(getScoredTile(neighbor));
            }
          }
        }
      }
      this.m_tiles.forEach((row) => row.forEach((tile) => tile.visited = 0));
      VoronoiUtils.performanceMarker("createMajorPlayerAreas - Region Optimizing Done");
      console.log(
        `"Finished creating major player regions for landmass ${landmass.id}, region sizes are: [${playerRegions.map((region) => region.finalSet.size).join(", ")}] and vales are: [${playerRegions.map((region) => region.totalValue).join(", ")}]`
      );
    }
  }
  floodFill(initialTile, considerCallback) {
    initialTile.visited = 1;
    const considerationList = [initialTile];
    const returnList = [];
    while (considerationList.length > 0) {
      const tile = considerationList.pop();
      returnList.push(tile);
      const neighbors = this.getNeighbors(tile);
      for (const neighbor of neighbors) {
        if (neighbor && !neighbor.visited) {
          neighbor.visited = 1;
          const result = considerCallback(neighbor);
          switch (result) {
            case 0 /* Include */:
              considerationList.push(neighbor);
              break;
            case 2 /* Halt */:
              return returnList;
          }
        }
      }
    }
    return returnList;
  }
  clearVisited() {
    for (const row of this.m_tiles) {
      for (const tile of row) {
        tile.visited = 0;
      }
    }
  }
  getTiles() {
    return this.m_tiles;
  }
}

export { HexTile, VoronoiHex };
//# sourceMappingURL=voronoi-hex.js.map

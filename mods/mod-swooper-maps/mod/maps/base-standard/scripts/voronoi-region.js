import { RandomImpl } from './random-pcg-32.js';
import { VoronoiUtils } from './voronoi-utils.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';

class IdScorePair {
  id = 0;
  score = 0;
}
class VoronoiRegion {
  name = "";
  id = 0;
  type = 0;
  maxArea = 0;
  playerAreas = 0;
  color = { x: 0, y: 0, z: 0 };
  seedLocation = { x: 0, y: 0 };
  considerationList = [];
  scoringContext;
  colorString = "";
  quadTree;
  constructor(name, id, type, maxArea, playerAreas, color) {
    this.name = name;
    this.id = id;
    this.type = type;
    this.maxArea = maxArea;
    this.playerAreas = playerAreas;
    this.color = color;
    const r = Math.floor(color.x * 255);
    const g = Math.floor(color.y * 255);
    const b = Math.floor(color.z * 255);
    this.colorString = "rgb(" + r + " ," + g + ", " + b + ")";
  }
  prepareGrowth(regionCells, regions, rules, worldDims, plateRegions) {
    this.scoringContext = {
      cells: regionCells,
      region: this,
      regions,
      plateRegions,
      m_worldDims: { x: worldDims.x, y: worldDims.y },
      totalArea: 0,
      cellCount: 0,
      rules
    };
    for (const rule of Object.values(rules)) {
      rule.prepare();
    }
    regionCells.forEach((cell) => {
      cell.regionConsiderationBits = 0n;
    });
    this.quadTree = void 0;
  }
  growStep() {
    let newCellIndex = 0;
    const regionCells = this.scoringContext.cells;
    for (let i = 0; i < this.considerationList.length; ) {
      const cell = regionCells[this.considerationList[i].id];
      if (this.isCellClaimed(cell)) {
        VoronoiUtils.swapAndPop(this.considerationList, i);
        continue;
      }
      if (this.considerationList[i].score > this.considerationList[newCellIndex].score) {
        newCellIndex = i;
      }
      ++i;
    }
    if (this.considerationList.length == 0 || this.considerationList[newCellIndex].score < 0) {
      return false;
    }
    const newCellId = this.considerationList[newCellIndex].id;
    VoronoiUtils.swapAndPop(this.considerationList, newCellIndex);
    const newCell = regionCells[newCellId];
    this.setRegionIdForCell(newCell, this.id, this.scoringContext);
    this.scoringContext.totalArea += newCell.area;
    this.scoringContext.cellCount++;
    if (this.quadTree) {
      this.quadTree.insert(newCell);
    }
    this.scoringContext.rules.forEach((rule) => rule.notifySelectedCell(newCell, this.scoringContext));
    for (const neighborId of newCell.cell.getNeighborIds()) {
      const neighbor = regionCells[neighborId];
      if (this.isCellClaimed(neighbor)) {
        continue;
      }
      const score = this.scoreCell(neighbor, this.scoringContext);
      if (neighbor.regionConsiderationBits & BigInt(1 << this.id)) {
        const index = this.considerationList.findIndex((value) => value.id === neighborId);
        this.considerationList[index].score = score;
      } else {
        this.considerationList.push({ id: neighborId, score });
      }
    }
    return this.considerationList.length > 0 && this.scoringContext.totalArea < this.maxArea;
  }
  logStats() {
    console.log(
      "Region " + this.id + " total area: " + this.scoringContext?.totalArea + ", cell count: " + this.scoringContext?.cellCount
    );
  }
  getColorString() {
    return this.colorString;
  }
  scoreCell(regionCell, scoringContext) {
    let score = 0;
    for (const rule of Object.values(scoringContext.rules)) {
      if (rule.isActive) {
        score += rule.score(regionCell, scoringContext) * rule.weight;
      }
    }
    return score;
  }
  scoreSingleCell(regionCell) {
    return this.scoreCell(regionCell, this.scoringContext);
  }
  SetQuadTree(quadtree) {
    this.quadTree = quadtree;
  }
}
class LandmassRegion extends VoronoiRegion {
  setRegionIdForCell(cell, id, scoringContext) {
    cell.landmassId = id;
    cell.landmassOrder = scoringContext.cellCount;
  }
  getRegionIdForCell(cell) {
    return cell.landmassId;
  }
  isCellClaimed(cell) {
    return cell.landmassId != 0;
  }
}
class PlateRegion extends VoronoiRegion {
  m_movement = { x: 0, y: 0 };
  m_rotation = 0;
  constructor(name, id, type, maxArea, color) {
    super(name, id, type, maxArea, 0, color);
    const dir = RandomImpl.fRand("Plate Movement Direction") * Math.PI * 2;
    const movementSpeed = RandomImpl.fRand("Plate Movement Speed");
    this.m_movement.x = Math.cos(dir) * movementSpeed;
    this.m_movement.y = Math.sin(dir) * movementSpeed;
    this.m_rotation = RandomImpl.fRand("Plate Rotation") * 2 - 1;
  }
  setRegionIdForCell(cell, id, scoringContext) {
    cell.plateId = id;
    cell.plateOrder = scoringContext.cellCount;
  }
  getRegionIdForCell(cell) {
    return cell.plateId;
  }
  isCellClaimed(cell) {
    return cell.plateId != -1;
  }
}

export { LandmassRegion, PlateRegion, VoronoiRegion };
//# sourceMappingURL=voronoi-region.js.map

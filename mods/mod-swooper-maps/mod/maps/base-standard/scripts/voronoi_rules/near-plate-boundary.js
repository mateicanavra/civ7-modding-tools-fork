import { kdTree } from '../kd-tree.js';
import { PlateBoundaryPosGetter, VoronoiUtils } from '../voronoi-utils.js';
import { Rule } from './rules-base.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import '../random-pcg-32.js';

class RuleNearPlateBoundary extends Rule {
  static getName() {
    return "Near Plate Boundary";
  }
  name = RuleNearPlateBoundary.getName();
  description = "Scores cells based on the distance from their site to the nearest plate boundary.";
  configDefs = {
    scaleFactor: {
      label: "Scale Factor",
      description: "The distance from a plate boundary that represents a score of 0.5. Any cell nearer to a plate boundary will score between 0.5 and 1.0, and any cell farther away will score between 0.0 and 0.5",
      defaultValue: 4,
      min: 0,
      max: 10,
      step: 0.1
    },
    directionInfluence: {
      label: "Plate Direction Influence",
      description: "How much the direction of plate movement relative to the neighboring plate influences the score.",
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.05
    }
  };
  configValues = {
    scaleFactor: this.configDefs.scaleFactor.defaultValue,
    directionInfluence: this.configDefs.directionInfluence.defaultValue
  };
  // This must be provided before the rule can run.
  m_plateBoundaries = new kdTree(PlateBoundaryPosGetter);
  score(regionCell, _ctx) {
    const cellPos = { x: regionCell.cell.site.x, y: regionCell.cell.site.y };
    const boundary = this.m_plateBoundaries.search(cellPos);
    const distance = Math.sqrt(VoronoiUtils.sqDistance(cellPos, boundary.pos));
    const distanceScore = 1 - distance / (distance + this.configValues.scaleFactor);
    const plateMovementScore = distanceScore * boundary.plateSubduction * 0.5;
    return VoronoiUtils.lerp(distanceScore, plateMovementScore, this.configValues.directionInfluence);
  }
}

export { RuleNearPlateBoundary };
//# sourceMappingURL=near-plate-boundary.js.map

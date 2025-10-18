import { VoronoiUtils } from '../voronoi-utils.js';
import { Rule } from './rules-base.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import '../random-pcg-32.js';

class RuleNearNeighbor extends Rule {
  static getName() {
    return "Near Neighbor";
  }
  name = RuleNearNeighbor.getName();
  description = "This is a simple rule that scores nearby cells higher than cells farther away. This is primary used to add some random variation to the score.";
  configDefs = {
    scaleFactor: {
      label: "Scale Factor",
      description: "The distance from a neighboring cell that represents a score of 0.5. Any distance smaller will score between 0.5 and 1.0, and any distance larger will score between 0.0 and 0.5",
      defaultValue: 1,
      min: 0,
      max: 5,
      step: 0.1
    }
  };
  configValues = {
    scaleFactor: this.configDefs.scaleFactor.defaultValue
  };
  score(regionCell, ctx) {
    let neighborDistanceScore = 1;
    for (const neighborId of regionCell.cell.getNeighborIds()) {
      const neighbor = ctx.cells[neighborId];
      if (ctx.region.getRegionIdForCell(neighbor) == ctx.region.id) {
        const neighborDistance = VoronoiUtils.distanceBetweenSites(
          regionCell.cell.site,
          neighbor.cell.site
        );
        neighborDistanceScore = Math.min(
          neighborDistanceScore,
          neighborDistance / (neighborDistance + this.configValues.scaleFactor)
        );
      }
    }
    return 1 - neighborDistanceScore;
  }
}

export { RuleNearNeighbor };
//# sourceMappingURL=near-neighbor.js.map

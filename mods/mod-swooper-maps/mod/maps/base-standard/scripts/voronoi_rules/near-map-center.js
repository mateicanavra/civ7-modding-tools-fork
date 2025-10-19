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

class RuleNearMapCenter extends Rule {
  static getName() {
    return "Near Map Center";
  }
  name = RuleNearMapCenter.getName();
  description = "This is a simple rule that scores cells closer to the map center higher than cells further away.";
  configDefs = {
    scaleFactor: {
      label: "Scale Factor %",
      description: "The distance from the center as a percentage of map width that represents a score of 0.5. Any distance smaller will score between 0.5 and 1.0, and any distance larger will score between 0.0 and 0.5",
      defaultValue: 50,
      min: 0,
      max: 100,
      step: 0.1
    }
  };
  configValues = {
    scaleFactor: this.configDefs.scaleFactor.defaultValue
  };
  score(regionCell, ctx) {
    let distanceToCenter = VoronoiUtils.sqDistance(
      { x: ctx.m_worldDims.x * 0.5, y: ctx.m_worldDims.y * 0.5 },
      { x: regionCell.cell.site.x, y: regionCell.cell.site.y }
    );
    distanceToCenter = Math.sqrt(distanceToCenter);
    let scaleFactor = this.configValues.scaleFactor * 0.01 * ctx.m_worldDims.x;
    scaleFactor *= 0.5;
    return 1 - distanceToCenter / (distanceToCenter + scaleFactor);
  }
}

export { RuleNearMapCenter };
//# sourceMappingURL=near-map-center.js.map

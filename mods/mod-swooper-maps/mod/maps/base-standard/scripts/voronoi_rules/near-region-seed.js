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

class RuleNearRegionSeed extends Rule {
  static getName() {
    return "Near Region Seed";
  }
  name = RuleNearRegionSeed.getName();
  description = "This rule scores cells nearer to the region seed higher than cells farther away.";
  configDefs = {
    scaleFactor: {
      label: "Scale Factor %",
      description: "The distance from the region seed as a percentage of map width that represents a score of 0.5. Any cell nearer to the region seed will score between 0.5 and 1.0, and any cell farther away will score between 0.0 and 0.5",
      defaultValue: 20,
      min: 0,
      max: 100,
      step: 0.1
    },
    invert: {
      label: "Invert",
      description: "Invert the calculation to prefer tile further away from the region seed.",
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 1
    }
  };
  configValues = {
    scaleFactor: this.configDefs.scaleFactor.defaultValue,
    invert: this.configDefs.invert.defaultValue
  };
  score(regionCell, ctx) {
    let distanceToSeed = VoronoiUtils.sqDistance(
      { x: ctx.region.seedLocation.x, y: ctx.region.seedLocation.y },
      { x: regionCell.cell.site.x, y: regionCell.cell.site.y }
    );
    distanceToSeed = Math.sqrt(distanceToSeed);
    let scaleFactor = this.configValues.scaleFactor * 0.01 * ctx.m_worldDims.x;
    scaleFactor *= 0.5;
    let score = distanceToSeed / (distanceToSeed + scaleFactor);
    if (!this.configValues.invert) {
      score = 1 - score;
    }
    return score;
  }
}

export { RuleNearRegionSeed };
//# sourceMappingURL=near-region-seed.js.map

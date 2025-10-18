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

class RuleCellArea extends Rule {
  static getName() {
    return "Cell Area";
  }
  name = RuleCellArea.getName();
  description = "This is a simple rule that scores larger cells higher than smaller cells. This is primary used to add some random variation to the score.";
  configDefs = {
    scaleFactor: {
      label: "Scale Factor",
      description: "The cell area that represents a score of 0.5. Any cell smaller will score between 0 and 0.5, and any cell larger will score between 0.5 and 1.0",
      defaultValue: 1,
      min: 0,
      max: 5,
      step: 0.1
    },
    invert: {
      label: "Invert",
      description: "Invert the calculation to score smaller cells higher.",
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
  score(cell, _ctx) {
    const cellArea = VoronoiUtils.calculateCellArea(cell.cell);
    let score = cellArea / (cellArea + this.configValues.scaleFactor);
    if (this.configValues.invert > 0) {
      score = 1 - score;
    }
    return score;
  }
}

export { RuleCellArea };
//# sourceMappingURL=cell-area.js.map

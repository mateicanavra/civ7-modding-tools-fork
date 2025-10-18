import { Rule } from './rules-base.js';

class LatitudeCells {
  totalCells = 0;
  cellsPerLatitude;
  constructor(numLatitudes) {
    this.cellsPerLatitude = new Array(numLatitudes).fill(0);
  }
}
class RulePreferLatitude extends Rule {
  static getName() {
    return "Prefer Latitude";
  }
  name = RulePreferLatitude.getName();
  description = "This rule scores cells based on how much area a given region occupies at different latitudes. When it is lacking certain latitudes, then it scores cells in that are higher. When it already has plenty of cells in a latitude, those cells will be scored lower. ";
  configDefs = {
    overlap: {
      label: "Overlap %",
      description: "The amount of overlap allowed between latitudes",
      defaultValue: 2,
      min: 0,
      max: 10,
      step: 0.1
    },
    mirror: {
      label: "Mirror",
      description: "Should the preferred latitudes be mirrored across the equator",
      defaultValue: true,
      min: 0,
      max: 1,
      step: 1
    },
    latitudes: {
      label: "Latitudes",
      description: "latitude bands from -90 to +90 degrees",
      defaultValue: [],
      arrayField: {
        latitude: {
          label: "Latitude",
          description: "A latitude bands between -90 and +90 degrees",
          defaultValue: 0
        },
        weight: {
          label: "Weight %",
          description: "What percentage of this continent should be in this latitude band",
          defaultValue: 0,
          min: 0,
          max: 100,
          step: 1
        }
      }
    }
  };
  configValues = {
    overlap: this.configDefs.overlap.defaultValue,
    mirror: this.configDefs.mirror.defaultValue,
    latitudes: new Array(0)
  };
  m_latitudeBounds = [];
  m_regionLatitudeCells = /* @__PURE__ */ new Map();
  prepare() {
    super.prepare();
    this.m_latitudeBounds = [];
    this.m_regionLatitudeCells.clear();
    let previousBoundary = 0;
    const overlap = this.configValues.overlap * 0.01;
    const halfOverlap = overlap * 0.5;
    let latitudes = this.configValues.latitudes.map((value, index) => [index, value]);
    if (this.configValues.mirror) {
      latitudes = latitudes.concat(
        latitudes.map((value) => {
          return [value[0], { latitude: -value[1].latitude, weight: value[1].weight }];
        })
      );
    }
    latitudes.sort((a, b) => b[1].latitude - a[1].latitude);
    for (let i = 0; i < latitudes.length; ++i) {
      const latitudeDegrees = latitudes[i][1].latitude;
      const latitude = -latitudeDegrees / 180 + 0.5;
      const last = i === latitudes.length - 1;
      const nextBoundary = (() => {
        if (last) {
          return 1;
        } else {
          const nextLatitudeDegrees = latitudes[i + 1][1].latitude;
          const nextLatitude = -nextLatitudeDegrees / 180 + 0.5;
          const difference = nextLatitude - latitude;
          return latitude + 0.5 * difference;
        }
      })();
      const latitudeSetting = {
        min: Math.max(0, previousBoundary - halfOverlap),
        max: Math.min(1, nextBoundary + halfOverlap),
        center: latitude,
        weight: latitudes[i][1].weight * 0.01,
        index: latitudes[i][0]
      };
      this.m_latitudeBounds.push(latitudeSetting);
      previousBoundary = nextBoundary;
    }
  }
  score(regionCell, ctx) {
    let latitudeCells = this.m_regionLatitudeCells.get(ctx.region.id);
    if (!latitudeCells) {
      latitudeCells = new LatitudeCells(this.configValues.latitudes.length);
      this.m_regionLatitudeCells.set(regionCell.landmassId, latitudeCells);
    }
    const overlap = this.configValues.overlap * 0.01;
    const yPos = regionCell.cell.site.y / ctx.m_worldDims.y;
    let score = 0;
    for (let i = 0; i < this.m_latitudeBounds.length; ++i) {
      const bounds = this.m_latitudeBounds[i];
      if (yPos < bounds.min || yPos > bounds.max) continue;
      const weight = yPos < bounds.min + overlap ? (yPos - bounds.min) / overlap : yPos > bounds.max - overlap ? (bounds.max - yPos) / overlap : 1;
      const currentPercentage = (latitudeCells.cellsPerLatitude[bounds.index] ?? 0) / Math.max(latitudeCells.totalCells, 1);
      const desiredPercentage = bounds.weight;
      score += weight * Math.min(1, Math.max(0, (desiredPercentage - currentPercentage) / desiredPercentage));
    }
    return score;
  }
  notifySelectedCell(cell, ctx) {
    super.notifySelectedCell(cell, ctx);
    let latitudeCells = this.m_regionLatitudeCells.get(cell.landmassId);
    if (!latitudeCells) {
      latitudeCells = new LatitudeCells(this.configValues.latitudes.length);
      this.m_regionLatitudeCells.set(cell.landmassId, latitudeCells);
    }
    latitudeCells.totalCells++;
    const overlap = this.configValues.overlap * 0.01;
    const yPos = cell.cell.site.y / ctx.m_worldDims.y;
    for (let i = 0; i < this.m_latitudeBounds.length; ++i) {
      const bounds = this.m_latitudeBounds[i];
      if (yPos < bounds.min) break;
      if (yPos < bounds.min + overlap) {
        latitudeCells.cellsPerLatitude[bounds.index] += (yPos - bounds.min) / overlap;
      } else if (yPos < bounds.max - overlap) {
        latitudeCells.cellsPerLatitude[bounds.index] += 1;
      } else if (yPos < bounds.max) {
        latitudeCells.cellsPerLatitude[bounds.index] += (bounds.max - yPos) / overlap;
      }
    }
  }
}

export { RulePreferLatitude };
//# sourceMappingURL=prefer-latitude.js.map

import { RegionType, VoronoiUtils } from '../voronoi-utils.js';
import { Rule } from './rules-base.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import '../random-pcg-32.js';

class RuleAvoidOtherRegions extends Rule {
  static getName() {
    return "Avoid Other Regions";
  }
  name = RuleAvoidOtherRegions.getName();
  description = "This rule is used to avoid other regions within some radius. Cells that are too close will be forcibly disqualified, and scores will be tapered as they get close to this minimum distance. By default any region not in the source region is filtered, but at the code level filters can be added to avoid only specific region types or region ids.";
  configDefs = {
    minDistance: {
      label: "Minimum Separation",
      description: "Cells within this many hexes of another region are excluded.",
      defaultValue: 4,
      min: 0,
      max: 10,
      step: 0.1
    },
    distanceFalloff: {
      label: "Distance Falloff",
      description: "The distance from other regions beyond the minimum at which scores will start to be reduced, gently pushing new cells away from other regions.",
      defaultValue: 4,
      min: 0,
      max: 10,
      step: 0.1
    },
    falloffCurve: {
      label: "Falloff Curve",
      description: "The power (or steepness) of the curve of the falloff. 1 is linear from the start of the falloff until the margin. Higher values will push cells away from the edges sooner, lower values will reduce the scores more slowly until near the margin.",
      defaultValue: 0.25,
      min: 0,
      max: 1,
      step: 0.05
    },
    regionType: {
      label: "Region Type",
      description: "Used to only avoid a specific region type instead of all regions.",
      defaultValue: RegionType.None,
      visible: false
    },
    regionId: {
      label: "Region Id",
      description: "Used to avoid only a specific region ID.",
      defaultValue: -1,
      visible: false
    }
  };
  configValues = {
    minDistance: this.configDefs.minDistance.defaultValue,
    distanceFalloff: this.configDefs.distanceFalloff.defaultValue,
    falloffCurve: this.configDefs.falloffCurve.defaultValue,
    regionType: this.configDefs.regionType.defaultValue,
    regionId: this.configDefs.regionId.defaultValue
  };
  quadtree;
  score(regionCell, ctx) {
    const minDistance = this.configValues.minDistance;
    const minDistanceSq = minDistance * minDistance;
    const maxDistance = minDistance + this.configValues.distanceFalloff;
    const maxDistanceSq = maxDistance * maxDistance;
    let closestDistSq = maxDistanceSq;
    if (this.quadtree) {
      const filter = (item) => ctx.region.getRegionIdForCell(item) != ctx.region.id;
      const nearest = this.quadtree.nearest(regionCell.cell.site, filter, maxDistanceSq);
      if (nearest.cell) {
        closestDistSq = nearest.distSq;
      }
    } else {
      regionCell.ruleConsideration = true;
      const considerList = [regionCell.id];
      const clearList = [regionCell];
      while (considerList.length > 0) {
        const cellId = considerList.pop();
        const cell = ctx.cells[cellId];
        const distanceSq = VoronoiUtils.sqDistanceBetweenSites(regionCell.cell.site, cell.cell.site);
        if (distanceSq < closestDistSq) {
          const regionId = ctx.region.getRegionIdForCell(cell);
          let bAvoidRegion = regionId != ctx.region.id && (regionId === this.configValues.regionId || this.configValues.regionId === -1);
          bAvoidRegion = bAvoidRegion && (this.configValues.regionType === RegionType.None || ctx.regions[regionId].type == this.configValues.regionType);
          if (bAvoidRegion) {
            closestDistSq = Math.min(distanceSq, closestDistSq);
            if (closestDistSq < minDistanceSq) {
              break;
            }
          } else {
            for (const neighborId of cell.cell.getNeighborIds()) {
              const neighbor = ctx.cells[neighborId];
              if (!neighbor.ruleConsideration) {
                neighbor.ruleConsideration = true;
                clearList.push(neighbor);
                considerList.push(neighborId);
              }
            }
          }
        }
      }
      for (const cell of clearList) {
        cell.ruleConsideration = false;
      }
    }
    if (closestDistSq < minDistanceSq) {
      return -100;
    }
    const closestDist = Math.sqrt(closestDistSq);
    let score = VoronoiUtils.clamp(VoronoiUtils.iLerp(minDistance, maxDistance, closestDist), 0, 1);
    score = Math.pow(score, this.configValues.falloffCurve);
    return score;
  }
  setQuadTree(quadtree) {
    this.quadtree = quadtree;
  }
}

export { RuleAvoidOtherRegions };
//# sourceMappingURL=avoid-other-regions.js.map

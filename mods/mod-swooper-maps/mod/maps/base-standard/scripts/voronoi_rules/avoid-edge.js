import { RandomImpl } from '../random-pcg-32.js';
import { VoronoiUtils } from '../voronoi-utils.js';
import { Rule } from './rules-base.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';

class RuleAvoidEdge extends Rule {
  static getName() {
    return "Avoid Edge";
  }
  name = RuleAvoidEdge.getName();
  description = "This rule is used to avoid edges of the map (poles and meridian) and also contains some useful parameters to help break up the edges. It will forcibly disqualify cells that get too close, and allows for a tapering of the score as cells get closer to the edge.";
  configDefs = {
    poleDistance: {
      label: "Polar Margin",
      description: "Cells within this many hexes of either pole are excluded.",
      defaultValue: 2,
      min: 0,
      max: 10,
      step: 0.1
    },
    poleDistanceFalloff: {
      label: "Poles Distance Falloff",
      description: "The distance from the poles beyond the margin at which scores will start to be reduced, gently pushing new cells away from the poles.",
      defaultValue: 6,
      min: 0,
      max: 10,
      step: 0.1
    },
    poleFalloffCurve: {
      label: "Pole Falloff Curve",
      description: "The power (or steepness) of the curve of the falloff. 1 is linear from the start of the falloff until the margin. Higher values will push cells away from the edges sooner, lower values will reduce the scores more slowly until near the margin.",
      defaultValue: 0.25,
      min: 0,
      max: 1,
      step: 0.05
    },
    polePerturbationScale: {
      label: "Pole Perturbation Scale",
      description: "The maximum distance to perturb the polar margins with a sine wave.",
      defaultValue: 2,
      min: 0,
      max: 10,
      step: 0.1
    },
    polePerturbationWavelength: {
      label: "Pole Perturbation Wavelength",
      description: "The wavelength of the perturbation sine wave.",
      defaultValue: 4,
      min: 1,
      max: 10,
      step: 0.1
    },
    meridianDistance: {
      label: "Meridian Margin",
      description: "Cells within this many hexes of either meridian are excluded.",
      defaultValue: 2,
      min: 0,
      max: 10,
      step: 0.1
    },
    meridianDistanceFalloff: {
      label: "Meridian Distance Falloff",
      description: "The distance from the meridian beyond the margin at which scores will start to be reduced, gently pushing new cells away from the meridian.",
      defaultValue: 2,
      min: 0,
      max: 10,
      step: 0.1
    },
    meridianFalloffCurve: {
      label: "Meridian Falloff Curve",
      description: "The power (or steepness) of the curve of the falloff. 1 is linear from the start of the falloff until the margin. Higher values will push cells away from the edges sooner, lower values will reduce the scores more slowly until near the margin.",
      defaultValue: 0.25,
      min: 0,
      max: 1,
      step: 0.05
    },
    avoidCorners: {
      label: "Avoid Corners",
      description: "Increases the meridian falloff by this much as it approaches the poles to discourage cells from clumping up in the corners of the map.",
      defaultValue: 8,
      min: 0,
      max: 20,
      step: 0.1
    }
  };
  configValues = {
    poleDistance: this.configDefs.poleDistance.defaultValue,
    poleDistanceFalloff: this.configDefs.poleDistanceFalloff.defaultValue,
    poleFalloffCurve: this.configDefs.poleFalloffCurve.defaultValue,
    polePerturbationScale: this.configDefs.polePerturbationScale.defaultValue,
    polePerturbationWavelength: this.configDefs.polePerturbationWavelength.defaultValue,
    meridianDistance: this.configDefs.meridianDistance.defaultValue,
    meridianDistanceFalloff: this.configDefs.meridianDistanceFalloff.defaultValue,
    meridianFalloffCurve: this.configDefs.meridianFalloffCurve.defaultValue,
    avoidCorners: this.configDefs.avoidCorners.defaultValue
  };
  randomOffsetTop = 0;
  randomOffsetBottom = 0;
  prepare() {
    this.randomOffsetTop = RandomImpl.fRand("RuleAvoidEdge random offset top");
    this.randomOffsetBottom = RandomImpl.fRand("RuleAvoidEdge random offset bottom");
  }
  score(regionCell, ctx) {
    let cornerAvoidance = Math.abs(ctx.m_worldDims.y - 2 * regionCell.cell.site.y) / ctx.m_worldDims.y;
    cornerAvoidance *= cornerAvoidance * this.configValues.avoidCorners;
    const meridianDistance = Math.min(regionCell.cell.site.x, ctx.m_worldDims.x - regionCell.cell.site.x);
    const meridianDistanceHex = meridianDistance;
    const minMeridianDistance = this.configValues.meridianDistance;
    const maxMeridianDistance = this.configValues.meridianDistance + this.configValues.meridianDistanceFalloff + cornerAvoidance;
    let meridianScore = VoronoiUtils.clamp(
      VoronoiUtils.iLerp(minMeridianDistance, maxMeridianDistance, meridianDistanceHex),
      0,
      1
    );
    meridianScore = Math.pow(meridianScore, this.configValues.meridianFalloffCurve);
    if (meridianDistanceHex < minMeridianDistance) {
      meridianScore = -100;
    }
    let poleDistance = Math.min(regionCell.cell.site.y, ctx.m_worldDims.y - regionCell.cell.site.y);
    const scale = this.configValues.polePerturbationScale * 0.5;
    const wavelength = this.configValues.polePerturbationWavelength;
    const randomOffset = regionCell.cell.site.y < ctx.m_worldDims.y - regionCell.cell.site.y ? this.randomOffsetTop : this.randomOffsetBottom;
    const randomPerturbation = scale + Math.sin((regionCell.cell.site.x + randomOffset * ctx.m_worldDims.x) / wavelength) * scale;
    poleDistance -= randomPerturbation;
    const minPoleDistance = this.configValues.poleDistance;
    const maxPoleDistance = minPoleDistance + this.configValues.poleDistanceFalloff;
    let poleScore = VoronoiUtils.clamp(VoronoiUtils.iLerp(minPoleDistance, maxPoleDistance, poleDistance), 0, 1);
    poleScore = Math.pow(poleScore, this.configValues.poleFalloffCurve);
    if (poleDistance < minPoleDistance) {
      poleScore = -100;
    }
    return Math.min(meridianScore, poleScore);
  }
}

export { RuleAvoidEdge };
//# sourceMappingURL=avoid-edge.js.map

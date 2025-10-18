import { GeneratorType } from '../voronoi_generators/map-generator.js';
import { VoronoiMap } from './map-common.js';
import '../kd-tree.js';
import '../voronoi-utils.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import '../random-pcg-32.js';
import '../voronoi-builder.js';
import '../voronoi-hex.js';
import '../../../core/scripts/MathHelpers.js';
import '../heap.js';
import '../voronoi_generators/continent-generator.js';
import '../quadtree.js';
import '../voronoi-region.js';
import '../voronoi_rules/avoid-edge.js';
import '../voronoi_rules/rules-base.js';
import '../voronoi_rules/avoid-other-regions.js';
import '../voronoi_rules/cell-area.js';
import '../voronoi_rules/near-map-center.js';
import '../voronoi_rules/near-neighbor.js';
import '../voronoi_rules/near-plate-boundary.js';
import '../voronoi_rules/near-region-seed.js';
import '../voronoi_rules/neighbors-in-region.js';
import '../voronoi_rules/prefer-latitude.js';

const pangaeaSettings = {
  "generatorKey": 0,
  "mapConfig": {},
  "generatorConfig": {
    "plate": {
      "plateRotationMultiple": 5
    },
    "landmass": [
      {
        "size": 44,
        "spawnCenterDistance": 0.25,
        "coastalIslands": 20,
        "coastalIslandsSize": 3
      }
    ],
    "island": {
      "minSize": 0.15,
      "maxSize": 2.25,
      "totalSize": 6,
      "poleDistance": 3,
      "meridianDistance": 2
    },
    "mountain": {
      "percent": 12,
      "randomize": 50
    }
  },
  "rulesConfig": {
    "Plates": {
      "Cell Area.weight": 0.15,
      "Near Neighbor.weight": 0.8,
      "Near Neighbor.scaleFactor": 0.5,
      "Near Region Seed.weight": 0.02,
      "Neighbors In Region.weight": 0.6,
      "Neighbors In Region.preferredNeighborCount": 6,
      "Neighbors In Region.deviation": 3
    },
    "Landmasses": {
      "Avoid Edge.weight": 1,
      "Avoid Edge.poleDistanceFalloff": 5,
      "Avoid Edge.poleFalloffCurve": 0.2,
      "Avoid Edge.polePerturbationScale": 4,
      "Avoid Edge.polePerturbationWavelength": 5,
      "Avoid Edge.meridianDistanceFalloff": 12,
      "Avoid Edge.meridianFalloffCurve": 0.3,
      "Avoid Edge.avoidCorners": 18,
      "Cell Area.weight": 0.02,
      "Cell Area.scaleFactor": -0.5,
      "Near Neighbor.weight": 0.8,
      "Near Region Seed.weight": 0.04,
      "Near Region Seed.scaleFactor": 8,
      "Neighbors In Region.weight": 0.25,
      "Neighbors In Region.preferredNeighborCount": 4,
      "Neighbors In Region.deviation": 1.5,
      "Near Map Center.weight": 0.39,
      "Avoid Other Regions.weight": 1,
      "Avoid Other Regions.distanceFalloff": 8,
      "Avoid Other Regions.falloffCurve": 0.2,
      "Avoid Other Regions.regionType": 2,
      "Near Plate Boundary.weight": 0.75,
      "Near Plate Boundary.scaleFactor": 2,
      "Near Plate Boundary.directionInfluence": 0.7,
      "Prefer Latitude.weight": 0.76,
      "Prefer Latitude.overlap": 4,
      "Prefer Latitude.latitudes": [
        {
          "latitude": 25,
          "weight": 20
        },
        {
          "latitude": 45,
          "weight": 20
        },
        {
          "latitude": 70,
          "weight": 20
        }
      ]
    },
    "Coastal Islands": {
      "Avoid Edge.weight": 1,
      "Avoid Edge.poleDistanceFalloff": 2,
      "Avoid Edge.poleFalloffCurve": 0.2,
      "Avoid Edge.polePerturbationScale": 3,
      "Avoid Edge.polePerturbationWavelength": 2,
      "Avoid Edge.meridianDistanceFalloff": 6,
      "Avoid Edge.meridianFalloffCurve": 0.5,
      "Avoid Edge.avoidCorners": 12,
      "Near Neighbor.weight": 0.5,
      "Avoid Other Landmass.weight": 1,
      "Avoid Other Landmass.distanceFalloff": 2,
      "Avoid Other Landmass.regionType": 2,
      "Avoid Other Landmass.regionId": 2,
      "Avoid Own Landmass.weight": 0.63,
      "Avoid Own Landmass.minDistance": 0.9,
      "Avoid Own Landmass.distanceFalloff": 3,
      "Avoid Own Landmass.falloffCurve": 0.7,
      "Avoid Own Landmass.regionType": 2,
      "Avoid Own Landmass.regionId": 1,
      "Avoid Islands.weight": 1,
      "Avoid Islands.distanceFalloff": 2,
      "Avoid Islands.regionType": 3,
      "Near Plate Boundary.weight": 0.75,
      "Near Plate Boundary.scaleFactor": 3,
      "Near Region Seed.weight": 0.3,
      "Near Region Seed.scaleFactor": 15,
      "Near Region Seed.invert": 1
    },
    "Islands": {
      "Avoid Edge.weight": 1,
      "Avoid Edge.poleDistanceFalloff": 4,
      "Avoid Edge.poleFalloffCurve": 0.5,
      "Avoid Edge.meridianDistanceFalloff": 10,
      "Avoid Edge.meridianFalloffCurve": 0.3,
      "Avoid Edge.avoidCorners": 12,
      "Cell Area.weight": 0.15,
      "Near Neighbor.weight": 0.9,
      "Near Neighbor.scaleFactor": 0.5,
      "Near Region Seed.weight": 0.03,
      "Neighbors In Region.weight": 0.6,
      "Neighbors In Region.preferredNeighborCount": 1.5,
      "Neighbors In Region.deviation": 0.5,
      "Near Map Center.weight": 0.04,
      "Avoid Other Regions.weight": 1,
      "Avoid Other Regions.falloffCurve": 0.15,
      "Avoid Other Regions.regionType": 2,
      "Near Plate Boundary.weight": 0.75,
      "Near Plate Boundary.scaleFactor": 2,
      "Near Plate Boundary.directionInfluence": 0.8
    },
    "Mountains": {
      "Cell Area.weight": 0.3,
      "Cell Area.invert": true,
      "Near Neighbor.weight": 0.25,
      "Neighbors In Region.weight": 0.6,
      "Neighbors In Region.preferredNeighborCount": 6,
      "Neighbors In Region.deviation": 4,
      "Near Plate Boundary.weight": 0.75,
      "Near Plate Boundary.scaleFactor": 1,
      "Near Plate Boundary.directionInfluence": 0.4
    },
    "Volcanoes": {
      "Cell Area.weight": 0.3,
      "Cell Area.invert": true,
      "Neighbors In Region.weight": 0.9,
      "Neighbors In Region.preferredNeighborCount": 0
    }
  }
};

class VoronoiPangaea extends VoronoiMap {
  m_schema = {
    voronoiCellCountMultiple: {
      label: "Cell Count Multiple",
      description: "The number of voronoi cells to use relative to hexes.",
      default: 1,
      min: 0.5,
      max: 4,
      step: 0.1
    },
    voronoiRelaxationSteps: {
      label: "Cell Relaxation Steps",
      description: "The number times to relax the voronoi diagram from its original random positions.",
      default: 3,
      min: 0,
      max: 10,
      step: 1
    }
  };
  m_settings;
  constructor() {
    super();
    this.m_settings = this.createDefaultSettings();
  }
  getName() {
    return "Continents";
  }
  init(mapSize) {
    this.initInternal(
      mapSize,
      GeneratorType.Continent,
      pangaeaSettings,
      this.m_settings.voronoiCellCountMultiple,
      this.m_settings.voronoiRelaxationSteps
    );
    this.m_builder.getGenerator().logSettings();
  }
  getSettings() {
    return this.getTypedSettings();
  }
  getTypedSettings() {
    return this.m_settings;
  }
  getSettingsConfig() {
    return this.m_schema;
  }
  getFilename() {
    return "pangaea.mapconfig.js";
  }
}

export { VoronoiPangaea };
//# sourceMappingURL=pangaea.js.map

import { RandomImpl } from '../random-pcg-32.js';
import { MapDims } from '../voronoi-utils.js';
import { GeneratorType } from '../voronoi_generators/map-generator.js';
import { VoronoiMap } from './map-common.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import '../kd-tree.js';
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

const continentSettings = {
  "generatorKey": 0,
  "mapConfig": {
    "totalLandmassSize": 42,
    "minLandmassSize": 16
  },
  "generatorConfig": {
    "plate": {
      "plateRotationMultiple": 5
    },
    "landmass": [
      {
        "variance": 5,
        "erosionPercent": 4,
        "coastalIslands": 12
      },
      {
        "variance": 5,
        "erosionPercent": 4,
        "coastalIslands": 12
      }
    ],
    "island": {
      "totalSize": 5.5,
      "variance": 1,
      "meridianDistance": 3,
      "landmassDistance": 5,
      "erosionPercent": 15
    },
    "mountain": {
      "percent": 12,
      "randomize": 35
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
      "Avoid Edge.poleDistanceFalloff": 2,
      "Avoid Edge.poleFalloffCurve": 0.2,
      "Avoid Edge.polePerturbationScale": 3,
      "Avoid Edge.polePerturbationWavelength": 2,
      "Avoid Edge.meridianDistanceFalloff": 6,
      "Avoid Edge.meridianFalloffCurve": 0.5,
      "Avoid Edge.avoidCorners": 12,
      "Cell Area.weight": 0.01,
      "Near Neighbor.weight": 0.75,
      "Near Region Seed.weight": 0.05,
      "Near Region Seed.scaleFactor": 8,
      "Neighbors In Region.weight": 0.25,
      "Neighbors In Region.preferredNeighborCount": 3.5,
      "Neighbors In Region.deviation": 1.5,
      "Near Map Center.weight": 0.05,
      "Avoid Other Regions.weight": 1,
      "Avoid Other Regions.minDistance": 5,
      "Avoid Other Regions.distanceFalloff": 8,
      "Avoid Other Regions.falloffCurve": 0.2,
      "Avoid Other Regions.regionType": 2,
      "Near Plate Boundary.weight": 0.75,
      "Near Plate Boundary.scaleFactor": 1.5,
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
      "Avoid Edge.meridianDistanceFalloff": 5,
      "Avoid Edge.meridianFalloffCurve": 0.2,
      "Avoid Edge.avoidCorners": 12,
      "Near Neighbor.weight": 0.5,
      "Avoid Other Landmass.weight": 1,
      "Avoid Other Landmass.distanceFalloff": 2,
      "Avoid Other Landmass.regionType": 2,
      "Avoid Other Landmass.regionId": 1,
      "Avoid Own Landmass.weight": 1,
      "Avoid Own Landmass.minDistance": 1,
      "Avoid Own Landmass.distanceFalloff": 2,
      "Avoid Own Landmass.regionType": 2,
      "Avoid Own Landmass.regionId": 2,
      "Avoid Islands.weight": 1,
      "Avoid Islands.distanceFalloff": 2,
      "Avoid Islands.regionType": 3,
      "Near Plate Boundary.weight": 0.75,
      "Near Plate Boundary.scaleFactor": 2,
      "Near Region Seed.weight": 0.3,
      "Near Region Seed.scaleFactor": 15,
      "Near Region Seed.invert": 1
    },
    "Islands": {
      "Avoid Edge.weight": 1,
      "Avoid Edge.poleDistanceFalloff": 4,
      "Avoid Edge.poleFalloffCurve": 0.5,
      "Avoid Edge.meridianDistance": 1,
      "Avoid Edge.meridianDistanceFalloff": 6,
      "Avoid Edge.meridianFalloffCurve": 0.5,
      "Avoid Edge.avoidCorners": 6,
      "Cell Area.weight": 0.15,
      "Cell Area.scaleFactor": -0.2,
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

class VoronoiContinents extends VoronoiMap {
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
    },
    totalLandmassSize: {
      label: "Total Landmass Size",
      description: "The total percentage of land to be taken up by the major landmasses.",
      default: 32,
      min: 20,
      max: 50,
      step: 0.25
    },
    minLandmassSize: {
      label: "Minimum Landmass Size",
      description: "The minimum size a specific landmass can be.",
      default: 12,
      min: 5,
      max: 30,
      step: 0.25
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
      continentSettings,
      this.m_settings.voronoiCellCountMultiple,
      this.m_settings.voronoiRelaxationSteps
    );
    const generatorSettings = this.getBuilder().getGenerator().getSettings();
    const landmassCount = generatorSettings.landmass.length;
    const totalSize = this.m_settings.totalLandmassSize;
    const minSize = this.m_settings.minLandmassSize;
    const dims = MapDims[mapSize];
    const tileCount = dims.x * dims.y;
    const avgDim = dims.x + dims.y / 2;
    const landmassSeparationWidth = 4;
    const landmassSeparationTiles = avgDim * (landmassCount - 1) * landmassSeparationWidth;
    const usablePercentage = (tileCount - landmassSeparationTiles) / tileCount;
    const adjustedTotalSize = totalSize * usablePercentage;
    const adjustedMinSize = minSize * usablePercentage;
    let minTotalSize = adjustedMinSize * landmassCount;
    if (adjustedMinSize > adjustedTotalSize) {
      console.error(
        `Minimum landmass size of ${minSize} is too large to fit ${landmassCount} landmasses with less than ${totalSize} total size.`
      );
      minTotalSize = adjustedTotalSize / landmassCount;
    }
    const remaining = adjustedTotalSize - minTotalSize;
    const cuts = Array.from(
      { length: landmassCount - 1 },
      (_value, index) => RandomImpl.fRand(`Landmass ${index + 1} Size Variance`) * remaining
    );
    cuts.sort((a, b) => a - b);
    const landmassSizes = [];
    let prev = 0;
    for (const cut of cuts) {
      landmassSizes.push(cut - prev + adjustedMinSize);
      prev = cut;
    }
    landmassSizes.push(remaining - prev + adjustedMinSize);
    generatorSettings.landmass.forEach((value, index) => {
      value.size = landmassSizes[index];
    });
    const settingsConfig = this.getBuilder().getGenerator().getGeneratorSettingsConfig();
    const landmassConfig = settingsConfig.find(
      (value) => value.key == "landmass"
    );
    const sizeConfig = landmassConfig.children.data.find(
      (value) => value.key == "size"
    );
    sizeConfig.locked = true;
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
    return "continents.mapconfig.js";
  }
}

export { VoronoiContinents };
//# sourceMappingURL=continents.js.map

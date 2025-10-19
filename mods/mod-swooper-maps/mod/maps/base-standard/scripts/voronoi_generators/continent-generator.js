import { sub2, rotate2, add2, dot2, dot2_90, mul2s, mul2 } from '../../../core/scripts/MathHelpers.js';
import { Aabb2, QuadTree } from '../quadtree.js';
import { kdTree } from '../kd-tree.js';
import { RandomImpl } from '../random-pcg-32.js';
import { PlateRegion, LandmassRegion } from '../voronoi-region.js';
import { PlateBoundaryPosGetter, RegionType, MapSize, VoronoiUtils, MapDims, RegionCell, RegionCellPosGetter, TerrainType } from '../voronoi-utils.js';
import { MapGenerator, GeneratorType } from './map-generator.js';
import { RuleAvoidEdge } from '../voronoi_rules/avoid-edge.js';
import { RuleAvoidOtherRegions } from '../voronoi_rules/avoid-other-regions.js';
import { RuleCellArea } from '../voronoi_rules/cell-area.js';
import { RuleNearMapCenter } from '../voronoi_rules/near-map-center.js';
import { RuleNearNeighbor } from '../voronoi_rules/near-neighbor.js';
import { RuleNearPlateBoundary } from '../voronoi_rules/near-plate-boundary.js';
import { RuleNearRegionSeed } from '../voronoi_rules/near-region-seed.js';
import { RuleNeighborsInRegion } from '../voronoi_rules/neighbors-in-region.js';
import { RulePreferLatitude } from '../voronoi_rules/prefer-latitude.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import '../voronoi_rules/rules-base.js';

class ContinentGenerator extends MapGenerator {
  m_plateRegions = [];
  m_landmassRegions = [];
  m_plateBoundaries = new kdTree(PlateBoundaryPosGetter);
  m_platesDiagram;
  m_plateRuleConfigs = [
    [RuleCellArea, { isActive: true, weight: 0.15, record: {} }],
    [RuleNearNeighbor, { isActive: true, weight: 0.8, record: { scaleFactor: 0.5 } }],
    [RuleNearRegionSeed, { isActive: true, weight: 0.02, record: {} }],
    [RuleNeighborsInRegion, { isActive: true, weight: 0.6, record: { preferredNeighborCount: 6, deviation: 3 } }]
  ];
  m_landmassRuleConfigs = [
    [
      RuleAvoidEdge,
      {
        isActive: true,
        weight: 1,
        record: {
          poleDistance: 2,
          poleDistanceFalloff: 6,
          poleFalloffCurve: 0.2,
          meridianDistance: 2,
          meridianDistanceFalloff: 6,
          meridianFalloffCurve: 0.3,
          avoidCorners: 12
        }
      }
    ],
    [RuleCellArea, { isActive: true, weight: 0.1, record: {} }],
    [RuleNearNeighbor, { isActive: true, weight: 0.5, record: {} }],
    [RuleNearRegionSeed, { isActive: true, weight: 0.05, record: { scaleFactor: 8 } }],
    [
      RuleNeighborsInRegion,
      { isActive: true, weight: 0.25, record: { preferredNeighborCount: 4, deviation: 1.5 } }
    ],
    [RuleNearMapCenter, { isActive: false, weight: 0.05, record: {} }],
    [
      RuleAvoidOtherRegions,
      {
        isActive: true,
        weight: 1,
        record: { minDistance: 4, distanceFalloff: 8, falloffCurve: 0.2, regionType: RegionType.Landmass }
      }
    ],
    [
      RuleNearPlateBoundary,
      {
        isActive: true,
        weight: 0.75,
        record: { scaleFactor: 3, directionInfluence: 0.5 },
        internalConfig: { m_plateBoundaries: this.m_plateBoundaries }
      }
    ],
    [RulePreferLatitude, { isActive: true, weight: 0.5, record: {} }]
  ];
  m_coastalIslandRuleConfigs = [
    [
      RuleAvoidEdge,
      {
        isActive: true,
        weight: 1,
        record: {
          poleDistance: 2,
          poleDistanceFalloff: 4,
          poleFalloffCurve: 0.2,
          meridianDistance: 2,
          meridianDistanceFalloff: 10,
          meridianFalloffCurve: 0.3,
          avoidCorners: 12
        }
      }
    ],
    [RuleNearNeighbor, { isActive: true, weight: 0.5, record: {} }],
    [
      RuleAvoidOtherRegions,
      {
        nameOverride: "Avoid Other Landmass",
        key: "avoidOther",
        isActive: true,
        weight: 1,
        record: { minDistance: 4, distanceFalloff: 2, falloffCurve: 0.25, regionType: RegionType.Landmass }
      }
    ],
    [
      RuleAvoidOtherRegions,
      {
        nameOverride: "Avoid Own Landmass",
        key: "avoidSelf",
        isActive: true,
        weight: 1,
        record: { minDistance: 0.25, distanceFalloff: 2, falloffCurve: 0.25, regionType: RegionType.Landmass }
      }
    ],
    [
      RuleAvoidOtherRegions,
      {
        nameOverride: "Avoid Islands",
        isActive: true,
        weight: 1,
        record: { minDistance: 4, distanceFalloff: 2, falloffCurve: 0.25, regionType: RegionType.Island }
      }
    ],
    [
      RuleNearPlateBoundary,
      {
        isActive: true,
        weight: 0.75,
        record: { scaleFactor: 3, directionInfluence: 0.5 },
        internalConfig: { m_plateBoundaries: this.m_plateBoundaries }
      }
    ],
    [RuleNearRegionSeed, { isActive: true, weight: 0.3, record: { scaleFactor: 15, invert: 1 } }]
  ];
  m_islandRuleConfigs = [
    [
      RuleAvoidEdge,
      {
        isActive: true,
        weight: 1,
        record: {
          poleDistance: 2,
          poleDistanceFalloff: 8,
          poleFalloffCurve: 0.5,
          meridianDistance: 2,
          meridianDistanceFalloff: 10,
          meridianFalloffCurve: 0.3,
          avoidCorners: 12
        }
      }
    ],
    [RuleCellArea, { isActive: true, weight: 0.15, record: {} }],
    [RuleNearNeighbor, { isActive: true, weight: 0.9, record: { scaleFactor: 0.5 } }],
    [RuleNearRegionSeed, { isActive: true, weight: 0.03, record: {} }],
    [
      RuleNeighborsInRegion,
      { isActive: true, weight: 0.6, record: { preferredNeighborCount: 1.5, deviation: 0.5 } }
    ],
    [RuleNearMapCenter, { isActive: true, weight: 0.04, record: {} }],
    [
      RuleAvoidOtherRegions,
      {
        isActive: true,
        weight: 1,
        record: { minDistance: 4, distanceFalloff: 4, falloffCurve: 0.15, regionType: RegionType.Landmass }
      }
    ],
    [
      RuleNearPlateBoundary,
      {
        isActive: true,
        weight: 0.75,
        record: { scaleFactor: 2, directionInfluence: 0.8 },
        internalConfig: { m_plateBoundaries: this.m_plateBoundaries }
      }
    ]
  ];
  m_mountainRuleConfigs = [
    [RuleCellArea, { isActive: true, weight: 0.3, record: { invert: true } }],
    [RuleNearNeighbor, { isActive: false, weight: 0.25, record: {} }],
    [RuleNeighborsInRegion, { isActive: true, weight: 0.6, record: { preferredNeighborCount: 6, deviation: 4 } }],
    [
      RuleNearPlateBoundary,
      {
        isActive: true,
        weight: 0.75,
        record: { scaleFactor: 1, directionInfluence: 0.4 },
        internalConfig: { m_plateBoundaries: this.m_plateBoundaries }
      }
    ]
  ];
  m_volcanoRuleConfigs = [
    [RuleCellArea, { isActive: true, weight: 0.3, record: { invert: true } }],
    [RuleNeighborsInRegion, { isActive: true, weight: 0.9, record: { preferredNeighborCount: 0, deviation: 1 } }]
  ];
  m_plateRules = [];
  m_landmassRules = [];
  m_coastalIslandRules = [];
  m_islandRules = [];
  m_mountainRules = [];
  m_volcanoRules = [];
  static plateDistributionDescription = "The distribution of sizes of plates is controlled by 'Plate Curve Power' and 'Plate Linear Strength'. This helps the world have a mix of plate sizes. The calculation is a lerp between y=x^(Plate Curve Power) and y=x (linear) based on 'Linear Strength'. A 'Linear Strength' of 1 will mean all the plates are about the same size, less than that and the distribution becomes more curved. 'Plate Curve Power' affects the steepness of the curve";
  m_generatorSettingsSchema = [
    {
      groupLabel: "Plates",
      key: "plate",
      children: {
        type: "configs",
        data: [
          {
            key: "factor",
            label: "Plate Factor",
            description: "Number of tectonic plates to spawn per 100 tiles.",
            min: 0,
            max: 2,
            default: 0.38,
            step: 0.01
          },
          {
            key: "curvePower",
            label: "Plate Curve Power",
            description: ContinentGenerator.plateDistributionDescription,
            min: 1,
            max: 50,
            default: 4,
            step: 1
          },
          {
            key: "linearStrength",
            label: "Plate Linear Strength",
            description: ContinentGenerator.plateDistributionDescription,
            min: 0,
            max: 1,
            default: 0.6,
            step: 0.01
          },
          {
            key: "useUniqueVoronoi",
            label: "Use Unique Voronoi",
            description: "Causes the plate generation to create it's own unique voronoi diagram instead of using the same one as the rest of the map. This allows using fewer cells for plates, leading to more blobby shapes and higher performance.",
            min: 0,
            max: 1,
            default: 1,
            step: 1
          },
          {
            key: "voronoiCellRatio",
            label: "Cell Count Multiple²",
            description: "When 'Use Unique Voronoi' is on, this affects the ratio of plate voronoi cells relative to the rest of the map, squared.",
            min: 1e-3,
            max: 1,
            default: 0.25,
            step: 1e-3
          },
          {
            key: "plateRotationMultiple",
            label: "Plate Rotation Multiple",
            description: "A scalar for plate rotation. This is useful since larger plates on big maps will move more around the edges of the plate than smaller ones for the same rotation value.",
            min: 0,
            max: 10,
            default: 1,
            step: 0.1
          }
        ]
      }
    },
    {
      groupLabel: "Landmass",
      key: "landmass",
      childCount: 2,
      children: {
        type: "configs",
        data: [
          {
            key: "enabled",
            label: "Enabled",
            description: "Controls if this landmass is created. Useful for quickly turning on and off a landmass without removing its settings entirely.",
            min: 0,
            max: 1,
            default: 1,
            step: 1
          },
          {
            key: "size",
            label: "Size %",
            description: "The size of the landmass as a percentage of total map area.",
            min: 5,
            max: 40,
            default: 17,
            step: 0.1
          },
          {
            key: "variance",
            label: "Variance +/- %",
            description: "The random variance (plus or minus) percentage of the total size.",
            min: 0,
            max: 10,
            default: 1,
            step: 0.01
          },
          {
            key: "spawnCenterDistance",
            label: "Spawn Distance From Center",
            description: "The distance from center with 0 being center and 1 being the edge of a circle squished into the map dimensions",
            min: 0.25,
            max: 0.75,
            default: 0.5,
            step: 0.01
          },
          {
            key: "erosionPercent",
            label: "Erosion Percent",
            description: "The percent of cells in this region to erode.",
            min: 0,
            max: 25,
            step: 0.1,
            default: 8
          },
          {
            key: "playerAreas",
            label: "Player Areas",
            description: "The number of player areas to spawn on this landmass.",
            min: 0,
            max: 20,
            default: 4
          },
          {
            key: "coastalIslands",
            label: "Coastal Islands",
            description: "The number of spawn locations for coastal islands. These are cells just off the coast of landmasses, not too close to other landmasses or islands, which are used to add land to the landmass they spawn near. They follow their own grow rules.",
            min: 0,
            max: 20,
            default: 8
          },
          {
            key: "coastalIslandsMinDistance",
            label: "Coastal Islands Min Distance",
            description: "The minimum distance from the landmass for coastal islands to spawn",
            min: 1,
            max: 4,
            default: 2,
            step: 0.1
          },
          {
            key: "coastalIslandsMaxDistance",
            label: "Coastal Islands max Distance",
            description: "The maximum distance from the landmass for coastal islands to spawn",
            min: 1,
            max: 4,
            default: 3,
            step: 0.1
          },
          {
            key: "coastalIslandsSize",
            label: "Coastal Islands Size %",
            description: "The total amount of land area to create as coastal islands around this landmass as a percent of map size.",
            min: 0,
            max: 5,
            default: 1,
            step: 0.01
          },
          {
            key: "coastalIslandsSizeVariance",
            label: "Coastal Islands Size Variance %",
            description: "The random variance (plus or minus) percentage of the total coastal island size.",
            min: 0,
            max: 5,
            default: 0.5,
            step: 0.01
          }
        ]
      }
    },
    {
      groupLabel: "Islands",
      key: "island",
      children: {
        type: "configs",
        data: [
          {
            key: "factor",
            label: "Factor",
            description: "The number of distant land islands to spawn per 100 tiles.",
            min: 0,
            max: 2,
            default: 0.3,
            step: 0.01
          },
          {
            key: "minSize",
            label: "Minimum Size %",
            description: "The minimum size of -each- island as a percentage of total map size.",
            min: 0,
            max: 4,
            default: 0.33,
            step: 0.01
          },
          {
            key: "maxSize",
            label: "Maximum Size %",
            description: "The maximum size of -each- island as a percentage of total map size.",
            min: 0,
            max: 4,
            default: 2,
            step: 0.01
          },
          {
            key: "totalSize",
            label: "Size %",
            description: "The total size of all islands combined as a percentage of total map size.",
            min: 0,
            max: 10,
            default: 4,
            step: 0.01
          },
          {
            key: "variance",
            label: "Variance +/- %",
            description: "The random plus or minus variance in the total size of all islands as a percentage of total map size.",
            min: 0,
            max: 2,
            default: 0.2,
            step: 0.01
          },
          {
            key: "poleDistance",
            label: "Pole Distance Hexes",
            description: "The minimum distance from the poles that distant land islands can spawn.",
            min: 0,
            max: 10,
            default: 5
          },
          {
            key: "meridianDistance",
            label: "Meridian Distance Hexes",
            description: "The minimum distance from the meridian that distant land islands can spawn.",
            min: 0,
            max: 10,
            default: 5
          },
          {
            key: "landmassDistance",
            label: "Min Landmass Distance Hexes",
            description: "The minimum distance from the major landmasses that distant land islands can spawn.",
            min: 0,
            max: 15,
            default: 4
          },
          {
            key: "islandDistance",
            label: "Min Island Distance Hexes",
            description: "The minimum distance from other islands that distant land islands can spawn.",
            min: 0,
            max: 15,
            default: 3
          },
          {
            key: "erosionPercent",
            label: "Erosion Percent",
            description: "The percent of cells on any given distant land island to erode.",
            min: 0,
            max: 50,
            default: 20
          }
        ]
      }
    },
    {
      groupLabel: "Mountains",
      key: "mountain",
      children: {
        type: "configs",
        data: [
          {
            key: "percent",
            label: "Percent of Land",
            description: "The percentage of all land that should be mountainous",
            min: 0,
            max: 50,
            default: 8,
            step: 0.1
          },
          {
            key: "variance",
            label: "Variance Percent",
            description: "The random +/- percent to the total area covered by mountains",
            min: 0,
            max: 10,
            default: 2,
            step: 0.1
          },
          {
            key: "randomize",
            label: "Randomize",
            description: "The randomization applied to mountain scores",
            min: 0,
            max: 100,
            default: 2,
            step: 1
          }
        ]
      }
    },
    {
      groupLabel: "Volcanos",
      key: "volcano",
      children: {
        type: "configs",
        data: [
          {
            key: "percent",
            label: "Percent of Mountains",
            description: "The percentage of all mountains that should be volcanos",
            min: 0,
            max: 50,
            default: 15,
            step: 0.1
          },
          {
            key: "variance",
            label: "Variance Percent",
            description: "The random +/- percent to the total number of mountains that are volcanos",
            min: 0,
            max: 10,
            default: 5,
            step: 0.1
          },
          {
            key: "randomize",
            label: "Randomize",
            description: "The randomization applied to volcano scores",
            min: 0,
            max: 100,
            default: 10,
            step: 1
          }
        ]
      }
    }
  ];
  // Overrides for specific map sizes
  m_mapSizeSettings = {
    [MapSize.Tiny]: {},
    [MapSize.Small]: {},
    [MapSize.Standard]: {},
    [MapSize.Large]: {},
    [MapSize.Huge]: {}
  };
  constructor() {
    super();
    this.initializeRules();
    this.buildDefaultSettings(this.m_generatorSettingsSchema, this.m_mapSizeSettings);
  }
  initializeRules() {
    const initializeRuleGroup = (rules, config) => {
      rules.length = 0;
      for (const [ruleClass, ruleSetting] of config) {
        const rule = new ruleClass();
        rule.initialize(ruleSetting);
        rules.push(rule);
      }
    };
    initializeRuleGroup(this.m_plateRules, this.m_plateRuleConfigs);
    initializeRuleGroup(this.m_landmassRules, this.m_landmassRuleConfigs);
    initializeRuleGroup(this.m_coastalIslandRules, this.m_coastalIslandRuleConfigs);
    initializeRuleGroup(this.m_islandRules, this.m_islandRuleConfigs);
    initializeRuleGroup(this.m_mountainRules, this.m_mountainRuleConfigs);
    initializeRuleGroup(this.m_volcanoRules, this.m_volcanoRuleConfigs);
    const volcanoNeighborRule = this.m_volcanoRules.find(
      (rule) => rule.name === RuleNeighborsInRegion.getName()
    );
    volcanoNeighborRule.inRegionCheck = (_ctx, thisCell, neighborCell) => {
      return thisCell.terrainType === neighborCell.terrainType;
    };
  }
  resetToDefault() {
    super.resetToDefault();
    this.initializeRules();
  }
  getType() {
    return GeneratorType.Continent;
  }
  getGeneratorSettingsConfig() {
    return this.m_generatorSettingsSchema;
  }
  getTypedSettings() {
    return this.getSettings();
  }
  getRules() {
    return {
      Plates: this.m_plateRules,
      Landmasses: this.m_landmassRules,
      "Coastal Islands": this.m_coastalIslandRules,
      Islands: this.m_islandRules,
      Mountains: this.m_mountainRules,
      Volcanoes: this.m_volcanoRules
    };
  }
  simulate() {
    for (const regionCell of this.m_regionCells) {
      regionCell.reset();
    }
    VoronoiUtils.performanceMarker("Grow Plates");
    this.growPlates();
    VoronoiUtils.performanceMarker("Grow Landmasses");
    this.growLandmasses();
    VoronoiUtils.performanceMarker("Grow Islands");
    this.growIslands();
    VoronoiUtils.performanceMarker("Grow Coastal Islands");
    this.growCoastalIslands();
    VoronoiUtils.performanceMarker("Force Polar Margin");
    this.forcePoles();
    VoronoiUtils.performanceMarker("Mark Land and Ocean Tiles");
    this.markLandAndOcean();
    VoronoiUtils.performanceMarker("Remove Lakes");
    this.removeLakes();
    VoronoiUtils.performanceMarker("Add Coasts & Costal Erosion");
    this.addCoasts();
    VoronoiUtils.performanceMarker("Add Mountains & Volcanos");
    this.addMountains();
  }
  choosePlateToGrow(power, linearStrength, plateCount) {
    const x = RandomImpl.fRand("Plate Growth");
    const curve = plateCount * Math.pow(x, power);
    const linear = plateCount * x;
    return Math.floor(VoronoiUtils.lerp(curve, linear, linearStrength));
  }
  growPlates() {
    const area = this.m_worldDims.x * this.m_worldDims.y;
    const plateCount = Math.round(this.getTypedSettings().plate.factor * 0.01 * area) + 1;
    const power = this.getTypedSettings().plate.curvePower;
    const linearStrength = this.getTypedSettings().plate.linearStrength;
    const useUniqueDiagram = this.getTypedSettings().plate.useUniqueVoronoi;
    let voronoiCellRatio = this.getTypedSettings().plate.voronoiCellRatio;
    voronoiCellRatio *= voronoiCellRatio;
    const plateRotationMultiple = this.getTypedSettings().plate.plateRotationMultiple;
    const bbox = { xl: 0, xr: this.m_worldDims.x, yt: 0, yb: this.m_worldDims.y };
    const sites = VoronoiUtils.createRandomSites(plateCount, bbox.xr, bbox.yb);
    const diagram = VoronoiUtils.computeVoronoi(sites, bbox, 5);
    let plateDiagramCells = this.m_regionCells;
    let cellKdTree = this.m_kdTree;
    if (useUniqueDiagram) {
      const cellCount = Math.floor(
        MapDims[this.m_mapSize].x * MapDims[this.m_mapSize].y * voronoiCellRatio
      );
      const sites2 = VoronoiUtils.createRandomSites(cellCount, bbox.xr, bbox.yb);
      this.m_platesDiagram = VoronoiUtils.computeVoronoi(sites2, bbox, 2);
      plateDiagramCells = this.m_platesDiagram.cells.map((cell, index) => {
        const area2 = VoronoiUtils.calculateCellArea(cell);
        const regionCell = new RegionCell(cell, index, area2);
        return regionCell;
      });
      cellKdTree = new kdTree(RegionCellPosGetter);
      cellKdTree.build(plateDiagramCells);
    } else {
      this.m_platesDiagram = void 0;
    }
    this.m_plateRegions = diagram.cells.map((cell, index) => {
      const region = new PlateRegion("Plate" + index, index, 0, bbox.xr * bbox.yb, {
        x: RandomImpl.fRand("Plate Color R"),
        y: RandomImpl.fRand("Plate Color G"),
        z: RandomImpl.fRand("Plate Color B")
      });
      region.seedLocation = { x: cell.site.x, y: cell.site.y };
      const regionCell = cellKdTree.search(region.seedLocation);
      region.considerationList.push({ id: regionCell.id, score: 1 });
      return region;
    });
    for (const region of this.m_plateRegions) {
      region.prepareGrowth(
        plateDiagramCells,
        this.m_plateRegions,
        this.m_plateRules,
        this.m_worldDims,
        this.m_plateRegions
      );
      region.growStep();
    }
    const regionFull = new Array(plateCount).fill(false);
    let growingCount = plateCount;
    while (growingCount > 0) {
      let plateToGrow = this.choosePlateToGrow(power, linearStrength, plateCount);
      if (regionFull[plateToGrow]) {
        plateToGrow = 0;
        while (regionFull[plateToGrow]) {
          ++plateToGrow;
        }
      }
      const canGrow = this.m_plateRegions[plateToGrow].growStep();
      if (!canGrow) {
        regionFull[plateToGrow] = true;
        --growingCount;
      }
    }
    if (useUniqueDiagram) {
      for (const regionCell of this.m_regionCells) {
        const plateCell = cellKdTree.search(regionCell.cell.site);
        regionCell.plateId = plateCell?.plateId;
      }
    }
    for (const plateRegion of this.m_plateRegions) {
      plateRegion.logStats();
    }
    const plateBoundaries = [];
    for (const plateCell of plateDiagramCells) {
      plateCell.ruleConsideration = true;
      for (const neighborId of plateCell.cell.getNeighborIds()) {
        const neighbor = plateDiagramCells[neighborId];
        if (neighbor.plateId !== plateCell.plateId && !neighbor.ruleConsideration) {
          const pos = {
            x: (plateCell.cell.site.x + neighbor.cell.site.x) * 0.5,
            y: (plateCell.cell.site.y + neighbor.cell.site.y) * 0.5
          };
          const normal = VoronoiUtils.normalize({
            x: neighbor.cell.site.x - plateCell.cell.site.x,
            y: neighbor.cell.site.y - plateCell.cell.site.y
          });
          const calculateMovement = (plate, pos2) => {
            const relPos = sub2(pos2, plate.seedLocation);
            const angularMovement = plate.m_rotation * Math.PI / 180 * plateRotationMultiple;
            const rotatedPos = rotate2(relPos, angularMovement);
            const rotationMovement = sub2(relPos, rotatedPos);
            const movement = add2(rotationMovement, plate.m_movement);
            return movement;
          };
          const plate1Movement = calculateMovement(this.m_plateRegions[plateCell.plateId], pos);
          const plate2Movement = calculateMovement(this.m_plateRegions[neighbor.plateId], pos);
          const subduction = dot2(normal, plate1Movement) - dot2(normal, plate2Movement);
          const sliding = Math.abs(dot2_90(normal, plate1Movement) - dot2_90(normal, plate2Movement));
          plateBoundaries.push({
            pos,
            normal,
            plateSubduction: subduction,
            plateSliding: sliding,
            id1: plateCell.plateId,
            id2: neighbor.plateId
          });
        }
      }
    }
    this.m_plateBoundaries.build(plateBoundaries);
  }
  growLandmasses() {
    this.m_landmassRegions = this.getLandmassRegions();
    for (const region of this.m_landmassRegions) {
      region.considerationList = [];
    }
    for (let i = 1; i < this.m_landmassRegions.length; i++) {
      const cell = this.m_kdTree.search(this.m_landmassRegions[i].seedLocation);
      this.m_landmassRegions[i].considerationList.push({ id: cell.id, score: 1 });
    }
    const growingRegions = this.m_landmassRegions.slice(1);
    const quadRegion = new Aabb2({ x: 0, y: 0 }, this.m_worldDims);
    const quadTree = new QuadTree(
      quadRegion,
      (item) => item.cell.site
    );
    for (const region of growingRegions) {
      region.prepareGrowth(
        this.m_regionCells,
        this.m_landmassRegions,
        this.m_landmassRules,
        this.m_worldDims,
        this.m_plateRegions
      );
      region.SetQuadTree(quadTree);
    }
    for (const rule of this.m_landmassRules) {
      if (rule.name == RuleAvoidOtherRegions.getName()) {
        rule.setQuadTree(quadTree);
      }
    }
    let regionIndex = 0;
    while (growingRegions.length > 0) {
      if (!growingRegions[regionIndex].growStep()) {
        growingRegions.splice(regionIndex, 1);
      } else {
        regionIndex++;
      }
      regionIndex %= growingRegions.length;
    }
    for (const region of this.m_landmassRegions.slice(1)) {
      region.logStats();
    }
  }
  growIslands() {
    const area = this.getUsableArea();
    const islandSettings = this.getTypedSettings().island;
    let islandMinSize = islandSettings.minSize;
    let islandMaxSize = islandSettings.maxSize;
    const islandCount = Math.round(islandSettings.factor * area * 0.01);
    const randsForIndices = Array.from({ length: islandCount }, () => RandomImpl.fRand("Island Index"));
    if (islandMinSize > islandMaxSize) {
      console.log("Error: Island min size is larger than max size. Capping min size to the max size");
      islandMinSize = islandMaxSize;
    }
    if (islandMinSize * islandCount > islandSettings.totalSize - islandSettings.variance) {
      console.log("Error: Island min size is too large. Capping value to total size / the number of islands.");
      islandMinSize = (islandSettings.totalSize - islandSettings.variance) / islandCount;
    }
    if (islandMaxSize * islandCount < islandSettings.totalSize + islandSettings.variance) {
      console.log("Error: Island max size is too small. Capping value to total size / the number of islands.");
      islandMaxSize = (islandSettings.totalSize + islandSettings.variance) / islandCount;
    }
    const finalTotalSize = islandSettings.totalSize + RandomImpl.fRand("Island Size Variance") * islandSettings.variance * 2 - islandSettings.variance;
    const maxMinDifference = islandMaxSize - islandMinSize;
    let randomSizeRemaining = finalTotalSize - islandMinSize * islandCount;
    const islandSizes = Array.from({ length: islandCount }, () => islandMinSize);
    for (let i = 0; i < islandSizes.length - 1; ++i) {
      const maxAdded = Math.min(maxMinDifference, randomSizeRemaining);
      const averageRandomSize = randomSizeRemaining / islandCount;
      const randomPower = Math.log(averageRandomSize / maxAdded) / Math.log(0.5);
      const randomSize = Math.pow(RandomImpl.fRand("Island Random Size"), randomPower) * maxAdded;
      randomSizeRemaining -= randomSize;
      islandSizes[i] += randomSize;
    }
    islandSizes[islandSizes.length - 1] += randomSizeRemaining;
    console.log(`Creating ${islandSizes.length} islands. Sizes: ${islandSizes}`);
    const commonIslandsRegion = new LandmassRegion(
      "Islands",
      this.m_landmassRegions.length,
      RegionType.Island,
      0,
      0,
      { x: 0.7, y: 0.7, z: 0.2 }
    );
    this.m_landmassRegions.push(commonIslandsRegion);
    const landmassesKdTree = new kdTree((data) => {
      return { x: data.cell.site.x, y: data.cell.site.y };
    });
    landmassesKdTree.build(
      this.m_regionCells.filter(
        (value) => this.m_landmassRegions[value.landmassId].type === RegionType.Landmass
      )
    );
    for (let i = 0; i < islandCount; ++i) {
      const islandKdTree = new kdTree((data) => {
        return { x: data.cell.site.x, y: data.cell.site.y };
      });
      islandKdTree.build(
        this.m_regionCells.filter(
          (value) => this.m_landmassRegions[value.landmassId].type === RegionType.Island
        )
      );
      const scoreCtx = {
        cells: this.m_regionCells,
        region: commonIslandsRegion,
        regions: this.m_landmassRegions,
        plateRegions: this.m_plateRegions,
        m_worldDims: this.m_worldDims,
        totalArea: 0,
        cellCount: 0,
        rules: this.m_islandRules
      };
      const islandSeedCandidates = [];
      for (const regionCell of this.m_regionCells) {
        const x = regionCell.cell.site.x;
        const y = regionCell.cell.site.y;
        if (x < islandSettings.meridianDistance || x > this.m_worldDims.x - islandSettings.meridianDistance || y < islandSettings.poleDistance || y > this.m_worldDims.y - islandSettings.poleDistance || regionCell.landmassId > 0)
          continue;
        const nearestLandmassCell = landmassesKdTree.search({ x, y });
        const nearestIslandCell = islandKdTree.search({ x, y });
        const distanceToLandmass = VoronoiUtils.distanceBetweenSites(
          regionCell.cell.site,
          nearestLandmassCell.cell.site
        );
        const distanceToIsland = nearestIslandCell ? VoronoiUtils.distanceBetweenSites(regionCell.cell.site, nearestIslandCell.cell.site) : 1e3;
        const nearestPlate = this.m_plateBoundaries.search(regionCell.cell.site).pos;
        const distanceToNearestPlate = Math.sqrt(
          VoronoiUtils.sqDistance(nearestPlate, regionCell.cell.site)
        );
        if (distanceToLandmass > islandSettings.landmassDistance && distanceToIsland > islandSettings.islandDistance) {
          let score = 0;
          for (const rule of this.m_islandRules) {
            if (rule.isActive) {
              score += rule.score(regionCell, scoreCtx);
            }
          }
          score *= distanceToIsland;
          islandSeedCandidates.push([score, regionCell]);
        }
      }
      if (islandSeedCandidates.length == 0) {
        console.log("Failed to find any candidate locations for island.");
        break;
      }
      islandSeedCandidates.sort((a, b) => a[0] - b[0]);
      const randomIndex = Math.floor(
        VoronoiUtils.lerp(islandSeedCandidates.length * 0.9, islandSeedCandidates.length, randsForIndices[i])
      );
      const finalIslandSize = islandSizes[i] * 0.01 * area;
      const islandRegion = new LandmassRegion(
        "Island" + String(i),
        this.m_landmassRegions.length,
        RegionType.Island,
        finalIslandSize,
        0,
        { x: 0.7, y: 0.7, z: 0.2 }
      );
      islandRegion.seedLocation = islandSeedCandidates[randomIndex][1].cell.site;
      this.m_landmassRegions.push(islandRegion);
      islandRegion.prepareGrowth(
        this.m_regionCells,
        this.m_landmassRegions,
        this.m_islandRules,
        this.m_worldDims,
        this.m_plateRegions
      );
      islandRegion.considerationList.push({ id: islandSeedCandidates[randomIndex][1].id, score: 1 });
      while (islandRegion.growStep()) {
        continue;
      }
      islandRegion.logStats();
      this.m_landmassRegions.pop();
      this.m_regionCells.forEach((value) => {
        if (value.landmassId === islandRegion.id) {
          value.landmassId = commonIslandsRegion.id;
        }
      });
    }
  }
  growCoastalIslands() {
    const oceanCells = this.m_regionCells.filter((cell) => cell.landmassId === 0);
    for (let i = 1; i < this.m_landmassRegions.length; ++i) {
      const landmassRegion = this.m_landmassRegions[i];
      if (landmassRegion.type !== RegionType.Landmass) {
        continue;
      }
      const landmassSettings = this.getTypedSettings().landmass[i - 1];
      const coastalIslandSpawnCount = landmassSettings.coastalIslands;
      if (coastalIslandSpawnCount === 0) {
        continue;
      }
      const minLandmassRange = landmassSettings.coastalIslandsMinDistance;
      const maxLandmassRange = landmassSettings.coastalIslandsMaxDistance;
      const nearCoastCells = oceanCells.filter((cell) => {
        let nearRegion = false;
        const filterCallback = (considerCell) => {
          if (considerCell.landmassId === landmassRegion.id) {
            if (VoronoiUtils.distanceBetweenSites(cell.cell.site, considerCell.cell.site) > minLandmassRange) {
              nearRegion = true;
            } else {
              return VoronoiUtils.RegionCellFilterResult.HaltFail;
            }
          } else if (considerCell.landmassId > 0) {
            return VoronoiUtils.RegionCellFilterResult.HaltFail;
          }
          return VoronoiUtils.RegionCellFilterResult.Continue;
        };
        const filterResult = VoronoiUtils.regionCellAreaFilter(
          cell,
          this.m_regionCells,
          maxLandmassRange,
          filterCallback
        );
        return filterResult === VoronoiUtils.RegionCellFilterResult.Continue ? nearRegion : false;
      });
      console.log(
        "Checking " + nearCoastCells.length + " cells near landmass " + landmassRegion.id + " for coastal island spots"
      );
      const minOtherLandmassRange = 4;
      const islandSpawnList = nearCoastCells.filter((cell) => {
        const filterCallback = (considerCell) => {
          if (considerCell.landmassId != 0 && considerCell.landmassId != landmassRegion.id) {
            return VoronoiUtils.RegionCellFilterResult.HaltFail;
          }
          return VoronoiUtils.RegionCellFilterResult.Continue;
        };
        const filterResult = VoronoiUtils.regionCellAreaFilter(
          cell,
          this.m_regionCells,
          minOtherLandmassRange,
          filterCallback
        );
        return filterResult === VoronoiUtils.RegionCellFilterResult.Continue;
      });
      for (const rule of this.m_coastalIslandRules) {
        if (rule instanceof RuleAvoidOtherRegions) {
          const avoidOtherRegionsRule = rule;
          if (avoidOtherRegionsRule.key === "avoidSelf") {
            avoidOtherRegionsRule.configValues.regionId = landmassRegion.id;
            console.log("setting islands for landmass " + landmassRegion.id + " to slightly avoid self");
          } else if (avoidOtherRegionsRule.key === "avoidOther") {
            avoidOtherRegionsRule.configValues.regionId = landmassRegion.id === 1 ? 2 : 1;
            console.log(
              "setting islands for landmass " + landmassRegion.id + " to strongly avoid " + avoidOtherRegionsRule.configValues.regionId
            );
          }
        }
      }
      const area = this.getUsableArea();
      const coastalIslandSize = landmassSettings.coastalIslandsSize;
      let coastalIslandSizeVariance = landmassSettings.coastalIslandsSizeVariance;
      coastalIslandSizeVariance *= RandomImpl.fRand("Coastal Island Size Variance") * 2 - 1;
      const finalIslandSize = (coastalIslandSize + coastalIslandSizeVariance) * 0.01 * area;
      const coastalIslandRegion = new LandmassRegion(
        "CoastalIsland",
        this.m_landmassRegions.length,
        RegionType.CoastalIsland,
        finalIslandSize,
        0,
        { x: 0.4, y: 0.7, z: 0.2 }
      );
      coastalIslandRegion.seedLocation = landmassRegion.seedLocation;
      coastalIslandRegion.prepareGrowth(
        this.m_regionCells,
        this.m_landmassRegions,
        this.m_coastalIslandRules,
        this.m_worldDims,
        this.m_plateRegions
      );
      console.log("Found " + islandSpawnList.length + " cells for coastal island spots");
      let scoredIslandSpawnList = [];
      for (const cell of islandSpawnList) {
        scoredIslandSpawnList.push({ cell, score: coastalIslandRegion.scoreSingleCell(cell) });
      }
      scoredIslandSpawnList.sort((a, b) => b.score - a.score);
      scoredIslandSpawnList = scoredIslandSpawnList.slice(
        0,
        Math.max(coastalIslandSpawnCount, scoredIslandSpawnList.length * 0.25)
      );
      VoronoiUtils.shuffle(scoredIslandSpawnList, coastalIslandSpawnCount);
      scoredIslandSpawnList = scoredIslandSpawnList.slice(0, coastalIslandSpawnCount);
      scoredIslandSpawnList.forEach((tuple) => {
        coastalIslandRegion.considerationList.push({ id: tuple.cell.id, score: 100 });
      });
      while (coastalIslandRegion.growStep()) {
        continue;
      }
      this.m_regionCells.forEach((cell) => {
        if (cell.landmassId == coastalIslandRegion.id) {
          cell.landmassId = landmassRegion.id;
        }
      });
    }
  }
  forcePoles() {
    for (const cell of this.m_regionCells) {
      const minDist = 2;
      if (cell.cell.site.y < minDist || cell.cell.site.y > this.m_worldDims.y - minDist) {
        cell.landmassId = 0;
      }
    }
  }
  markLandAndOcean() {
    for (const cell of this.m_regionCells) {
      cell.terrainType = cell.landmassId > 0 ? TerrainType.Flat : TerrainType.Ocean;
    }
  }
  removeLakes() {
    for (let cell of this.m_regionCells) {
      if (cell.terrainType == TerrainType.Unknown) {
        let isInlandSea = false;
        let neighboringLandmassId = 0;
        const considerationList = [cell];
        const lakeList = [];
        cell.ruleConsideration = true;
        while (considerationList.length > 0) {
          cell = considerationList.pop();
          lakeList.push(cell);
          let neighborsLand = false;
          for (const neighborId of cell.cell.getNeighborIds()) {
            const neighbor = this.m_regionCells[neighborId];
            if (!neighbor.ruleConsideration) {
              if (neighbor.terrainType == TerrainType.Unknown) {
                neighbor.ruleConsideration = true;
                considerationList.push(neighbor);
              } else {
                neighborsLand = true;
                neighboringLandmassId = neighbor.landmassId;
              }
            }
          }
          if (!neighborsLand) {
            isInlandSea = true;
          }
        }
        if (isInlandSea) {
          lakeList.forEach((cell2) => {
            cell2.ruleConsideration = false;
            cell2.terrainType = TerrainType.Ocean;
          });
        } else {
          lakeList.forEach((cell2) => {
            cell2.ruleConsideration = false;
            cell2.terrainType = TerrainType.Flat;
            cell2.landmassId = neighboringLandmassId;
          });
        }
      }
    }
  }
  addCoasts() {
    for (const region of this.m_landmassRegions) {
      if (region.id === 0) continue;
      const coastalCells = [];
      const regionCells = this.m_regionCells.filter((cell) => cell.landmassId === region.id);
      for (const regionCell of regionCells) {
        for (const neighborId of regionCell.cell.getNeighborIds()) {
          let onCoast = false;
          if (this.m_regionCells[neighborId].terrainType == TerrainType.Ocean) {
            onCoast = true;
            this.m_regionCells[neighborId].terrainType = TerrainType.Coast;
            this.m_regionCells[neighborId].landmassId = regionCell.landmassId;
          }
          if (onCoast) {
            coastalCells.push(regionCell);
          }
        }
      }
      const erosionPercent = 0.01 * (region.type === RegionType.Landmass ? this.getTypedSettings().landmass[region.id - 1].erosionPercent : this.getTypedSettings().island.erosionPercent);
      let erosionCount = 0;
      const cellsInRegion = regionCells.length;
      const cellsToErode = erosionPercent * cellsInRegion;
      VoronoiUtils.shuffle(coastalCells);
      for (let i = 0; i < coastalCells.length; ++i) {
        const cell = coastalCells[i];
        if (i < cellsToErode) {
          const neighbors = cell.cell.getNeighborIds();
          for (const neighborId of neighbors) {
            const neighbor = this.m_regionCells[neighborId];
            if (neighbor.landmassId == region.id) {
              neighbor.terrainType = TerrainType.Coast;
              neighbor.landmassId = cell.landmassId;
              ++erosionCount;
              break;
            }
          }
        }
      }
      console.log(
        "Eroded " + erosionCount + " cells on landmass " + region.id + " from a total of " + region.considerationList.length + " coasts on a landmass with " + cellsInRegion + " cells."
      );
    }
  }
  addMountains() {
    const scoreCtx = {
      cells: this.m_regionCells,
      region: this.m_landmassRegions[1],
      regions: this.m_landmassRegions,
      plateRegions: this.m_plateRegions,
      m_worldDims: this.m_worldDims,
      totalArea: 0,
      cellCount: 0,
      rules: this.m_mountainRules
    };
    for (const rule of this.m_mountainRules) {
      if (rule.isActive) {
        rule.scoreAllCells(
          (cell) => cell.terrainType == TerrainType.Flat,
          scoreCtx,
          (cell) => this.m_landmassRegions[cell.landmassId],
          rule.weight
        );
      }
    }
    const mountainSettings = this.getTypedSettings().mountain;
    const scoredCells = this.m_regionCells.filter((cell) => cell.currentScore > 0);
    scoredCells.sort((a, b) => b.currentScore - a.currentScore);
    const mountainVariance = (RandomImpl.fRand("Mountain Variance") * 2 - 1) * mountainSettings.variance;
    const percentMountains = (mountainSettings.percent + mountainVariance) * 0.01;
    const totalMountains = Math.round(scoredCells.length * percentMountains);
    const totalMountainsToConsider = totalMountains + mountainSettings.randomize * 0.01 * (scoredCells.length - totalMountains);
    let mountainCells = scoredCells.slice(0, totalMountainsToConsider);
    VoronoiUtils.shuffle(mountainCells, totalMountains);
    mountainCells = mountainCells.slice(0, totalMountains);
    mountainCells.forEach((cell) => {
      cell.terrainType = TerrainType.Mountainous;
      cell.currentScore = 0;
    });
    scoreCtx.rules = this.m_volcanoRules;
    for (const rule of this.m_volcanoRules) {
      if (rule.isActive) {
        rule.scoreCells(
          mountainCells,
          scoreCtx,
          (cell) => this.m_landmassRegions[cell.landmassId],
          rule.weight
        );
      }
    }
    const volcanoSettings = this.getTypedSettings().volcano;
    const scoredVolcanoCells = mountainCells.filter((cell) => cell.currentScore > 0);
    scoredVolcanoCells.sort((a, b) => b.currentScore - a.currentScore);
    const volcanoVariance = (RandomImpl.fRand("Volcano Variance") * 2 - 1) * volcanoSettings.variance;
    const percentVolcanos = (volcanoSettings.percent + volcanoVariance) * 0.01;
    const totalVolcanos = Math.round(mountainCells.length * percentVolcanos);
    const totalVolcanosToConsider = totalVolcanos + volcanoSettings.randomize * 0.01 * (scoredVolcanoCells.length - totalVolcanos);
    let volcanoCells = scoredVolcanoCells.slice(0, totalVolcanosToConsider);
    VoronoiUtils.shuffle(volcanoCells, totalVolcanos);
    volcanoCells = volcanoCells.slice(0, totalVolcanos);
    volcanoCells.forEach((cell) => {
      cell.terrainType = TerrainType.Volcano;
    });
    this.m_regionCells.forEach((cell) => cell.currentScore = 0);
  }
  getLandmassRegions() {
    const regions = [
      new LandmassRegion("ocean", 0, RegionType.Ocean, 0, 0, { x: 0.2, y: 0.2, z: 0.8 })
    ];
    const area = this.getUsableArea();
    const numLandmasses = this.getTypedSettings().landmass.length;
    const arcOffset = Math.PI * 2 / numLandmasses;
    const randSpawnOffset = arcOffset * RandomImpl.fRand("Landmass spawn offset");
    for (let i = 0; i < numLandmasses; ++i) {
      const landmassSettings = this.getTypedSettings().landmass[i];
      if (!landmassSettings.enabled) {
        continue;
      }
      const landmassSize = landmassSettings.size * 0.01 * area + landmassSettings.variance * 0.01 * area * RandomImpl.fRand("Landmass " + i + " size variance") - landmassSettings.variance * 0.5;
      const landmassPlayerAreas = landmassSettings.playerAreas;
      const spawnOffset = randSpawnOffset + arcOffset * i;
      let circleOffset = { x: Math.cos(spawnOffset), y: Math.sin(spawnOffset) };
      circleOffset = mul2s(circleOffset, landmassSettings.spawnCenterDistance);
      const landmass = new LandmassRegion(
        "landmass" + i,
        1 + i,
        RegionType.Landmass,
        landmassSize,
        landmassPlayerAreas,
        { x: 0, y: 0.8, z: 0 }
      );
      const halfMapDims = mul2s(this.m_worldDims, 0.5);
      landmass.seedLocation = add2(mul2(circleOffset, halfMapDims), halfMapDims);
      regions.push(landmass);
    }
    return regions;
  }
  getLandmasses() {
    return this.m_landmassRegions;
  }
  getPlates() {
    return this.m_plateRegions;
  }
  getPlatesDiagram() {
    return this.m_platesDiagram || this.m_diagram;
  }
  getUsableArea() {
    const meridianMargin = 2;
    const polarMargin = 2;
    const width = this.m_worldDims.x - meridianMargin * 2;
    const height = this.m_worldDims.y - polarMargin * 2;
    return width * height;
  }
}

export { ContinentGenerator };
//# sourceMappingURL=continent-generator.js.map

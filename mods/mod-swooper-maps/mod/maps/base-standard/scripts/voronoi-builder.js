import { Diagram } from '../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import { VoronoiHex } from './voronoi-hex.js';
import { MapDims, VoronoiUtils } from './voronoi-utils.js';
import { ContinentGenerator } from './voronoi_generators/continent-generator.js';
import { GeneratorType } from './voronoi_generators/map-generator.js';
import '../../core/scripts/MathHelpers.js';
import './heap.js';
import './kd-tree.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import './random-pcg-32.js';
import './quadtree.js';
import './voronoi-region.js';
import './voronoi_rules/avoid-edge.js';
import './voronoi_rules/rules-base.js';
import './voronoi_rules/avoid-other-regions.js';
import './voronoi_rules/cell-area.js';
import './voronoi_rules/near-map-center.js';
import './voronoi_rules/near-neighbor.js';
import './voronoi_rules/near-plate-boundary.js';
import './voronoi_rules/near-region-seed.js';
import './voronoi_rules/neighbors-in-region.js';
import './voronoi_rules/prefer-latitude.js';

class VoronoiBuilder {
  m_generators = {
    [GeneratorType.Continent]: ContinentGenerator
  };
  m_diagram = new Diagram();
  m_diagramDims = { x: 0, y: 0 };
  m_hexDims = { x: 0, y: 0 };
  m_generator;
  m_hexTiles = new VoronoiHex();
  m_generatorType = void 0;
  constructor() {
  }
  init(mapSize, generatorType, cellCountMultiple, relaxationSteps) {
    this.m_generatorType = generatorType;
    this.m_diagramDims = { x: MapDims[mapSize].x * Math.sqrt(3) * 0.5, y: MapDims[mapSize].y * 0.75 };
    this.m_hexDims = MapDims[mapSize];
    const totalCells = MapDims[mapSize].x * MapDims[mapSize].y * cellCountMultiple;
    console.log("Initializing voronoi-builder");
    console.log("  Diagram dims: {x:" + this.m_diagramDims.x + ", y:" + this.m_diagramDims.y + "}");
    console.log("  Hex dims {x:" + this.m_hexDims.x + ", y:" + this.m_hexDims.y + "}");
    console.log("  Total cells: " + totalCells + ", relaxed " + relaxationSteps + " times.");
    this.buildVoronoi(this.m_diagramDims.x, this.m_diagramDims.y, totalCells, relaxationSteps);
    console.log("  voronoi built...");
    const newGenerator = new this.m_generators[generatorType]();
    console.log("  generator created...");
    if (!this.m_generator || this.m_generator.constructor.name != newGenerator.constructor.name) {
      this.m_generator = newGenerator;
    }
    this.m_generator.init(this.m_diagramDims, this.m_diagram, mapSize);
    console.log("  generator initialized...");
  }
  simulate() {
    this.m_generator.simulate();
    this.m_hexTiles.init(this.m_generator, this.m_hexDims.x, this.m_hexDims.y);
    this.m_hexTiles.validate();
  }
  createMajorPlayerAreas(valueFunction) {
    const playerLandmasses = [];
    for (const landmass of this.m_generator.getLandmasses()) {
      if (landmass.playerAreas > 0) {
        playerLandmasses.push(landmass);
      }
    }
    this.m_hexTiles.createMajorPlayerAreas(playerLandmasses, valueFunction);
  }
  getDiagram() {
    return this.m_diagram;
  }
  getGenerator() {
    return this.m_generator;
  }
  getGeneratorType() {
    return this.m_generatorType;
  }
  getTiles() {
    return this.m_hexTiles.getTiles();
  }
  buildVoronoi(width, height, cellCount, relaxationSteps) {
    const bbox = { xl: 0, xr: width, yt: 0, yb: height };
    const sites = VoronoiUtils.createRandomSites(cellCount, width, height);
    this.m_diagram = VoronoiUtils.computeVoronoi(sites, bbox, relaxationSteps);
  }
}

export { VoronoiBuilder };
//# sourceMappingURL=voronoi-builder.js.map
